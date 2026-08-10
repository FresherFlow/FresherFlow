export type MergeCategory =
  | 'ats'
  | 'company'
  | 'job-board'
  | 'remote'
  | 'government'
  | 'regional'
  | 'freelance'
  | 'niche';

export interface FieldWithProvenance<T> {
  value: T;
  _source: string;
  _observedAt: string;
}

export interface MergeDefaultOptions {
  readonly siteCategoryMap?: ReadonlyMap<string, MergeCategory>;
  readonly fallbackCategory?: MergeCategory;
  readonly categoryPriority?: ReadonlyArray<MergeCategory>;
  readonly fieldOverrides?: ReadonlyMap<string, ReadonlyArray<MergeCategory>>;
  readonly preferRecent?: boolean;
}
