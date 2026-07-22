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
    const words = raw.toLowerCase().trim().split(/[^a-z0-9_]+/);
    return words.filter(Boolean).join('-').substring(0, 120);
}

/**
 * Generate a URL-friendly slug from title and company.
 *
 * Private jobs:  "software-engineer-at-google-abc12345"
 * Govt jobs:     "ssc-cgl-2026"  (no random suffix — use resolveGovtSlug for collision safety)
 */
export function generateSlug(title: string, company: string, id?: string, options?: SlugOptions): string {
    const clean = (text: string) => {
        const words = text.toLowerCase().trim().split(/[^a-z0-9_]+/);
        return words.filter(Boolean).join('-');
    };

    // ── Government / Exam SEO slug ────────────────────────────────────────────
    // Target: "ssc-cgl-2026", "telangana-police-recruitment-2026"
    // No random suffix. Collision handled by resolveGovtSlug at call site.
    if (options?.isGovt) {
        const currentYear = options.year || new Date().getFullYear();
        const yearStr = currentYear.toString();

        let slug = clean(title).substring(0, 80);

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
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-');
}

/**
 * Extract a clean, brand-focused company slug from a URL or fallback name,
 * supporting subdomain extraction for ATS platforms (e.g. zohorecruit, lever, greenhouse).
 */
export function getCompanySlug(name: string, url: string | null): string {
    if (url) {
        try {
            let host = url.trim().toLowerCase();
            if (!host.includes('://')) {
                host = 'https://' + host;
            }
            const urlObj = new URL(host);
            let hostname = urlObj.hostname;

            // Split hostname by dots
            const parts = hostname.split('.').filter(Boolean);

            if (parts.length >= 3) {
                // Check if the domain is a known ATS platform
                const secondToLast = parts[parts.length - 2];
                const thirdToLast = parts[parts.length - 3];
                const lastTwo = parts.slice(-2).join('.');
                
                // If it's a double TLD like co.in, the ATS domain would be at parts.length - 3
                let atsDomain = secondToLast;
                let companySubdomain = thirdToLast;
                
                if (['co.in', 'com.in', 'co.uk', 'org.in', 'net.in', 'co.nz'].includes(lastTwo)) {
                    if (parts.length >= 4) {
                        atsDomain = parts[parts.length - 3];
                        companySubdomain = parts[parts.length - 4];
                    } else {
                        atsDomain = '';
                    }
                }

                const ATS_PLATFORMS = new Set([
                    'zohorecruit', 'myworkdayjobs', 'lever', 'greenhouse', 
                    'smartrecruiters', 'breezy', 'recruitee', 'freshteam', 
                    'jobvite', 'catsone', 'workday', 'talentlyft', 'recruiteecdn'
                ]);

                const GENERIC_SUBDOMAINS = new Set([
                    'www', 'careers', 'jobs', 'global', 'about', 'recruitment', 'apply', 'candidate', 'portal', 'dashboard', 'app'
                ]);

                if (ATS_PLATFORMS.has(atsDomain) && companySubdomain && !GENERIC_SUBDOMAINS.has(companySubdomain)) {
                    return companySubdomain;
                }
            }

            // Standard domain extraction
            hostname = hostname.replace(/^(www\d*|careers|jobs|global|about|recruitment|apply|candidate)\./, '');
            const cleanParts = hostname.split('.').filter(Boolean);

            if (cleanParts.length > 0) {
                const lastTwo = cleanParts.slice(-2).join('.');
                if (['co.in', 'com.in', 'co.uk', 'org.in', 'net.in', 'co.nz'].includes(lastTwo) && cleanParts.length >= 3) {
                    return cleanParts[cleanParts.length - 3];
                }
                
                if (cleanParts.length >= 2) {
                    const tld = cleanParts[cleanParts.length - 1];
                    if (['com', 'in', 'org', 'net', 'info', 'biz', 'io', 'ai', 'co', 'us', 'me', 'tech', 'app', 'dev', 'jobs', 'careers'].includes(tld)) {
                        return cleanParts[cleanParts.length - 2];
                    }
                }
                
                return cleanParts[0];
            }
        } catch {
            // Fallback
        }
    }

    // Fallback name cleaning
    const cleanedName = name
        .replace(/\b(pvt|ltd|private|limited|solutions|services|technologies|technology|india|labs|systems|consulting|group|dev|center)\b/gi, '')
        .trim();
    
    const nameToSlugify = cleanedName.length > 0 ? cleanedName : name;

    return slugify(nameToSlugify);
}
