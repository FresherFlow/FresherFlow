import type { SpaceNavItem } from './navSpaces';

type SearchParamsLike = Pick<URLSearchParams, 'get'> | null | undefined;

/**
 * Active-route matcher. Same rules as the previous sidebar:
 * query-bearing items match path + params (`?tab=dashboard` matches
 * a missing tab), `/jobs` matches only the unfiltered feed,
 * discovery roots match only without `?tab`, `exact` pins to the
 * path, everything else prefix-matches.
 */
export function isSpaceItemActive(
    item: Pick<SpaceNavItem, 'href' | 'exact'>,
    pathname: string,
    searchParams?: SearchParamsLike
): boolean {
    const [itemPath, itemQuery] = item.href.split('?');

    if (itemQuery) {
        const itemParams = new URLSearchParams(itemQuery);
        let match = true;
        itemParams.forEach((val, key) => {
            const currentVal = searchParams?.get(key);
            if (key === 'tab' && val === 'dashboard' && (!currentVal || currentVal === 'dashboard')) {
                return;
            }
            if (currentVal !== val) match = false;
        });
        return pathname === itemPath && match;
    }

    if (item.href === '/jobs') {
        return (
            pathname === '/jobs' &&
            !searchParams?.get('type') &&
            !searchParams?.get('mode') &&
            !searchParams?.get('source') &&
            !searchParams?.get('sort') &&
            !searchParams?.get('filter') &&
            !searchParams?.get('tab')
        );
    }

    if (item.href === '/companies') {
        return pathname === '/companies' && !searchParams?.get('tab');
    }

    if (item.href === '/account') {
        return pathname === '/account' && !searchParams?.get('tab');
    }

    if (item.href === '/community') {
        return pathname === '/community' && !searchParams?.get('tab');
    }

    if (item.href === '/admin/discovery' || item.href === '/discovery') {
        return pathname === item.href && !searchParams?.get('tab');
    }

    if (item.exact) {
        return pathname === item.href;
    }

    return pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/'));
}
