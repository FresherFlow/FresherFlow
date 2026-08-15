import { slugify } from '@fresherflow/utils/slugify';

export class CompanySlugger {
    private nameToCanonicalSlug = new Map<string, string>();
    private domainToCanonicalSlug = new Map<string, string>();
    private slugToCanonicalName = new Map<string, string>();

    constructor(directory: { name: string; slug?: string; url?: string | null }[]) {
        for (const item of directory) {
            if (!item.name) continue;
            const canonicalSlug = item.slug || slugify(item.name);
            this.nameToCanonicalSlug.set(item.name.toLowerCase().trim(), canonicalSlug);
            
            if (item.url) {
                try {
                    const hostname = new URL(item.url).hostname.toLowerCase().replace(/^www\./, '');
                    this.domainToCanonicalSlug.set(hostname, canonicalSlug);
                } catch {}
            }

            if (!this.slugToCanonicalName.has(canonicalSlug)) {
                this.slugToCanonicalName.set(canonicalSlug, item.name);
            }
        }
    }

    getCanonicalName(slug: string, fallback: string): string {
        return this.slugToCanonicalName.get(slug) || fallback;
    }

    getSlug(opp: { company?: string | null; companyWebsite?: string | null; companyLogoUrl?: string | null }): string | null {
        if (!opp.company) return null;
        
        let slug: string | null | undefined = null;

        // 1. Try extracting slug from Clearbit logo URL domain
        if (opp.companyLogoUrl && opp.companyLogoUrl.includes('clearbit.com/')) {
            try {
                const domainMatch = opp.companyLogoUrl.split('clearbit.com/')[1]?.split('?')[0]?.split('/')[0];
                if (domainMatch) {
                    const parts = domainMatch.toLowerCase().replace(/^www\./, '').split('.');
                    if (parts.length >= 2) {
                        let word = parts[parts.length - 2];
                        if (['co', 'com', 'org', 'ac', 'net', 'edu', 'in'].includes(word) && parts.length >= 3) {
                            word = parts[parts.length - 3];
                        }
                        slug = word;
                    } else {
                        slug = parts[0];
                    }
                }
            } catch {}
        }

        // 2. Match by website domain against known companies.json domains
        if (!slug && opp.companyWebsite) {
            try {
                const hostname = new URL(opp.companyWebsite).hostname.toLowerCase().replace(/^www\./, '');
                slug = this.domainToCanonicalSlug.get(hostname);
                if (!slug) {
                    for (const [knownDomain, knownSlug] of this.domainToCanonicalSlug.entries()) {
                        if (hostname === knownDomain || hostname.endsWith(`.${knownDomain}`)) {
                            slug = knownSlug;
                            break;
                        }
                    }
                }
            } catch {}
        }

        // 3. Fallback to exact name match in companies.json
        if (!slug) {
            slug = this.nameToCanonicalSlug.get(opp.company.toLowerCase().trim());
        }

        // 4. Last resort: slugify the company name
        if (!slug) {
            slug = slugify(opp.company.trim());
        }

        return slug || null;
    }
}
