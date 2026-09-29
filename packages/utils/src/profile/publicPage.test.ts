import { describe, expect, it } from 'vitest';
import {
    PROFILE_BOOST_DAYS,
    getProfilePageState,
    isProfilePagePublished,
    profileBoostEndsAt,
    profileBoostSince,
} from './publicPage.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-09-21T12:00:00.000Z');

function publishedDaysAgo(days: number) {
    return new Date(NOW.getTime() - days * MS_PER_DAY);
}

describe('public page reachability', () => {
    it('is unreachable only before the first publication', () => {
        expect(isProfilePagePublished(null)).toBe(false);
        expect(isProfilePagePublished(undefined)).toBe(false);
        expect(isProfilePagePublished('not-a-date')).toBe(false);
        expect(getProfilePageState(null, NOW).status).toBe('draft');
    });

    it('stays reachable forever once published, however long ago that was', () => {
        for (const days of [0, 3, PROFILE_BOOST_DAYS, 30, 3650]) {
            expect(isProfilePagePublished(publishedDaysAgo(days))).toBe(true);
            expect(getProfilePageState(publishedDaysAgo(days), NOW).isPublished).toBe(true);
        }
    });

    it('accepts ISO strings, matching what a JSON API returns', () => {
        expect(isProfilePagePublished(NOW.toISOString())).toBe(true);
    });
});

describe('boost window', () => {
    it('reports a freshly published page as boosted for the full window', () => {
        const state = getProfilePageState(NOW, NOW);
        expect(state.status).toBe('live');
        expect(state.isBoosted).toBe(true);
        expect(state.daysLeft).toBe(PROFILE_BOOST_DAYS);
    });

    it('flags the last warning days as lapsing', () => {
        const state = getProfilePageState(publishedDaysAgo(5.5), NOW);
        expect(state.status).toBe('lapsing');
        expect(state.isBoosted).toBe(true);
        expect(state.daysLeft).toBe(2);
    });

    it('drops the boost exactly at the window boundary without unpublishing', () => {
        const state = getProfilePageState(publishedDaysAgo(PROFILE_BOOST_DAYS), NOW);
        expect(state.status).toBe('unboosted');
        expect(state.isBoosted).toBe(false);
        expect(state.daysLeft).toBe(0);
        // The page itself is untouched — that is the whole point of the split.
        expect(state.isPublished).toBe(true);
    });

    it('never re-publishes from an old stamp, only from a fresh one', () => {
        expect(getProfilePageState(publishedDaysAgo(30), NOW).status).toBe('unboosted');
        expect(getProfilePageState(NOW, NOW).status).toBe('live');
    });

    it('derives the directory cutoff as the tail of the window', () => {
        const since = profileBoostSince(NOW);
        expect(since.getTime()).toBe(NOW.getTime() - PROFILE_BOOST_DAYS * MS_PER_DAY);
        expect(getProfilePageState(new Date(since.getTime() - 1), NOW).isBoosted).toBe(false);
        expect(getProfilePageState(new Date(since.getTime() + 1), NOW).isBoosted).toBe(true);
    });

    it('reports the boost end instant for the response payload', () => {
        expect(profileBoostEndsAt(NOW).getTime()).toBe(
            NOW.getTime() + PROFILE_BOOST_DAYS * MS_PER_DAY
        );
    });
});
