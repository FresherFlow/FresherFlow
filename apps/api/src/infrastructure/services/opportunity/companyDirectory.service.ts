import { getCompanySlug, logger, normalizeCompanyName, resolveCompanyDomain } from '@fresherflow/utils';
import { StorageService } from '../platform/storage.service';

/**
 * One canonical company, keyed by its domain.
 *
 * `companies.json`, `companies/{slug}.json`, `sitemap-companies.xml` and
 * `sitemaps/sitemap-data.json` must all agree on a company's slug, and the slug
 * must come from the company's website domain. Deriving it per opportunity from
 * whatever name string that row happened to carry produced one company page per
 * spelling ("PwC", "PwC India", "PricewaterhouseCoopers Services LLP") all
 * slugged `pwc`, so each shard upload overwrote the previous one and the
 * sitemap listed the same URL four times.
 */
export interface CompanyDirectoryEntry {
    name: string;
    url: string | null;
    logo_url: string | null;
    slug: string;
}

export interface CompanyDirectory {
    entries: CompanyDirectoryEntry[];
    /** Every spelling ever seen -> the one canonical entry it belongs to. */
    byName: Map<string, CompanyDirectoryEntry>;
}

export interface CompanyRow {
    company?: string | null;
    companyWebsite?: string | null;
    companyLogoUrl?: string | null;
}

interface NameCount {
    display: string;
    count: number;
}

interface CompanyGroup {
    names: Map<string, NameCount>;
    websites: string[];
    logo: string | null;
}

interface CompanyDraft {
    names: Map<string, NameCount>;
    url: string | null;
    logo: string | null;
    slug: string;
}

/** Logo CDNs that put the domain in the first path segment. */
const LOGO_PROVIDER_HOSTS = new Set([
    'logo.clearbit.com',
    'logo.dev',
    'img.logo.dev',
    'cdn.brandfetch.io',
    'logo.uplead.com',
]);

/**
 * Recover a domain from a logo URL: `logo.clearbit.com/acme.com` and
 * `.../logos/acme.com.png` both name `acme.com`. Anything else (a hashed asset
 * path, a CDN key) returns null rather than inventing a company.
 */
function domainFromLogoUrl(logoUrl: string | null | undefined): string | null {
    if (!logoUrl) return null;
    try {
        const parsed = new URL(/^https?:\/\//i.test(logoUrl) ? logoUrl : `https://${logoUrl}`);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

        const segments = parsed.pathname.split('/').filter(Boolean);
        if (segments.length === 0) return null;

        const fromPath = LOGO_PROVIDER_HOSTS.has(parsed.hostname.toLowerCase())
            ? segments[0]
            : segments[segments.length - 1];

        const candidate = decodeURIComponent(fromPath)
            .replace(/\.(png|jpe?g|webp|svg|gif)$/i, '')
            .toLowerCase();

        // A logo path only names a domain when it still looks like one.
        return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(candidate) ? candidate : null;
    } catch {
        return null;
    }
}

/**
 * The name shown on the company page: the spelling the feed uses most, then the
 * shortest of the remaining variants ("PwC" over "PwC Services LLP").
 */
function pickDisplayName(names: Map<string, NameCount>): string {
    return Array.from(names.values()).sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        const aWords = a.display.split(/\s+/).filter(Boolean).length;
        const bWords = b.display.split(/\s+/).filter(Boolean).length;
        if (aWords !== bWords) return aWords - bWords;
        if (a.display.length !== b.display.length) return a.display.length - b.display.length;
        return a.display.localeCompare(b.display);
    })[0].display;
}

/**
 * Pick the URL that best represents the employer.
 *
 * A real company site beats an ATS board, which beats the domain implied by the
 * logo. A job board or social profile is never accepted: `linkedin.com` is not
 * an employer, so the name fallback is better than `/companies/linkedin`.
 */
function pickWebsite(websites: string[], logo: string | null, previousUrl: string | null): string | null {
    const unique = Array.from(new Set(websites));
    const ownSite = unique.find((url) => {
        const domain = resolveCompanyDomain(url);
        return domain !== null && !domain.isAts;
    });
    if (ownSite) return ownSite;

    const logoDomain = domainFromLogoUrl(logo);
    if (logoDomain) return `https://${logoDomain}`;

    const atsSite = unique.find((url) => resolveCompanyDomain(url) !== null);
    return atsSite ?? previousUrl;
}

