export const TAXONOMY_MIN_JOBS = 3;

/** URL suffix that marks role/city/skill boards. Year (-batch) and combo boards stay unsuffixed. */
export const TAXONOMY_BOARD_SUFFIX = '-jobs';

export interface TaxonomyItem {
    slug: string;
    label: string;
    count: number;
}

export interface TaxonomyCombo {
    roleSlug: string;
    citySlug: string;
    roleLabel: string;
    cityLabel: string;
    count: number;
}

export interface TaxonomyRegistry {
    roles: Map<string, TaxonomyItem>;
    cities: Map<string, TaxonomyItem>;
    skills: Map<string, TaxonomyItem>;
    years: Map<number, number>;
    combos: Map<string, TaxonomyCombo>;
}

export type ResolvedTaxonomy =
    | { kind: 'role'; slug: string; label: string; item: TaxonomyItem }
    | { kind: 'city'; slug: string; label: string; item: TaxonomyItem }
    | { kind: 'skill'; slug: string; label: string; item: TaxonomyItem }
    | { kind: 'year'; slug: string; label: string; year: number }
    | { kind: 'combo'; slug: string; label: string; combo: TaxonomyCombo };

/** Curated role seeds — hand-picked, always valid (from legacy /roles). */
export const CURATED_ROLE_KEYWORDS: Record<string, { label: string; keywords: string[] }> = {
    'software-engineer': {
        label: 'Software Engineer',
        keywords: ['software engineer', 'software developer', 'sde', 'full stack', 'backend developer', 'frontend developer', 'programmer', 'developer'],
    },
    'data-analyst': {
        label: 'Data Analyst',
        keywords: ['data analyst', 'bi analyst', 'data analytics', 'data scientist', 'ml engineer'],
    },
    'business-analyst': {
        label: 'Business Analyst',
        keywords: ['business analyst', 'product analyst', 'consultant', 'ba '],
    },
    'frontend-developer': {
        label: 'Frontend Developer',
        keywords: ['frontend developer', 'frontend engineer', 'ui developer', 'web developer'],
    },
    'test-engineer': {
        label: 'Test Engineer',
        keywords: ['test engineer', 'qa', 'quality assurance', 'sdet', 'automation engineer', 'tester'],
    },
};

export const DEFAULT_BATCH_YEARS = [2024, 2025, 2026, 2027, 2028];

export const BLOCKED_LOCATIONS = new Set([
    'pan india', 'india', 'remote', 'work from home', 'wfh',
    'multiple locations', 'various locations', 'anywhere', 'worldwide',
    'across india', 'all india', 'multiple cities',
]);

export const isCleanLocation = (loc: string) => {
    const l = loc.toLowerCase().trim();
    if (BLOCKED_LOCATIONS.has(l)) return false;
    if (l.includes(',')) return false;
    if (l.includes('(')) return false;
    if (loc.length > 40) return false;
    if (loc.length < 2) return false;
    return true;
};

/** Skill label formatting shared by board pages, metadata and the directory. */
export function formatSkillLabel(slug: string): string {
    const mappings: Record<string, string> = {
        'java': 'Java',
        'python': 'Python',
        'react': 'React',
        'javascript': 'JavaScript',
        'sql': 'SQL',
        'aws': 'AWS',
        'testing': 'Testing',
        'node-js': 'Node.js',
        'c-plus-plus': 'C++',
        'data-structures': 'DSA',
        'html-css': 'HTML/CSS'
    };
    return mappings[slug.toLowerCase()] || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function titleCaseSlug(slug: string): string {
    return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/** Canonical URL slug for a year board: `/jobs/2026-batch` (unsuffixed by decision). */
export function yearBoardSlug(year: number): string {
    return `${year}-batch`;
}

/** Public URL for a registry board slug. */
export function boardPath(slug: string): string {
    return `/jobs/${slug}`;
}

/** Guard: skip tag-derived role slugs that are noise, not roles. */
export const ROLE_TAG_NOISE = new Set(['walkin', 'walk-in', 'drive', 'off-campus', 'internship', 'government', 'govt', 'fresher', 'freshers', 'job', 'jobs', 'hiring']);

export function skipTagSlug(tagSlug: string, titleLower: string): boolean {
    if (!tagSlug || CURATED_ROLE_KEYWORDS[tagSlug] || ROLE_TAG_NOISE.has(tagSlug)) return true;
    return !titleLower.includes(tagSlug.replace(/-/g, ' '));
}
