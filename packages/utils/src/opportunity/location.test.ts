import { describe, expect, it } from 'vitest';
import { Country } from '@fresherflow/constants';
import { formatLocationText, normalizeLocationLabels } from './location';

const labelsOf = (locations: string[] | null | undefined): string[] =>
    normalizeLocationLabels(locations).map((entry) => entry.label);

describe('normalizeLocationLabels', () => {
    it('collapses a label already contained in a fuller one', () => {
        expect(labelsOf(['Bengaluru, Karnataka, India', 'Bengaluru'])).toEqual(['Bengaluru, Karnataka']);
    });

    it('folds a legacy comma-split row back into one label', () => {
        expect(labelsOf(['Bengaluru', 'Karnataka', 'India'])).toEqual(['Bengaluru, Karnataka']);
    });

    it('omits a country shared by every entry', () => {
        const labels = labelsOf([
            'Bengaluru, Karnataka, India',
            'Mumbai, Maharashtra, India',
        ]);

        expect(labels).toEqual(['Bengaluru, Karnataka', 'Mumbai, Maharashtra']);
        for (const label of labels) {
            expect(label).not.toContain(', India');
        }
    });

    it('retains the country when the entries disagree', () => {
        const homeCountry = normalizeLocationLabels(['Bengaluru, Karnataka, India'])[0]?.country;
        const otherCountry = Country.getAllCountries().find((country) => country.name !== homeCountry);
        expect(otherCountry).toBeDefined();

        const labels = labelsOf(['Bengaluru, Karnataka, India', otherCountry!.name]);

        expect(labels).toEqual(['Bengaluru, Karnataka, India', otherCountry!.name]);
    });

    it('maps a remote value to a single Remote label', () => {
        expect(labelsOf(['Remote'])).toEqual(['Remote']);
        expect(normalizeLocationLabels(['Remote'])[0]?.isRemote).toBe(true);
        expect(formatLocationText(['Remote'])).toBe('Remote');
    });

    it('never invents a country or returns empty labels', () => {
        expect(normalizeLocationLabels()).toEqual([]);
        expect(normalizeLocationLabels(null)).toEqual([]);
        expect(normalizeLocationLabels([])).toEqual([]);
        expect(formatLocationText([])).toBe('');
        expect(formatLocationText(['Bengaluru, Karnataka, India'])).toBe('Bengaluru, Karnataka');
    });

    it('caps the rendered label count', () => {
        expect(formatLocationText(['Bengaluru, Karnataka, India', 'Mumbai, Maharashtra, India'], { max: 1 }))
            .toBe('Bengaluru, Karnataka +');
    });
});
