/**
 * Tiny in-tree MinHash + LSH building blocks for the dedup-hybrid plugin.
 *
 * Spec 003 / FR-2 (stage 2) — near-duplicate detection on long-form text.
 * Question Q-009 settled on an in-tree implementation: it keeps the package
 * zero-dep, is deterministic across CI workers, and lets us hand-tune the hot
 * loops (typed arrays, no allocations per shingle).
 *
 * Public surface:
 *  - `MinHasher`            — produces a signature (`Uint32Array`) for a text.
 *  - `lshBandKeys`          — splits a signature into B band keys for LSH.
 *  - `signatureSimilarity`  — Jaccard estimate from two signatures.
 *  - `tokenizeForShingles`  — exported for tests.
 *  - `shingleHashes`        — exported for tests.
 *
 * The internals are intentionally allocation-light:
 *  - permutation coefficients are stored in `Uint32Array` (no GC churn);
 *  - shingle hashes are 32-bit ints stored in a `Set<number>`;
 *  - signatures are `Uint32Array` — typed-array aware loops in V8 vectorise.
 */

export interface MinHasherOptions {
  /** Number of MinHash permutations (signature length). Default `128`. */
  readonly signatureSize?: number;
  /** Word-shingle size (k-grams over normalised tokens). Default `3`. */
  readonly shingleSize?: number;
  /** Deterministic seed for permutation coefficients. Default `0xCAFEBABE`. */
  readonly seed?: number;
}

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/**
 * Module-scope binding for `Math.imul` (Spec 722 / FR-1).
 *
 * Hosts that execute code inside a `vm` context (test runners included) give
 * it a *contextified* global object whose named-property loads go through a
 * C++ interceptor instead of V8's global-load inline caches. A per-call
 * `Math.imul` lookup in the signature hot loop (3 lookups × ~79 M calls on a
 * 10 K-job batch) measured at ~61 s self-time under such a host — 72.7 % of
 * the whole run. A closure-variable load is realm-independent and stays fast
 * everywhere, so hot paths below must reference `imul`, never `Math.imul`.
 */
const imul = Math.imul;

/** 32-bit FNV-1a hash of a UTF-16 code-unit stream. */
function fnv1a(s: string): number {
  let h = FNV_OFFSET;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = imul(h, FNV_PRIME);
  }
  return h >>> 0;
}

/**
 * Generate `size` deterministic (a, b) coefficient pairs from `seed`.
 * Uses an LCG-style mixer (Mulberry-32 inspired); reproducible across
 * runs and process restarts.
 */
function makeCoeffs(size: number, seed: number): { a: Uint32Array; b: Uint32Array } {
  const a = new Uint32Array(size);
  const b = new Uint32Array(size);
  let s = seed >>> 0;
  for (let i = 0; i < size; i++) {
    s = (imul(s ^ (s >>> 15), 0x9e3779b1) + 0x6d2b79f5) >>> 0;
    // OR with 1 forces an odd multiplier (full-period in mod 2^32 arithmetic).
    a[i] = (s | 1) >>> 0;
    s = (imul(s ^ (s >>> 13), 0x85ebca6b) + 0xc2b2ae35) >>> 0;
    b[i] = s >>> 0;
  }
  return { a, b };
}

/**
 * Lower-case + strip non-alphanumerics to spaces + collapse whitespace.
 * Returns the normalised tokens (empty array if the text is blank).
 *
 * We re-tokenise inside MinHash rather than reusing
 * `@ever-jobs/common/normalize` because those helpers are tuned for short
 * structured fields (title/company) and aggressively strip suffixes; for
 * long-form text we just want a generic word splitter.
 */
export function tokenizeForShingles(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const cleaned = lower.replace(/[^a-z0-9]+/g, ' ').trim();
  if (!cleaned) return [];
  return cleaned.split(/\s+/);
}

/**
 * Compute the set of k-shingle hashes for `text`. Each shingle is the
 * concatenation of `k` consecutive tokens joined by `` (Unit Separator —
 * not a character we'd ever see in input).
 *
 * Returns 32-bit unsigned integers; duplicates are de-duplicated via Set.
 */
export function shingleHashes(text: string, k: number): Set<number> {
  const tokens = tokenizeForShingles(text);
  const out = new Set<number>();
  if (tokens.length === 0) return out;
  if (tokens.length < k) {
    out.add(fnv1a(tokens.join('')));
    return out;
  }
  const window: string[] = new Array(k);
  for (let i = 0; i <= tokens.length - k; i++) {
    for (let j = 0; j < k; j++) window[j] = tokens[i + j];
    out.add(fnv1a(window.join('')));
  }
  return out;
}

