import { describe, expect, it } from 'vitest';
import {
    PROFILE_PAGE_ACTIVE_DAYS,
    getProfilePageState,
    isProfilePageActive,
    profilePageActiveSince,
    profilePageExpiresAt,
} from './publicPage.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-09-21T12:00:00.000Z');

function activatedDaysAgo(days: number) {
    return new Date(NOW.getTime() - days * MS_PER_DAY);
}

describe('public page activation', () => {
    it('treats a never-activated page as a draft', () => {
        expect(getProfilePageState(null, NOW)).toEqual({ status: 'draft', daysLeft: 0, expiresAt: null });
        expect(isProfilePageActive(null, NOW)).toBe(false);
        expect(isProfilePageActive(undefined, NOW)).toBe(false);
    });

    it('reports a freshly activated page as live with the full window left', () => {
        const state = getProfilePageState(NOW, NOW);
        expect(state.status).toBe('live');
        expect(state.daysLeft).toBe(PROFILE_PAGE_ACTIVE_DAYS);
        expect(isProfilePageActive(NOW, NOW)).toBe(true);
    });

    it('stays live through the middle of the window', () => {
        const state = getProfilePageState(activatedDaysAgo(3), NOW);
        expect(state.status).toBe('live');
        expect(state.daysLeft).toBe(4);
    });

    it('flags the last warning days as expiring', () => {
        const state = getProfilePageState(activatedDaysAgo(5.5), NOW);
        expect(state.status).toBe('expiring');
        expect(state.daysLeft).toBe(2);
        expect(isProfilePageActive(activatedDaysAgo(5.5), NOW)).toBe(true);
    });

    it('goes dark exactly at the window boundary', () => {
        const state = getProfilePageState(activatedDaysAgo(PROFILE_PAGE_ACTIVE_DAYS), NOW);
        expect(state.status).toBe('expired');
        expect(state.daysLeft).toBe(0);
        expect(isProfilePageActive(activatedDaysAgo(PROFILE_PAGE_ACTIVE_DAYS), NOW)).toBe(false);
    });

    it('stays dark well past the window', () => {
        expect(getProfilePageState(activatedDaysAgo(30), NOW).status).toBe('expired');
        expect(isProfilePageActive(activatedDaysAgo(30), NOW)).toBe(false);
    });

    it('accepts ISO strings, matching what a JSON API returns', () => {
        const iso = activatedDaysAgo(1).toISOString();
        const state = getProfilePageState(iso, NOW);
        expect(state.status).toBe('live');
        expect(state.daysLeft).toBe(6);
    });

    it('ignores an unparseable timestamp instead of crashing', () => {
        expect(getProfilePageState('not-a-date', NOW).status).toBe('draft');
    });

    it('derives the database cutoff as the tail of the window', () => {
        const since = profilePageActiveSince(NOW);
        expect(since.getTime()).toBe(NOW.getTime() - PROFILE_PAGE_ACTIVE_DAYS * MS_PER_DAY);
        // Anything older than the cutoff is dark; anything newer is not.
        expect(getProfilePageState(new Date(since.getTime() - 1), NOW).status).toBe('expired');
        expect(getProfilePageState(new Date(since.getTime() + 1), NOW).status).not.toBe('expired');
    });

    it('reports the expiry instant for the response payload', () => {
        expect(profilePageExpiresAt(NOW).getTime()).toBe(NOW.getTime() + PROFILE_PAGE_ACTIVE_DAYS * MS_PER_DAY);
    });
});
