import { describe, expect, it } from 'vitest';
import { anchorDriveDates } from './walkin.js';
import { isPlausibleVenueAddress } from '@fresherflow/utils';
import type { ParsedWalkInDetails } from '@fresherflow/utils';

function details(overrides: Partial<ParsedWalkInDetails> = {}): ParsedWalkInDetails {
    return {
        dates: [],
        reportingTime: '9:30 AM',
        venueAddress: 'Building 1, Gachibowli, Hyderabad',
        requiredDocuments: [],
        ...overrides,
    };
}

describe('anchorDriveDates', () => {
    it('keeps dates that are still ahead of us', () => {
        const future = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
        const result = anchorDriveDates(details({ dates: [future] }));

        expect(result.dates).toEqual([future]);
    });

    it('keeps a drive whose parsed window has already passed, so it is born expired', () => {
        // The drive happened. Dropping the date would leave the listing with
        // no expiry at all, which is how a dead drive ends up on the live
        // feed. Keeping the past date lets the listing expire honestly.
        const past = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
        const result = anchorDriveDates(details({ dates: [past] }));

        expect(result.dates).toEqual([past]);
    });

    it('keeps only the dates that are still ahead of us', () => {
        const past = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
        const future = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
        const result = anchorDriveDates(details({ dates: [past, future] }));

        expect(result.dates).toEqual([future]);
    });

    it('anchors an undated drive to the extractor fallback expiry', () => {
        // `parseWalkInDetails` assigns "now + 3 days at 5:00 PM" when it finds
        // no date. An undated drive used to reach the feed with no date at
        // all, and a drive with no future date is never listed.
        const expiry = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
        const result = anchorDriveDates(details({ expiresAt: expiry }));

        expect(result.dates).toEqual([expiry]);
    });

    it('does not resurrect a drive whose parsed window has already passed', () => {
        const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const result = anchorDriveDates(details({ dates: [past], expiresAt: past }));

        expect(result.dates).toEqual([past]);
    });

    it('leaves the drive alone when there is no expiry to fall back on', () => {
        const result = anchorDriveDates(details());

        expect(result.dates).toEqual([]);
    });

    it('does not mutate the input', () => {
        const input = details({ dates: [] });
        anchorDriveDates(input);

        expect(input.dates).toEqual([]);
    });
});

/**
 * The venue gate.
 *
 * `parseWalkInDetails` falls back to the location string when the source has
 * no "Venue:" line, so every drive whose venue was not stated used to get a
 * city name as its venue. "Hyderabad" is 9 characters, so the old
 * `venueAddress.length >= 8` check let it through and the row was filed as a
 * drive with a synthetic venue, reporting time and document checklist.
 */
describe('isPlausibleVenueAddress', () => {
    it('rejects a bare city name', () => {
        // The exact shape of the 210 fabricated legacy walk-in rows.
        expect(isPlausibleVenueAddress('Hyderabad', 'Hyderabad')).toBe(false);
        expect(isPlausibleVenueAddress('Hyderabad')).toBe(false);
    });

    it('rejects a city name followed by its state', () => {
        expect(isPlausibleVenueAddress('Hyderabad, Telangana')).toBe(false);
        expect(isPlausibleVenueAddress('Bengaluru, Karnataka', 'Bengaluru')).toBe(false);
    });

    it('rejects a venue that is the detected city in a different case', () => {
        expect(isPlausibleVenueAddress('hyderabad', 'Hyderabad')).toBe(false);
        expect(isPlausibleVenueAddress('  HYDERABAD  ', 'Hyderabad')).toBe(false);
    });

    it('rejects a locality on its own', () => {
        expect(isPlausibleVenueAddress('Gachibowli')).toBe(false);
        expect(isPlausibleVenueAddress('Gachibowli, Hyderabad')).toBe(false);
    });

    it('rejects an empty or too-short venue', () => {
        expect(isPlausibleVenueAddress('')).toBe(false);
        expect(isPlausibleVenueAddress('Mumbai')).toBe(false);
        expect(isPlausibleVenueAddress(undefined)).toBe(false);
        expect(isPlausibleVenueAddress(null)).toBe(false);
    });

    it('accepts a real address', () => {
        expect(isPlausibleVenueAddress('Building 1, Gachibowli, Hyderabad')).toBe(true);
        expect(isPlausibleVenueAddress('Road No 12, Banjara Hills')).toBe(true);
        expect(isPlausibleVenueAddress('H.No 5-6, Ayyappa Reddy Layout')).toBe(true);
        expect(isPlausibleVenueAddress('Infosys Towers, Hinjewadi')).toBe(true);
    });

    it('accepts a venue that names the city alongside a place', () => {
        expect(isPlausibleVenueAddress('Hitec City Cyber Towers, Hyderabad')).toBe(true);
        expect(isPlausibleVenueAddress('2nd Floor, TCS Servery, Madhapur')).toBe(true);
    });
});
