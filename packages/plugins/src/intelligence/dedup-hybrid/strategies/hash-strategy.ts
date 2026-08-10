import { ClusterPartition, IDedupStrategy, PreparedJob } from '../types';

/**
 * Stage 1 — exact-canonical-id bucketing.
 *
 * Given the precomputed `canonicalJobId` (sha-256 of the normalised triple
 * `company|title|location`), we partition inputs into buckets keyed by that
 * id. Cosmetic-only differences (case, suffix punctuation, abbreviations)
 * have already been collapsed in `packages/common/src/normalize.ts`, so any
 * two postings sharing a `canonicalJobId` are *definitely* the same role.
 *
 * Complexity: O(N) time, O(N) space. The Map keeps insertion order, which
 * preserves stable cluster output.
 *
 * Spec 003 / FR-2 (fast path).
 */
export class HashStrategy implements IDedupStrategy {
  readonly name = 'hash';

  cluster(input: ReadonlyArray<PreparedJob>): ClusterPartition {
    const buckets = new Map<string, number[]>();
    for (let i = 0; i < input.length; i++) {
      const job = input[i];
      const key = job.canonicalJobId;
      const bucket = buckets.get(key);
      if (bucket) bucket.push(job.index);
      else buckets.set(key, [job.index]);
    }
    return { clusters: Array.from(buckets.values()) };
  }
}
