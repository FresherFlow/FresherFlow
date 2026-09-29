// Kept outside MobileBottomTabs.tsx on purpose: files that mix component
// exports with plain helpers bail out of Fast Refresh, which leaves the
// mounted layout running stale code across client-side navigations.

/** Feed listings that live below the section root and keep the bar. */
const LISTING_CHILDREN: Record<string, Set<string>> = {
    '/jobs': new Set(['internships', 'remote', 'full-time', 'part-time', 'browse']),
    '/drives': new Set(['walk-in']),
};

/**
 * True for drill-in detail pages — job, board, company hub, post, room,
 * resource. Tab destinations sit at the section root (or ?tab=), so anything
 * deeper hides the bottom bar: no tab is active there and the bar collides
 * with sticky action bars (the job detail apply bar is also fixed bottom-0).
 * Admin owns its own bottom nav; its behavior is untouched here.
 */
export function isDetailRoute(pathname: string): boolean {
    if (pathname.startsWith('/admin')) return false;
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length < 2) return false;
    const [section, child] = segments;
    return !(LISTING_CHILDREN[`/${section}`]?.has(child) ?? false);
}
