/**
 * Explicit company slug aliases: old slug -> current canonical slug.
 *
 * Company entries get renamed in companies.json (legal name cleanup,
 * rebranding). The old URLs keep earning rankings and backlinks, and the
 * generic name-slug fallback in companies/[slug] only catches them when the
 * CDN directory fetch succeeds — otherwise they 404 and the ranking dies.
 * This map guarantees a permanent redirect regardless of CDN availability.
 *
 * Derived from ranked-keyword data (new.json) cross-checked against
 * companies.json. Entries resolve exactly once via resolveCompanySlugAlias.
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
 */
export function resolveCompanySlugAlias(slug: string): string {
    let current = slug;
    for (let hop = 0; hop < 3; hop++) {
        const next = COMPANY_SLUG_ALIASES[current];
        if (!next || next === current) break;
        current = next;
    }
    return current;
}
