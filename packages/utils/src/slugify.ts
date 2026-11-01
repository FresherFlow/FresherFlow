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
 * Multi-part public suffixes that show up in company websites. The registrable
 * domain is the label immediately before its suffix, so `allen.ac.in` belongs
 * to `allen`; reading the last two labels yields `ac`, which is not a company.
 *
 * This is not a full public-suffix list. It covers the suffixes present in the
 * directory, and an unknown suffix degrades to the two-label rule.
 */
const MULTI_PART_SUFFIXES = new Set([
    'co.in', 'com.in', 'net.in', 'org.in', 'ac.in', 'gov.in', 'nic.in', 'edu.in',
    'firm.in', 'gen.in', 'ind.in',
    'co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'me.uk', 'net.uk',
    'com.au', 'net.au', 'org.au', 'edu.au', 'gov.au',
    'co.nz', 'net.nz', 'org.nz',
    'co.jp', 'or.jp', 'ne.jp', 'ac.jp', 'go.jp',
    'com.sg', 'net.sg', 'org.sg', 'edu.sg', 'gov.sg',
    'com.ph', 'net.ph', 'org.ph', 'gov.ph',
    'com.my', 'net.my', 'org.my', 'gov.my',
    'com.br', 'com.mx', 'com.ar', 'com.tr', 'com.cn', 'com.hk', 'com.tw',
    'co.kr', 'co.za', 'co.il', 'co.id', 'co.th', 'com.pk', 'com.bd', 'com.np', 'com.lk',
    // Canadian provincial domains: `countygp.ab.ca` belongs to `countygp`.
    'ab.ca', 'bc.ca', 'mb.ca', 'nb.ca', 'nl.ca', 'ns.ca', 'nt.ca', 'nu.ca',
    'on.ca', 'pe.ca', 'qc.ca', 'sk.ca', 'yk.ca', 'gc.ca',
]);

/**
 * Applicant-tracking hosts. The employer is the subdomain (`acme.lever.co`) or,
 * for path-routed boards, the first path segment (`jobs.lever.co/acme`). Treating
 * the platform as the employer gave every Lever customer the slug `lever`, so
 * they all overwrote the same `companies/lever.json` shard.
 */
const ATS_HOSTS = new Set([
    'lever.co', 'greenhouse.io', 'ashbyhq.com', 'workable.com', 'recruitee.com',
    'breezy.hr', 'teamtailor.com', 'smartrecruiters.com', 'jobvite.com',
    'icims.com', 'taleo.net', 'successfactors.com', 'myworkdayjobs.com',
    'zohorecruit.com', 'zohorecruit.in', 'freshteam.com', 'catsone.com',
    'talentlyft.com', 'applytojob.com', 'keka.com', 'darwinbox.in',
    'bamboohr.com', 'jazzhr.com', 'homerun.co', 'comeet.com', 'pinpointhq.com',
    'manatal.com', 'jobscore.com', 'trakstar.com', 'ultipro.com', 'workday.com',
]);

/**
 * Job boards and social profiles that are never the employer's own site. A
 * listing whose "website" is a LinkedIn company page must fall back to the
 * company name, not become `/companies/linkedin`.
 */
const JOB_BOARD_HOSTS = new Set([
    'linkedin.com', 'naukri.com', 'indeed.com', 'internshala.com', 'unstop.com',
    'glassdoor.com', 'foundit.in', 'monster.com', 'shine.com', 'timesjobs.com',
    'wellfound.com', 'cutshort.io', 'instahyre.com', 'hirist.tech', 'ycombinator.com',
    'twitter.com', 'x.com', 'facebook.com', 'instagram.com', 'youtube.com',
]);

/** Host labels that never name the employer. */
const GENERIC_HOST_LABELS = new Set([
    'www', 'ww2', 'careers', 'career', 'jobs', 'job', 'apply', 'application',
    'applications', 'recruitment', 'recruiting', 'talent', 'work', 'global',
    'about', 'candidate', 'candidates', 'portal', 'dashboard', 'app', 'boards',
    'board', 'en', 'us', 'embed', 'search', 'home',
]);

/** Legal-entity suffixes, longest first so `pvt ltd` wins over `ltd`. */
const LEGAL_SUFFIXES = [
    'private limited', 'pvt ltd', 'pvt. ltd.', 'pvt ltd.', 'pvt. ltd', 'pte ltd',
    'limited', 'ltd', 'incorporated', 'inc', 'llc', 'llp', 'plc', 'gmbh',
    'corporation', 'corp', 'company', 'sdn bhd', 'pte', 'bv', 'nv', 'sa', 'ag', 'oy', 'ab',
];

/** Region words dropped from a legal name, but only after a legal suffix was. */
const TRAILING_REGION_WORDS = ['india', 'indian', 'global', 'worldwide'];

