/**
 * Shared header content logic, extracted from TopHeaderBar.tsx and
 * site-header.tsx, which each carried a full copy of the same
 * `formatSegment` / `LABEL_OVERRIDES` / admin-title / feed-route rules.
 *
 * Pure functions only — no React, no hooks — so either header can import it.
 */

const LABEL_OVERRIDES: Record<string, string> = {
    'govt': 'Government Jobs',
    'walkins': 'Walk-ins',
    'walk-ins': 'Walk-ins',
};

export function formatSegment(segment: string): string {
    const lowerSegment = segment.toLowerCase();
    if (LABEL_OVERRIDES[lowerSegment]) {
        return LABEL_OVERRIDES[lowerSegment];
    }
    return segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

/** `['admin','opportunities']` → `'Listings'`. Non-admin paths → `''`. */
export function getAdminTitle(segments: string[]): string {
    const adminPage = segments[1] || 'overview';
    switch (adminPage) {
        case 'dashboard':
        case 'overview': return 'Admin Overview';
        case 'opportunities': return 'Listings';
        case 'resources': return 'Resources';
        case 'push': return 'Push Notifications';
        case 'captions': return 'Captions';
        case 'feedback': return 'Feedback';
        case 'settings': return 'Settings';
        case 'discovery': return 'Discovery Engine';
        default: return formatSegment(adminPage);
    }
}

/**
 * Feed routes render the Home > X + search skeleton instead of a breadcrumb.
 */
export function isFeedHeaderRoute(segments: string[]): boolean {
    const first = segments[0];
    return (
        (first === 'jobs' && (segments.length === 1 || ['internships', 'walkins', 'walk-ins', 'remote'].includes(segments[1]))) ||
        (['govt', 'hackathons', 'resources'].includes(first) && segments.length === 1)
    );
}
