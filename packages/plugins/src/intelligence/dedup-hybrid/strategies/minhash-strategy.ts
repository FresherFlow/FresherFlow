import { MinHasher, lshBandKeys, signatureSimilarity } from '../minhash';
import { ClusterPartition, IDedupStrategy, PreparedJob } from '../types';
import { UnionFind } from '../union-find';

/**
 * Tuning knobs for {@link MinHashStrategy}.
 *
 * Defaults target Spec 003 / FR-7 (similarity threshold ≥ 0.85) and
 * NFR-1 / NFR-2 (1 K jobs < 250 ms, 10 K jobs < 2.5 s).
 *
 * When `bands` is omitted it is derived from `similarityThreshold` so that
 * LSH candidate recall at the configured threshold stays ≥ 0.95 (Spec 722 /
 * FR-3): for a pair with Jaccard `s`, the probability of sharing at least one
 * of B bands of R rows is `1-(1-s^R)^B`. The defaults (`signatureSize = 128`,
 * threshold `0.85`) derive `bands = 16` (`rows = 8`, recall ≈ 0.994) — the
 * same split this strategy always used. A lenient threshold such as `0.6`
 * derives wider banding (`bands = 32`, `rows = 4`) so lenient matches
 * actually surface as candidates instead of being filtered before
 * verification ever runs.
 */
export interface MinHashStrategyOptions {
  /** Number of MinHash permutations. Must be divisible by `bands`. Default `128`. */
  readonly signatureSize?: number;
  /**
   * Number of LSH bands (`rows = signatureSize / bands`). When omitted,
   * derived from `similarityThreshold` (see interface doc). An explicit
   * value always wins.
   */
  readonly bands?: number;
  /** Word-shingle size. Default `3`. */
  readonly shingleSize?: number;
  /**
   * Minimum length (chars after trim) before a job's text is considered
   * MinHashable. Below this we skip the job — short text gives noisy
   * signatures. Default `80`.
   */
  readonly minTextLength?: number;
  /**
   * Verification threshold applied to each LSH candidate pair. Pairs below
   * this signature-similarity are dropped. Default `0.85`.
   */
  readonly similarityThreshold?: number;
  /**
   * Cap on candidate pairs evaluated per LSH bucket. Protects against
   * pathological buckets (e.g. boilerplate descriptions). Default `200`.
   */
  readonly maxBucketSize?: number;
  /** Deterministic seed for permutation coefficients. Default `0xCAFEBABE`. */
  readonly seed?: number;
}

/**
 * Derive the LSH band count for a signature size and verification threshold
 * (Spec 722 / FR-3): the smallest divisor B of `signatureSize` whose
 * candidate recall `1-(1-s^R)^B` at `s = threshold` is ≥ 0.95, where
 * `R = signatureSize / B`. Fewer bands ⇒ fewer buckets and longer band keys,
 * so the smallest qualifying B is also the cheapest. Falls back to
 * `signatureSize` bands (R = 1, maximal recall) for extreme thresholds.
 *
 * Exported for tests.
 */
export function deriveBands(signatureSize: number, threshold: number): number {
  for (let bands = 1; bands <= signatureSize; bands++) {
    if (signatureSize % bands !== 0) continue;
    const rows = signatureSize / bands;
    const recall = 1 - Math.pow(1 - Math.pow(threshold, rows), bands);
    if (recall >= 0.95) return bands;
  }
  return signatureSize;
}

/** One distinct MinHashable text: its signature + the input indices sharing it. */
interface SignatureSlot {
  readonly signature: Uint32Array;
  readonly members: number[];
}

/**
 * Stage 2 — MinHash + LSH near-duplicate detection on long-form text.
 *
 * Pipeline (Spec 003 / FR-2 stage 2, reworked by Spec 722):
 *  1. Pick text per job (`description` if present, else `title + company`).
 *  2. Skip jobs whose text is too short (`minTextLength`).
 *  3. Group jobs by **identical text** into slots — one MinHash signature per
 *     distinct text (identical text ⇒ similarity 1.0 ⇒ same cluster by
 *     definition, no verification needed). (FR-5)
 *  4. Split each slot signature into LSH band-keys; group slots by band-key
 *     (any shared band ⇒ candidate pair).
 *  5. For each candidate slot pair not already connected, verify the Jaccard
 *     estimate ≥ `similarityThreshold` and union on success — connected
 *     candidates skip verification entirely, so verification work stays
 *     near-linear even on duplicate-heavy batches. (FR-6)
 *  6. Emit each connected component (expanded back to job indices) as one
 *     cluster; the service's Union-Find merges these with the Stage-1 hash
 *     clusters exactly as it merged the former 2-element pairs.
 *
 * The strategy is pure — no I/O, no global state, fully deterministic given
 * the same inputs and options: member order follows input order and component
 * order follows first-touch order (FR-7). Allocation-light: signatures are
 * typed arrays; bucket maps are cleared once the partition is materialised.
 */
