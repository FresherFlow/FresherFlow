import { getCompanySlug as resolveCompanySlug } from '@fresherflow/utils/slugify';

export function formatAllowedPassoutYears(years?: string[] | null): string {
    if (!years || years.length === 0) return 'Any';
    const sorted = [...years].map(Number).sort((a, b) => a - b).map(String);
    if (sorted.length <= 3) {
        return sorted.join(', ');
    }
    return `${sorted.slice(0, 3).join(', ')} +${sorted.length - 3}`;
}

const ACRONYMS = new Set([
    'sql', 'etl', 'iam', 'rbac', 'it', 'aws', 'gcp', 'api', 'db',
    'ui', 'ux', 'html', 'css', 'js', 'ts', 'rest', 'jwt', 'pwa'
]);

export function capitalizeSkill(skill: string | null | undefined): string {
    if (!skill) return '';
    return skill
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => {
            const lower = word.toLowerCase();
            if (ACRONYMS.has(lower)) {
                return lower.toUpperCase();
            }
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ');
}

/**
 * Company slug for `/companies/{slug}`, from the listing's website.
 *
 * Delegates to the shared resolver so the web and the API cannot disagree:
 * the slug is the company's domain word (`llt.com` -> `llt`), and the name is
 * only slugified when the URL says nothing usable. A local copy of this logic
 * used to treat ATS platforms as employers and disagreed with the directory.
 */
export function getCompanySlug(companyWebsite?: string | null, companyName?: string): string {
    return resolveCompanySlug(companyName || '', companyWebsite || null);
}