export class CompanyDirectoryService {
    /** The published directory, used as the stability reference for a rebuild. */
    static async load(): Promise<CompanyDirectoryEntry[]> {
        try {
            const content = await StorageService.fetchFromR2('companies.json');
            if (!content) return [];
            const parsed = JSON.parse(content);
            if (!Array.isArray(parsed)) return [];
            return parsed
                .filter(
                    (entry): entry is CompanyDirectoryEntry =>
                        Boolean(entry && typeof entry.name === 'string' && typeof entry.slug === 'string' && entry.slug),
                )
                .map((entry) => ({
                    name: entry.name,
                    url: typeof entry.url === 'string' ? entry.url : null,
                    logo_url: typeof entry.logo_url === 'string' ? entry.logo_url : null,
                    slug: entry.slug,
                }));
        } catch (error) {
            logger.error('[CompanyDirectoryService] Failed to load companies.json', error);
            return [];
        }
    }

    /**
     * Build the canonical directory from live opportunities.
     *
     * Grouping is by domain, not by name: every spelling that resolves to the
     * same domain word collapses into one entry with one slug. `previous` only
     * supplies a stable slug for companies that still have no usable website —
     * a company that gains a domain is re-slugged from it, which is the whole
     * point of the fix.
     */
    static build(rows: CompanyRow[], previous: CompanyDirectoryEntry[] = []): CompanyDirectory {
        const previousByName = new Map<string, CompanyDirectoryEntry>();
        for (const entry of previous) {
            const key = normalizeCompanyName(entry.name);
            if (key && entry.slug) previousByName.set(key, entry);
        }

        const groups = new Map<string, CompanyGroup>();
        for (const row of rows) {
            const display = row.company?.trim();
            if (!display) continue;
            const key = normalizeCompanyName(display);
            if (!key) continue;

            let group = groups.get(key);
            if (!group) {
                group = { names: new Map(), websites: [], logo: null };
                groups.set(key, group);
            }

            const counted = group.names.get(key);
            if (counted) counted.count += 1;
            else group.names.set(key, { display, count: 1 });

            const website = row.companyWebsite?.trim();
            if (website) group.websites.push(website);
            const logo = row.companyLogoUrl?.trim();
            if (logo && !group.logo) group.logo = logo;
        }

        const drafts: CompanyDraft[] = [];
        for (const group of groups.values()) {
            const name = pickDisplayName(group.names);
            const previousEntry = previousByName.get(normalizeCompanyName(name));
            const url = pickWebsite(group.websites, group.logo, previousEntry?.url ?? null);

            // No usable site at all: keep the published slug rather than
            // renaming a URL that may already be indexed.
            const slug = url ? getCompanySlug(name, url) : previousEntry?.slug || getCompanySlug(name, null);
            if (!slug) continue;

            drafts.push({ names: new Map(group.names), url, logo: group.logo, slug });
        }

        const bySlug = new Map<string, CompanyDraft>();
        for (const draft of drafts) {
            const existing = bySlug.get(draft.slug);
            if (!existing) {
                bySlug.set(draft.slug, draft);
                continue;
            }

            for (const [key, value] of draft.names) {
                const counted = existing.names.get(key);
                if (counted) counted.count += value.count;
                else existing.names.set(key, { ...value });
            }
            if (!existing.url && draft.url) existing.url = draft.url;
            if (!existing.logo && draft.logo) existing.logo = draft.logo;
        }

        const entries: CompanyDirectoryEntry[] = [];
        const byName = new Map<string, CompanyDirectoryEntry>();
        for (const draft of bySlug.values()) {
            const entry: CompanyDirectoryEntry = {
                name: pickDisplayName(draft.names),
                url: draft.url,
                logo_url: draft.logo,
                slug: draft.slug,
            };
            entries.push(entry);
            for (const key of draft.names.keys()) byName.set(key, entry);
        }

        entries.sort((a, b) => a.name.localeCompare(b.name));
        return { entries, byName };
    }
}
