export interface SlugOptions {
    isGovt?: boolean;
    vacancyCount?: number;
    year?: number;
}

/**
 * Generate a URL-friendly slug from title and company
 * Format: "role-at-company" (e.g., "software-engineer-at-google")
 * For Govt: "org-recruitment-year-apply-online-posts"
 */
export function generateSlug(title: string, company: string, id?: string, options?: SlugOptions): string {
    const clean = (text: string) => text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-'); // Replace multiple hyphens with single

    let titleSlug = clean(title);
    let companySlug = clean(company);

    // Govt SEO Strategy
    if (options?.isGovt) {
        const currentYear = options.year || new Date().getFullYear();
        const yearStr = currentYear.toString();

        // Ensure year is in the title for SEO if not already there
        if (!titleSlug.includes(yearStr)) {
            titleSlug = `${titleSlug}-${yearStr}`;
        }

        // Add "recruitment" and "apply-online" keywords if missing
        if (!titleSlug.includes('recruitment')) titleSlug += '-recruitment';

        // Add vacancy count if available
        if (options.vacancyCount && options.vacancyCount > 0) {
            titleSlug += `-apply-online-${options.vacancyCount}-posts`;
        }

        // For Govt jobs, the "Company" is often the Department/Body
        // If title already contains company/dept, we can skip "at-company" to keep it short
        const suffix = id ? `-${id.substring(0, 8)}` : '';
        return `${titleSlug}${suffix}`;
    }

    // Standard Private Job Strategy
    titleSlug = titleSlug.substring(0, 50);
    companySlug = companySlug.substring(0, 30);
    const suffix = id ? `-${id.substring(0, 8)}` : '';

    return `${titleSlug}-at-${companySlug}${suffix}`;
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
