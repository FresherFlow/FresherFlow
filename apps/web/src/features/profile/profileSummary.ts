/**
 * Non-UI code for the summary card at the top of the profile page.
 *
 * Turns auth state, the cached profile and the public-page activation state into one
 * view-model. The card renders it; nothing about naming, counting or page status is decided in
 * JSX.
 */
import type { Profile, User } from '@fresherflow/types';
import { calculateProfileCompletion, type ProfilePageState } from '@fresherflow/utils';
import { countChecklist, getProfileChecklist, type ProfileChecklistItem } from '@/features/profile/profileChecklist';

export type PageTone = 'live' | 'expiring' | 'offline' | 'draft';

export interface PublicPageSummary {
    tone: PageTone;
    label: string;
    isLive: boolean;
    /** Present once a username is claimed, whether or not the page is currently live. */
    url: string | null;
}

export interface ProfileSummary {
    displayName: string;
    handle: string | null;
    initial: string;
    avatarUrl: string | null;
    email: string | null;
    completion: number;
    checklist: ProfileChecklistItem[];
    remaining: ProfileChecklistItem[];
    doneCount: number;
    totalCount: number;
    page: PublicPageSummary;
}

/**
 * The 7-day activation window in words a person can act on.
 *
 * "Expiring" is the important one: it is a day from going dark, and the only state where the
 * owner has something to do before the link stops working.
 */
export function describePageState(state: ProfilePageState): Omit<PublicPageSummary, 'url'> {
    if (state.status === 'live') {
        return { tone: 'live', label: 'Live', isLive: true };
    }
    if (state.status === 'expiring') {
        const days = state.daysLeft;
        return {
            tone: 'expiring',
            label: days <= 1 ? 'Goes offline in under a day' : `Goes offline in ${days} days`,
            isLive: true,
        };
    }
    if (state.status === 'expired') {
        return { tone: 'offline', label: 'Offline — activation lapsed', isLive: false };
    }
    return { tone: 'draft', label: 'Not activated yet', isLive: false };
}

export function buildProfileSummary({
    user,
    profile,
    pageState,
    pagePath,
}: {
    user: User | null;
    profile: Profile | null;
    pageState: ProfilePageState;
    pagePath: string | null;
}): ProfileSummary {
    const checklist = getProfileChecklist(profile);
    const { done, total } = countChecklist(checklist);

    const name = user?.fullName || user?.username || 'Your name';
    const status = describePageState(pageState);

    return {
        displayName: name,
        handle: user?.username ? `@${user.username}` : null,
        initial: (user?.fullName?.[0] || user?.username?.[0] || 'U').toUpperCase(),
        avatarUrl: profile?.avatarUrl ?? null,
        email: user?.email ?? null,
        completion: calculateProfileCompletion(profile).percentage,
        checklist,
        remaining: checklist.filter((item) => !item.done),
        doneCount: done,
        totalCount: total,
        page: { ...status, url: pagePath },
    };
}