/**
 * Streaming MinHasher — `signature(text)` produces a `Uint32Array` of length
 * `signatureSize`. Two signatures' element-wise equality count divided by
 * `signatureSize` is an unbiased estimator of the Jaccard similarity of the
 * underlying shingle sets.
 */
export class MinHasher {
  readonly signatureSize: number;
  readonly shingleSize: number;
  private readonly aCoeffs: Uint32Array;
  private readonly bCoeffs: Uint32Array;

  constructor(opts: MinHasherOptions = {}) {
    this.signatureSize = opts.signatureSize ?? 128;
    this.shingleSize = opts.shingleSize ?? 3;
    if (this.signatureSize <= 0) {
      throw new Error('signatureSize must be > 0');
    }
    if (this.shingleSize <= 0) {
      throw new Error('shingleSize must be > 0');
    }
    const { a, b } = makeCoeffs(this.signatureSize, opts.seed ?? 0xcafebabe);
    this.aCoeffs = a;
    this.bCoeffs = b;
  }

  /**
   * Build a MinHash signature for `text`. Returns `null` when the text yields
   * no shingles (after normalisation) — the caller should treat such inputs
   * as un-MinHashable.
   */
  signature(text: string): Uint32Array | null {
    const shingleSet = shingleHashes(text, this.shingleSize);
    if (shingleSet.size === 0) return null;

    // Materialise the Set once — the hot loop below must iterate a typed
    // array, not invoke a closure per element (Spec 722 / FR-2).
    const shingles = new Uint32Array(shingleSet.size);
    let w = 0;
    for (const s of shingleSet) shingles[w++] = s;

    const sig = new Uint32Array(this.signatureSize);
    const a = this.aCoeffs;
    const b = this.bCoeffs;
    const n = this.signatureSize;
    const m = shingles.length;

    // Hot loop, permutation-major: hoists the (a, b) pair into locals and
    // inlines the murmur-style affine + finaliser (formerly `permute()`)
    // so the innermost loop performs no function calls at all. The mixing
    // constants and fold order are unchanged — signatures stay byte-identical
    // to the pre-722 implementation (golden-tested).
    for (let i = 0; i < n; i++) {
      const ai = a[i];
      const bi = b[i];
      let min = 0xffffffff;
      for (let j = 0; j < m; j++) {
        let h = (imul(shingles[j], ai) + bi) >>> 0;
        h ^= h >>> 16;
        h = imul(h, 0x85ebca6b) >>> 0;
        h ^= h >>> 13;
        h = imul(h, 0xc2b2ae35) >>> 0;
        // The final fold must renormalise to unsigned: `^` yields a SIGNED
        // int32, and a negative h would corrupt the unsigned min-comparison.
        h = (h ^ (h >>> 16)) >>> 0;
        if (h < min) min = h;
      }
      sig[i] = min;
    }

    return sig;
  }
}

/**
 * Split `signature` into `bands` band-keys. Two signatures share a band-key
 * iff their slice for that band matches exactly. The band-keys are the LSH
 * candidate-bucket keys: any pair of jobs sharing at least one band-key
 * becomes a candidate near-duplicate pair.
 *
 * Throws if `signature.length` is not a multiple of `bands`.
 */
export function lshBandKeys(signature: Uint32Array, bands: number): string[] {
  if (bands <= 0) throw new Error('bands must be > 0');
  if (signature.length % bands !== 0) {
    throw new Error(`signatureSize (${signature.length}) must be divisible by bands (${bands})`);
  }
  const rows = signature.length / bands;
  const keys: string[] = new Array(bands);
  for (let bandIndex = 0; bandIndex < bands; bandIndex++) {
    const start = bandIndex * rows;
    let key = `${bandIndex}|`;
    for (let r = 0; r < rows; r++) {
      // Hex render of each row keeps the key compact (~8 chars per row) and
      // collision-free across band positions because we prepend the bandIndex.
      key += signature[start + r].toString(16);
      if (r !== rows - 1) key += ':';
    }
    keys[bandIndex] = key;
  }
  return keys;
}

/**
 * Jaccard estimate from two signatures. Both must have the same length.
 */
export function signatureSimilarity(a: Uint32Array, b: Uint32Array): number {
  if (a.length !== b.length) {
    throw new Error('signatures must be the same length');
  }
  if (a.length === 0) return 0;
  let same = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) same++;
  }
  return same / a.length;
}
