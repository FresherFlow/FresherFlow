export interface SlugOptions {
    isGovt?: boolean;
    vacancyCount?: number;
    year?: number;
}

/**
 * Sanitize a user-supplied custom slug.
 * Lowercases, strips invalid chars, collapses hyphens.
 */
export function sanitizeCustomSlug(raw: string): string {
    return raw
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 120);
}

/**
 * Generate a URL-friendly slug from title and company.
 *
 * Private jobs:  "software-engineer-at-google-abc12345"
 * Govt jobs:     "ssc-cgl-2026"  (no random suffix — use resolveGovtSlug for collision safety)
 */
export function generateSlug(title: string, company: string, id?: string, options?: SlugOptions): string {
    const clean = (text: string) => text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');

    // ── Government / Exam SEO slug ────────────────────────────────────────────
    // Target: "ssc-cgl-2026", "telangana-police-recruitment-2026"
    // No random suffix. Collision handled by resolveGovtSlug at call site.
    if (options?.isGovt) {
        const currentYear = options.year || new Date().getFullYear();
        const yearStr = currentYear.toString();

        let slug = clean(title).substring(0, 80).replace(/-+$/, '');

        if (!slug.includes(yearStr)) {
            slug = `${slug}-${yearStr}`;
        }

        return slug;
    }

    // ── Standard private / internship / walk-in slug ──────────────────────────
    // Target: "software-engineer-at-google-abc12345"
    const titleSlug = clean(title).substring(0, 50);
    const companySlug = clean(company).substring(0, 30);
    const suffix = id ? `-${id.substring(0, 8)}` : '';

    return `${titleSlug}-at-${companySlug}${suffix}`;
}

/**
 * Resolve a collision-safe govt slug by checking existing slugs.
 * Returns the base slug if free, otherwise appends "-2", "-3", etc.
 *
 * @param base      - The base slug (from generateSlug with isGovt)
 * @param existingSlugs - Set of slugs already in the DB for this query
 */
export function resolveUniqueSlug(base: string, existingSlugs: Set<string>): string {
    if (!existingSlugs.has(base)) return base;

    let counter = 2;
    while (existingSlugs.has(`${base}-${counter}`)) {
        counter++;
    }
    return `${base}-${counter}`;
}

/**
 * Extract ID from slug (last segment after final hyphen group)
 */
export function extractIdFromSlug(slug: string): string | null {
    // Match pattern: anything-8chars at the end
    const match = slug.match(/-([a-f0-9]{8})$/);
    return match ? match[1] : null;
}

/**
 * Basic slugify for simple strings
 */
export function slugify(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}
