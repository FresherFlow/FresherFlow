/**
 * Non-UI code for the public page status shown in the editor and on /account.
 *
 * Two facts, deliberately separate, because collapsing them is what made this feature
 * confusing:
 *
 *  - **Reachability** is publication, and publication is permanent. Once the page is
 *    published it can be crawled, cached and copied, so nothing here models a
 *    `PRIVATE`/`UNLISTED` axis or offers a "make it private again" action that could not
 *    keep its promise. `fresherflow.in/u/<handle>` keeps working.
 *  - **Boost** is promotion, and promotion does lapse. Published a while ago and never
 *    re-boosted means the profile drops out of the recruiter directory — its URL is
 *    untouched, it just stops being actively surfaced. That is the only renewable state,
 *    and it is why "Reactivate" became "Re-boost".
 */
import type { ProfilePageState } from '@fresherflow/utils';

export type PageTone = 'live' | 'lapsing' | 'unboosted' | 'draft';

/** The one thing the owner can do next about `fresherflow.in/u/<handle>`. */
export type PublicPageAction = 'activate' | 'boost' | 'none';

export interface PublicPageSummary {
    tone: PageTone;
    label: string;
    /** True while the link resolves — every published page, boosted or not. */
    isLive: boolean;
    /** True while the profile is promoted in the recruiter directory. */
    isBoosted: boolean;
    action: PublicPageAction;
    /** Present once a username is claimed, whether or not the page is published. */
    url: string | null;
}

/** Button text for a public-page action — one copy of it, shared by both surfaces. */
export function pageActionLabel(action: Exclude<PublicPageAction, 'none'>): string {
    return action === 'activate' ? 'Publish page' : 'Re-boost';
}

export function pageActionBusyLabel(action: Exclude<PublicPageAction, 'none'>): string {
    return action === 'activate' ? 'Publishing…' : 'Re-boosting…';
}

/**
 * The boost window in words a person can act on.
 *
 * `lapsing` is the useful one: the page is fine, but the promotion ends in a day or two and
 * that is the only state where doing something changes the outcome.
 */
export function describePageState(state: ProfilePageState): Omit<PublicPageSummary, 'url'> {
    if (state.status === 'unboosted') {
        return {
            tone: 'unboosted',
            label: 'Live · boost ended',
            isLive: true,
            isBoosted: false,
            action: 'boost',
        };
    }

    if (state.status === 'lapsing') {
        const days = state.daysLeft;
        return {
            tone: 'lapsing',
            label: days <= 1 ? 'Live · boost ends today' : `Live · boost ends in ${days} days`,
            isLive: true,
            isBoosted: true,
            action: 'boost',
        };
    }

    if (state.status === 'live') {
        return {
            tone: 'live',
            label: `Live · boosted for ${state.daysLeft} ${state.daysLeft === 1 ? 'day' : 'days'}`,
            isLive: true,
            isBoosted: true,
            action: 'none',
        };
    }

    return { tone: 'draft', label: 'Not published yet', isLive: false, isBoosted: false, action: 'activate' };
}