export class MinHashStrategy implements IDedupStrategy {
  readonly name = 'minhash';

  private readonly hasher: MinHasher;
  private readonly bands: number;
  private readonly minTextLength: number;
  private readonly similarityThreshold: number;
  private readonly maxBucketSize: number;

  constructor(opts: MinHashStrategyOptions = {}) {
    const signatureSize = opts.signatureSize ?? 128;
    this.similarityThreshold = opts.similarityThreshold ?? 0.85;
    const bands = opts.bands ?? deriveBands(signatureSize, this.similarityThreshold);
    if (signatureSize % bands !== 0) {
      throw new Error(
        `signatureSize (${signatureSize}) must be divisible by bands (${bands})`,
      );
    }
    this.bands = bands;
    this.minTextLength = opts.minTextLength ?? 80;
    this.maxBucketSize = opts.maxBucketSize ?? 200;
    this.hasher = new MinHasher({
      signatureSize,
      shingleSize: opts.shingleSize ?? 3,
      seed: opts.seed,
    });
  }

  cluster(input: ReadonlyArray<PreparedJob>): ClusterPartition {
    if (input.length < 2) return { clusters: [] };

    // Group identical texts into slots — one signature per distinct text.
    const slotByText = new Map<string, number>();
    const slots: SignatureSlot[] = [];
    for (let i = 0; i < input.length; i++) {
      const job = input[i];
      const text = pickText(job);
      if (text.length < this.minTextLength) continue;
      const existing = slotByText.get(text);
      if (existing !== undefined) {
        slots[existing].members.push(job.index);
        continue;
      }
      const sig = this.hasher.signature(text);
      if (!sig) continue;
      slotByText.set(text, slots.length);
      slots.push({ signature: sig, members: [job.index] });
    }
    if (slots.length === 0) return { clusters: [] };

    // LSH bucketing — slot indices stored per band-key.
    const buckets = new Map<string, number[]>();
    for (let i = 0; i < slots.length; i++) {
      const keys = lshBandKeys(slots[i].signature, this.bands);
      for (const key of keys) {
        const bucket = buckets.get(key);
        if (bucket) bucket.push(i);
        else buckets.set(key, [i]);
      }
    }

    // Verify candidate slot pairs, skipping pairs whose slots are already
    // transitively connected — a verified union makes every later pair inside
    // the same component redundant, which is what keeps duplicate-heavy
    // batches near-linear instead of quadratic (Spec 722 / FR-6).
    const uf = new UnionFind(slots.length);
    const seenPairs = new Set<number>();

    buckets.forEach((bucket) => {
      if (bucket.length < 2) return;
      const cap = Math.min(bucket.length, this.maxBucketSize);
      for (let i = 0; i < cap; i++) {
        for (let j = i + 1; j < cap; j++) {
          const a = bucket[i];
          const b = bucket[j];
          const lo = a < b ? a : b;
          const hi = a < b ? b : a;
          // Encode pair as a 53-bit integer key (safe for Set numbers).
          // slots.length is bounded by input.length; for 10 K jobs the
          // pair-key fits comfortably under Number.MAX_SAFE_INTEGER.
          const pairKey = lo * 0x200000 + hi;
          if (seenPairs.has(pairKey)) continue;
          seenPairs.add(pairKey);
          if (uf.find(lo) === uf.find(hi)) continue;
          const sim = signatureSimilarity(slots[lo].signature, slots[hi].signature);
          if (sim >= this.similarityThreshold) {
            uf.union(lo, hi);
          }
        }
      }
    });

    // Emit each connected component — expanded from slots back to job
    // indices — as one cluster. Single-slot components still emit when the
    // slot holds ≥ 2 identical-text members (FR-5).
    const clusters: number[][] = [];
    for (const component of uf.toClusters()) {
      let size = 0;
      for (const slot of component) size += slots[slot].members.length;
      if (size < 2) continue;
      const out: number[] = [];
      for (const slot of component) {
        for (const member of slots[slot].members) out.push(member);
      }
      // Ascending index order = input order (members are input indices).
      out.sort((x, y) => x - y);
      clusters.push(out);
    }

    return { clusters };
  }
}

/**
 * Resolve the text used to build a job's MinHash signature. We prefer the
 * description (long-form, high-information) but fall back to the
 * title + company combination so jobs with empty descriptions still get a
 * deterministic signature when the text is long enough overall.
 */
function pickText(job: PreparedJob): string {
  const desc = job.raw.description ?? '';
  if (desc.length > 0) return desc;
  const title = job.raw.title ?? '';
  const company = job.raw.company ?? '';
  return `${title} ${company}`.trim();
}
