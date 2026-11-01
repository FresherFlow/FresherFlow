import { getCompanySlug, resolveCompanyDomain, slugify } from '@fresherflow/utils/slugify';

/**
 * Resolves a listing to its canonical company slug.
 *
 * The API owns the slug: `companies.json`, `companies/{slug}.json` and
 * `sitemap-companies.xml` are all written from `CompanyDirectoryService`, whose
 * identity is the company's domain. This class must agree with it, so every
 * fallback delegates to the same `getCompanySlug`/`resolveCompanyDomain`
 * helpers. A local reimplementation here is how the web once produced
 * `/companies/greenhouse` for a `boards.greenhouse.io` listing while the API
 * wrote the employer's slug.
 */
export class CompanySlugger {
    private nameToCanonicalSlug = new Map<string, string>();
    private domainToCanonicalSlug = new Map<string, string>();
    private slugToCanonicalName = new Map<string, string>();

    constructor(directory: { name: string; slug?: string; url?: string | null }[]) {
        for (const item of directory) {
            if (!item.name) continue;
            const canonicalSlug = item.slug || slugify(item.name);
            this.nameToCanonicalSlug.set(item.name.toLowerCase().trim(), canonicalSlug);

            // Only real employer domains are indexed. An ATS host would map
            // every customer of that platform onto one company.
            const domain = resolveCompanyDomain(item.url);
            if (domain && !domain.isAts) {
                this.domainToCanonicalSlug.set(domain.registrable, canonicalSlug);
            }

            if (!this.slugToCanonicalName.has(canonicalSlug)) {
                this.slugToCanonicalName.set(canonicalSlug, item.name);
            }
        }
    }

    getCanonicalName(slug: string, fallback: string): string {
        return this.slugToCanonicalName.get(slug) || fallback;
    }

    /**
     * Order matters and is deliberately directory-first: a crawled
     * `/companies/{slug}` must not move because a logo provider changed the
     * domain it serves.
     *
     *  1. exact name in companies.json — the canonical slug the API publishes
     *  2. the listing's domain, matched against the directory's domains
     *  3. an ATS URL, whose employer token is itself the canonical slug
     *  4. the domain implied by the logo
     *  5. the shared name/domain resolver — never a bare name slugify
     */
    getSlug(opp: { company?: string | null; companyWebsite?: string | null; companyLogoUrl?: string | null }): string | null {
        if (!opp.company) return null;

        let slug = this.nameToCanonicalSlug.get(opp.company.toLowerCase().trim()) ?? null;

        const domain = resolveCompanyDomain(opp.companyWebsite);
        if (!slug && domain) {
            if (domain.isAts) {
                slug = domain.slug;
            } else {
                slug = this.domainToCanonicalSlug.get(domain.registrable)
                    ?? this.matchParentDomain(domain.registrable)
                    ?? null;
            }
        }

        if (!slug && opp.companyLogoUrl) {
            const logoDomain = logoUrlDomain(opp.companyLogoUrl);
            if (logoDomain) slug = resolveCompanyDomain(logoDomain)?.slug ?? null;
        }

        return slug || getCompanySlug(opp.company, opp.companyWebsite ?? null) || null;
    }

    private matchParentDomain(hostname: string): string | undefined {
        for (const [knownDomain, knownSlug] of this.domainToCanonicalSlug.entries()) {
            if (hostname === knownDomain || hostname.endsWith(`.${knownDomain}`)) return knownSlug;
        }
        return undefined;
    }
}

/**
 * The domain a logo URL points at: `logo.clearbit.com/acme.com`. A hashed asset
 * path names no company, so it returns null rather than a random segment.
 */
function logoUrlDomain(logoUrl: string): string | null {
    try {
        const parsed = new URL(logoUrl);
        const segments = parsed.pathname.split('/').filter(Boolean);
        if (segments.length === 0) return null;

        const candidate = parsed.hostname.toLowerCase() === 'logo.clearbit.com'
            ? segments[0]
            : segments[segments.length - 1];

        const domain = decodeURIComponent(candidate)
            .replace(/\.(png|jpe?g|webp|svg|gif)$/i, '')
            .toLowerCase();

        return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain) ? domain : null;
    } catch {
        return null;
    }
}
