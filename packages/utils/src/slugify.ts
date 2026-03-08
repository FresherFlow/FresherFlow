/**
 * Generate a URL-friendly slug from title and company
 * Format: "role-at-company" (e.g., "software-engineer-at-google")
 */
export function generateSlug(title: string, company: string, id?: string): string {
    const titleSlug = title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .substring(0, 50); // Limit length

    const companySlug = company
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 30);

    // Add short ID suffix to ensure uniqueness (first 8 chars of UUID)
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
