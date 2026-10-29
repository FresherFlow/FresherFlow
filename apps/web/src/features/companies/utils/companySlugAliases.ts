/**
 * Explicit company slug aliases: old slug -> current canonical slug.
 *
 * Company entries get renamed in companies.json (legal name cleanup,
 * rebranding). The old URLs keep earning rankings and backlinks, and the
 * generic name-slug fallback in companies/[slug] only catches them when the
 * CDN directory fetch succeeds — otherwise they 404 and the ranking dies.
 * This map guarantees a permanent redirect regardless of CDN availability.
 *
 * This is the SEED, not the source of truth. The API publishes the live map at
 * `meta/company-slug-history.json` and `resolveCompanySlugAlias` unions the two,
 * so renames recorded after this file was last edited are still honoured. Add
 * entries here only when a crawled URL needs rescuing before the next API run.
 *
 * Deliberately NOT listed (suspect directory data, left to name-slug
 * fallback): 'deutsche-bank' (resolves to 'db'), 'saxo-bank' (resolves to
 * 'home'). Fix those in companies.json, not here.
 */
const COMPANY_SLUG_ALIASES: Record<string, string> = {
    'maruti-suzuki-india-limited': 'marutisuzuki',
    'infosys-limited': 'infosys',
    'dell-technologies': 'dell',
    'volvo-group': 'volvo',
    'kpmg-india': 'kpmg',
    'pwc-india': 'pwc',
    'wipro-ltd': 'wipro',
    'tech-mahindra': 'techmahindra',
    'qualcomm-india-private-limited': 'qualcomm',
    'vois-vodafone-intelligent-solutions': 'vodafone',
    'codetantra-tech-solutions': 'codetantra',
    'google-operations-center': 'googleoperationscenter',
    'greendzine-technologies-pvt-ltd': 'greendzine',
    'sarvam-ai': 'sarvam',
    'alphasense': 'alpha-sense',
    'amber': 'amberstudent',
    '24-7-ai': '247',
};

/**
 * Resolves an already-slugified company slug through the alias map.
 * Follows at most 3 hops to guard against accidental chains/cycles,
 * then returns the final slug unchanged when no alias applies.
 *
 * `extraAliases` is the CDN-published history (`meta/company-slug-history.json`),
 * which the API rebuilds from every company name, website and opportunity row
 * it has ever seen. It is unioned over the static seed so a rename recorded
 * after this file was last edited still redirects. Never passes null: the page
 * must redirect on its own when the CDN is unreachable.
 */
export function resolveCompanySlugAlias(slug: string, extraAliases?: Record<string, string> | null): string {
    let current = slug;
    for (let hop = 0; hop < 3; hop++) {
        const next = extraAliases?.[current] ?? COMPANY_SLUG_ALIASES[current];
        if (!next || next === current) break;
        current = next;
    }
    return current;
}
