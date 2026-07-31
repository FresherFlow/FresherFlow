import { createHash } from 'crypto';
import { normalizeCompany, normalizeLocation, normalizeTitle } from './normalize';

/**
 * Triple of normalised fields that, joined with `|`, defines the canonical
 * identity of a job posting (Spec 003).
 */
export interface CanonicalKeyInput {
  readonly title: string | null | undefined;
  readonly company: string | null | undefined;
  readonly location: string | null | undefined;
}

/**
 * Build the canonical-key string for a raw job. Pure & deterministic.
 *
 *   canonicalKey({ company: "Acme, Inc.", title: "Sr. SWE", location: "Remote" })
 *   //=> "acme|senior swe|remote"
 *
 * The pipe is a literal separator; pipes inside any normalised field are
 * impossible (`PUNCT_RE` doesn't strip pipes for titles, but `TITLE_NOISE`
 * already replaces them with spaces — so pipes can never appear inside a
 * normalised title; companies and locations never contain pipes).
 */
export function canonicalKey(input: CanonicalKeyInput): string {
  const company = normalizeCompany(input.company ?? '');
  const title = normalizeTitle(input.title ?? '');
  const location = normalizeLocation(input.location ?? '');
  return `${company}|${title}|${location}`;
}

/**
 * Stable sha-256 (lower-case hex) of the canonical key. This is the
 * `CanonicalJob.canonicalJobId` produced by the dedup engine.
 */
export function canonicalJobId(input: CanonicalKeyInput): string {
  return createHash('sha256').update(canonicalKey(input), 'utf8').digest('hex');
}
