import { slugify } from '@fresherflow/utils/slugify';

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

export function getCompanySlug(companyWebsite?: string | null, companyName?: string): string {
    if (companyWebsite) {
        try {
            const raw = companyWebsite.trim();
            const withProtocol = raw.startsWith('http') ? raw : `https://${raw}`;
            const hostname = new URL(withProtocol).hostname
                .toLowerCase()
                .replace(/^www\./i, '')
                .replace(/^(careers|jobs|talent|work|apply|hr)\./i, '');
            const parts = hostname.split('.');
            const main = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
            if (main && main.length > 1) return main;
        } catch {}
    }
    return slugify(companyName || '');
}
