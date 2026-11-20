import { describe, expect, it } from 'vitest';
import { splitSubmittedLocations } from './normalization.js';

describe('splitSubmittedLocations', () => {
    it('leaves a single city untouched', () => {
        expect(splitSubmittedLocations({ location: 'Hyderabad' })).toEqual(['Hyderabad']);
    });

    it('splits several cities joined with "and"', () => {
        expect(splitSubmittedLocations({ location: 'Hyderabad and Bangalore' })).toEqual([
            'Hyderabad',
            'Bangalore',
        ]);
    });

    it('splits comma, semicolon, pipe and ampersand forms', () => {
        expect(splitSubmittedLocations({ location: 'Hyderabad, Bangalore; Pune | Noida & Delhi' })).toEqual([
            'Hyderabad',
            'Bangalore',
            'Pune',
            'Noida',
            'Delhi',
        ]);
    });

    it('merges the array alias with the single alias and dedupes case-insensitively', () => {
        expect(
            splitSubmittedLocations({ locations: ['Hyderabad', 'bangalore'], location: 'BANGALORE' }),
        ).toEqual(['Hyderabad', 'bangalore']);
    });

    it('caps the result at the listing limit', () => {
        const many = Array.from({ length: 20 }, (_, index) => `City ${index + 1}`).join(', ');
        expect(splitSubmittedLocations({ location: many })).toHaveLength(15);
    });

    it('returns nothing when nothing usable was sent', () => {
        expect(splitSubmittedLocations({ location: '  ,  ; ' })).toEqual([]);
        expect(splitSubmittedLocations({})).toEqual([]);
    });
});
