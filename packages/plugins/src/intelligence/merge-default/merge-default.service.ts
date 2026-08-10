import { FieldWithProvenance, MergeCategory, MergeDefaultOptions } from './types';
import { SITE_CATEGORY_DEFAULTS } from './site-category-defaults';

export const DEFAULT_CATEGORY_PRIORITY: ReadonlyArray<MergeCategory> = [
  'ats',
  'company',
  'job-board',
  'regional',
  'government',
  'remote',
  'freelance',
  'niche',
];

const ENUM_ORDER: ReadonlyArray<string> = Array.from(SITE_CATEGORY_DEFAULTS.keys());

function siteRank(site: string): number {
  const idx = ENUM_ORDER.indexOf(site);
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
}

export class MergeDefaultService {
  private readonly siteCategoryMap: ReadonlyMap<string, MergeCategory>;
  private readonly fallbackCategory: MergeCategory;
  private readonly priority: ReadonlyArray<MergeCategory>;
  private readonly priorityIndex: ReadonlyMap<MergeCategory, number>;
  private readonly fieldOverrides: ReadonlyMap<
    string,
    ReadonlyMap<MergeCategory, number>
  >;
  private readonly preferRecent: boolean;

  constructor(options?: MergeDefaultOptions) {
    options = options ?? {};
    this.siteCategoryMap = options.siteCategoryMap ?? SITE_CATEGORY_DEFAULTS;
    this.fallbackCategory = options.fallbackCategory ?? 'job-board';
    this.priority = mergePriority(
      options.categoryPriority,
      DEFAULT_CATEGORY_PRIORITY,
    );
    this.priorityIndex = toIndexMap(this.priority);
    this.fieldOverrides = freezeFieldOverrides(options.fieldOverrides);
    this.preferRecent = options.preferRecent ?? true;
  }

  merge<T>(
    fieldName: string,
    candidates: ReadonlyArray<FieldWithProvenance<T>>,
  ): FieldWithProvenance<T> {
    if (candidates.length === 0) {
      throw new RangeError(
        `MergeDefaultService.merge: no candidates supplied for field "${fieldName}"`,
      );
    }
    if (candidates.length === 1) return candidates[0];

    const rankFor = this.fieldOverrides.get(fieldName) ?? this.priorityIndex;

    let winner = candidates[0];
    let winnerCategoryRank = this.rankFor(winner._source, rankFor);
    let winnerObservedAt = parseObservedAt(winner._observedAt);
    let winnerSiteRank = siteRank(winner._source);

    for (let i = 1; i < candidates.length; i++) {
      const c = candidates[i];
      const cRank = this.rankFor(c._source, rankFor);

      if (cRank < winnerCategoryRank) {
        winner = c;
        winnerCategoryRank = cRank;
        winnerObservedAt = parseObservedAt(c._observedAt);
        winnerSiteRank = siteRank(c._source);
        continue;
      }
      if (cRank > winnerCategoryRank) continue;

      const cObs = parseObservedAt(c._observedAt);
      if (this.preferRecent && cObs > winnerObservedAt) {
        winner = c;
        winnerObservedAt = cObs;
        winnerSiteRank = siteRank(c._source);
        continue;
      }
      if (this.preferRecent && cObs < winnerObservedAt) continue;

      const cSite = siteRank(c._source);
      if (cSite < winnerSiteRank) {
        winner = c;
        winnerSiteRank = cSite;
      }
    }
    return winner;
  }

  categoryOf(site: string): MergeCategory {
    return this.siteCategoryMap.get(site) ?? this.fallbackCategory;
  }

  private rankFor(
    site: string,
    index: ReadonlyMap<MergeCategory, number>,
  ): number {
    const cat = this.categoryOf(site);
    const r = index.get(cat);
    return r === undefined ? Number.MAX_SAFE_INTEGER : r;
  }

  describe(): {
    fallbackCategory: MergeCategory;
    priority: ReadonlyArray<MergeCategory>;
    fieldOverrides: ReadonlyArray<[string, ReadonlyArray<MergeCategory>]>;
    preferRecent: boolean;
    siteCategoryMapSize: number;
  } {
    const fields: Array<[string, ReadonlyArray<MergeCategory>]> = [];
    for (const [field, idx] of this.fieldOverrides) {
      const ordered = [...idx.entries()]
        .sort((a, b) => a[1] - b[1])
        .map(([cat]) => cat);
      fields.push([field, ordered]);
    }
    return {
      fallbackCategory: this.fallbackCategory,
      priority: this.priority,
      fieldOverrides: fields,
      preferRecent: this.preferRecent,
      siteCategoryMapSize: this.siteCategoryMap.size,
    };
  }
}

function mergePriority(
  override: ReadonlyArray<MergeCategory> | undefined,
  defaults: ReadonlyArray<MergeCategory>,
): ReadonlyArray<MergeCategory> {
  if (!override || override.length === 0) return defaults;
  const seen = new Set<MergeCategory>(override);
  const tail = defaults.filter((c) => !seen.has(c));
  return [...override, ...tail];
}

function toIndexMap(
  categories: ReadonlyArray<MergeCategory>,
): ReadonlyMap<MergeCategory, number> {
  const m = new Map<MergeCategory, number>();
  for (let i = 0; i < categories.length; i++) m.set(categories[i], i);
  return m;
}

function freezeFieldOverrides(
  overrides: ReadonlyMap<string, ReadonlyArray<MergeCategory>> | undefined,
): ReadonlyMap<string, ReadonlyMap<MergeCategory, number>> {
  if (!overrides || overrides.size === 0) return new Map();
  const out = new Map<string, ReadonlyMap<MergeCategory, number>>();
  for (const [field, list] of overrides) {
    const merged = mergePriority(list, DEFAULT_CATEGORY_PRIORITY);
    out.set(field, toIndexMap(merged));
  }
  return out;
}

function parseObservedAt(iso: string): number {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : Number.NEGATIVE_INFINITY;
}