/** gTLDs common enough to be a suffix rather than a brand. */
const COMMON_GTLDS = new Set([
    'com', 'org', 'net', 'edu', 'gov', 'mil', 'int', 'info', 'biz', 'io', 'ai',
    'co', 'us', 'me', 'tech', 'app', 'dev', 'jobs', 'careers', 'xyz', 'cloud',
    'online', 'site', 'store', 'shop', 'live', 'pro', 'plus', 'group', 'company',
    'solutions', 'services', 'systems', 'world', 'digital', 'media', 'agency',
    'studio', 'works', 'network', 'consulting', 'ventures', 'partners', 'labs',
    'software', 'tools', 'email', 'blog', 'news', 'today', 'life', 'one', 'team',
    'guru', 'expert', 'academy', 'school', 'institute', 'foundation', 'care',
    'health', 'travel', 'legal', 'finance', 'bank', 'insurance',
]);

function toSlugPart(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

export interface CompanyDomain {
    /** URL-safe brand word: `acme`. */
    slug: string;
    /** Registrable domain the slug came from: `acme.com`, or the ATS host. */
    registrable: string;
    /** True when the URL pointed at an applicant-tracking platform. */
    isAts: boolean;
}

/**
 * Resolve a company website to its domain identity.
 *
 * The domain is the company's identity, not its display name: `Acme Pvt Ltd`,
 * `ACME India` and `acme.lever.co/acme` are one company because they resolve to
 * the same domain word. Returns `null` when the URL says nothing usable, so the
 * caller can fall back to the name.
 */
export function resolveCompanyDomain(url: string | null | undefined): CompanyDomain | null {
    if (!url) return null;
    const raw = url.trim();
    if (!raw) return null;

    let parsed: URL;
    try {
        parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    } catch {
        return null;
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

    const hostname = parsed.hostname.toLowerCase().replace(/\.$/, '');
    const parts = hostname.split('.').filter(Boolean);
    if (parts.length < 2) return null;

    // A brand TLD is not a public suffix: `global.abb` is ABB, not "Global".
    if (
        parts.length === 2 &&
        GENERIC_HOST_LABELS.has(parts[0]) &&
        !/^[a-z]{2}$/.test(parts[1]) &&
        !COMMON_GTLDS.has(parts[1])
    ) {
        const slug = toSlugPart(parts[1]);
        return slug ? { slug, registrable: hostname, isAts: false } : null;
    }

    const suffixLength = MULTI_PART_SUFFIXES.has(parts.slice(-2).join('.')) ? 3 : 2;
    if (parts.length < suffixLength) return null;

    const registrable = parts.slice(-suffixLength).join('.');
    const brandLabel = parts[parts.length - suffixLength];
    const subdomainLabels = parts.slice(0, parts.length - suffixLength);

    if (JOB_BOARD_HOSTS.has(registrable)) return null;

    if (ATS_HOSTS.has(registrable)) {
        const employer = subdomainLabels
            .filter((label) => !GENERIC_HOST_LABELS.has(label))
            // Workday puts the tenant next to a `wd1`/`wd3` shard label.
            .filter((label) => !/^wd\d+$/i.test(label))
            .pop();
        if (employer) {
            const slug = toSlugPart(employer);
            return slug ? { slug, registrable, isAts: true } : null;
        }

        const firstSegment = parsed.pathname.split('/').filter(Boolean)[0];
        if (firstSegment && !GENERIC_HOST_LABELS.has(firstSegment.toLowerCase())) {
            const slug = toSlugPart(decodeURIComponent(firstSegment));
            if (slug && slug.length > 1) return { slug, registrable, isAts: true };
        }
        return null;
    }

    const slug = toSlugPart(brandLabel || '');
    return slug ? { slug, registrable, isAts: false } : null;
}

/**
 * Strip trailing legal-entity wording: `LLT India Pvt Ltd` -> `llt`.
 *
 * Only trailing suffixes are removed. The old fallback deleted these words
 * anywhere in the name, so `Zoho Solutions` became `zoho` and brands that
 * happen to contain `group`, `labs` or `systems` were mangled.
 */
function slugifyCompanyName(name: string): string {
    let result = name.trim();
    let strippedLegal = false;

    for (let guard = 0; guard < 6; guard++) {
        const lower = result.toLowerCase();
        const suffix = LEGAL_SUFFIXES.find(
            (candidate) => lower.endsWith(` ${candidate}`) || lower === candidate,
        );
        if (!suffix) break;
        result = lower === suffix ? '' : result.slice(0, result.length - suffix.length).trim();
        strippedLegal = true;
    }

    if (strippedLegal) {
        for (const word of TRAILING_REGION_WORDS) {
            const words = result.split(/\s+/).filter(Boolean);
            if (words.length > 1 && result.toLowerCase().endsWith(` ${word}`)) {
                result = result.slice(0, result.length - word.length).trim();
            }
        }
    }

    return slugify(result || name);
}

/**
 * Normalised company-name key used to group spelling variants of one company.
 * `PwC`, `PWC India` and `PwC  India` collapse to one key.
 */
export function normalizeCompanyName(name: string): string {
    return name
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

/**
 * Extract a clean, brand-focused company slug from a URL or fallback name,
 * supporting subdomain extraction for ATS platforms (e.g. zohorecruit, lever, greenhouse).
 *
 * The URL is authoritative: a company's slug must come from its domain, so a
 * name-derived slug is only used when there is no usable website at all.
 */
export function getCompanySlug(name: string, url: string | null): string {
    const domain = resolveCompanyDomain(url);
    if (domain) return domain.slug;
    return slugifyCompanyName(name);
}
