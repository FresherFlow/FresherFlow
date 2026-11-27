import { describe, expect, it } from 'vitest';
import { resolveWalkinCenter, haversineKm, rankWalkins } from './walkinRanking.js';

const drive = (overrides: Record<string, unknown> = {}) => ({
    id: 'drive',
    latitude: null as number | null,
    longitude: null as number | null,
    city: 'Hyderabad' as string | null,
    dates: ['2026-12-10'] as string[],
    ...overrides,
});

describe('walk-in ranking', () => {
    it('uses explicit coordinates before cluster or city fallback', () => {
        const center = resolveWalkinCenter({ city: 'Hyderabad', latitude: 17.4, longitude: 78.4 });
        expect(center.source).toBe('coords');
        expect(center.latitude).toBe(17.4);
    });

    it('ignores a half-specified coordinate pair', () => {
        const center = resolveWalkinCenter({ city: 'Hyderabad', latitude: 17.4 });
        expect(center.source).not.toBe('coords');
        expect(center.source).toBe('city');
    });

    it('haversineKm is symmetric and returns zero for the same point', () => {
        const a = { latitude: 17.4474, longitude: 78.3762 };
        const b = { latitude: 17.4401, longitude: 78.3489 };
        expect(haversineKm(a, a)).toBe(0);
        expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 10);
    });

    it('a drive with exact venue coordinates outranks a city-fallback drive', () => {
        const ranked = rankWalkins(
            [
                drive({ id: 'exact', latitude: 17.4474, longitude: 78.3762 }),
                drive({ id: 'fallback' }),
            ],
            { city: 'Hyderabad', latitude: 17.4475, longitude: 78.3763 },
        );
        expect(ranked.map((r) => r.id)).toEqual(['exact', 'fallback']);
        expect(ranked[1].distanceKm).toBeNull();
    });

    it('an undated drive ranks after a dated drive', () => {
        const ranked = rankWalkins(
            [drive({ id: 'undated', dates: [] }), drive({ id: 'dated', dates: ['2026-12-10'] })],
            { city: 'Hyderabad' },
        );
        expect(ranked.map((r) => r.id)).toEqual(['dated', 'undated']);
    });

    it('one profile match adds a reason without inventing eligibility', () => {
        const [ranked] = rankWalkins(
            [drive({ allowedPassoutYears: [2026] })],
            { city: 'Hyderabad' },
            { passoutYear: 2026 },
        );
        expect(ranked.matchReasons).toContain('2026 batch eligible');
        expect(ranked.matchReasons.some((reason) => reason.includes('degree'))).toBe(false);
    });

    it('a past drive date scores lower than a future drive date', () => {
        const ranked = rankWalkins(
            [drive({ id: 'past', dates: ['2020-01-01'] }), drive({ id: 'future', dates: [new Date(Date.now() + 86400000).toISOString()] })],
            { city: 'Hyderabad' },
        );
        expect(ranked[0].id).toBe('future');
        expect(ranked[1].matchReasons).toContain('dates passed');
    });
});
