import { AtsJob } from '../../base/BaseAdapter.js';

export interface PreparedJob {
  readonly index: number;
  readonly canonicalJobId: string;
  readonly canonicalKey: string;
  readonly raw: AtsJob;
}

export interface ClusterPartition {
  readonly clusters: ReadonlyArray<ReadonlyArray<number>>;
}

export interface IDedupStrategy {
  readonly name: string;
  cluster(input: ReadonlyArray<PreparedJob>): ClusterPartition;
}

export interface DedupHybridOptions {
  readonly rejectInvalid?: boolean;
}

export interface IDedupEngine {
  dedup(jobs: ReadonlyArray<AtsJob>): Promise<DedupResult>;
}

export interface DedupResult {
  canonical: CanonicalJob[];
  assignments: (string | null)[];
  errors: DedupInputError[];
  metrics: DedupMetrics;
}

export interface DedupInputError {
  inputIndex: number;
  code: string;
  message: string;
}

export interface DedupMetrics {
  inputCount: number;
  outputCount: number;
  mergedPairs: number;
  elapsedMs: number;
}

export interface CanonicalJob {
  canonicalJobId: string;
  title: string;
  company: string;
  location: string;
  description?: string;
  url?: string;
  sources: SourceObservation[];
  fields: Record<string, FieldWithProvenance<unknown>>;
  mergedAt: string;
}

export interface SourceObservation {
  site: string;
  sourceJobId: string;
  url: string;
  observedAt: string;
  rawTitle?: string;
}

export interface FieldWithProvenance<T> {
  value: T;
  provenance: {
    site: string;
    sourceJobId: string;
    observedAt: string;
  };
}
