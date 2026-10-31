import { describe, expect, it } from 'vitest';
import { buildSocialCaption } from './social';

// Locks the live bot voice: this exact shape is what posts on LinkedIn today.
// Any edit that changes these strings changes production posts.
describe('buildSocialCaption', () => {
    it('matches the live LinkedIn post shape (Twin Health case)', () => {
        const text = buildSocialCaption(
            {
                company: 'Twin Health',
                title: 'Tele caller/Tele sales - Hindi',
                locations: ['Chennai'],
                applyLink: 'https://boards.greenhouse.io/twinhealth/jobs/12345',
            },
            'linkedin',
            'Greenhouse',
        );
        expect(text).toBe(
            'Twin Health is hiring Tele caller/Tele sales - Hindi.\n\n' +
                'Chennai · Apply on Greenhouse:\n' +
                'https://boards.greenhouse.io/twinhealth/jobs/12345\n\n' +
                'Know someone looking? Tag them below.',
        );
    });

    it('falls back to bare Apply: without a destination', () => {
        const text = buildSocialCaption(
            { title: 'Software Engineer', company: 'Acme', locations: [], applyLink: 'https://example.com/j/1' },
            'linkedin',
        );
        expect(text).toBe(
            'Acme is hiring Software Engineer.\n\nApply:\nhttps://example.com/j/1\n\nKnow someone looking? Tag them below.',
        );
    });

    it('keeps telegram free of the tag CTA', () => {
        const text = buildSocialCaption(
            {
                company: 'Twin Health',
                title: 'Tele caller/Tele sales - Hindi',
                locations: ['Chennai'],
                applyLink: 'https://boards.greenhouse.io/twinhealth/jobs/12345',
            },
            'telegram',
            'Greenhouse',
        );
        expect(text).toBe(
            'Twin Health is hiring Tele caller/Tele sales - Hindi.\n\n' +
                'Chennai · Apply on Greenhouse:\n' +
                'https://boards.greenhouse.io/twinhealth/jobs/12345',
        );
    });

    it('collapses a duplicate location and drops the shared country', () => {
        const text = buildSocialCaption(
            {
                company: 'Twin Health',
                title: 'Data Analyst',
                locations: ['Bengaluru, Karnataka, India', 'Bengaluru'],
                applyLink: 'https://boards.greenhouse.io/twinhealth/jobs/99999',
            },
            'linkedin',
            'Workday',
        );
        expect(text).toBe(
            'Twin Health is hiring Data Analyst.\n\n' +
                'Bengaluru, Karnataka · Apply on Workday:\n' +
                'https://boards.greenhouse.io/twinhealth/jobs/99999\n\n' +
                'Know someone looking? Tag them below.',
        );
        expect(text).not.toContain(' / Bengaluru');
        expect(text).not.toContain(', India');
    });

    it('fits X within budget with the apply link last', () => {
        const text = buildSocialCaption(
            { title: 'Software Engineer Trainee', company: 'Cisco', locations: ['Bangalore'], applyLink: 'https://careers.cisco.com/j/1' },
            'x',
            'the company website',
        );
        expect(text).toBe(
            'Cisco is hiring Software Engineer Trainee (Bangalore)\n\nApply on the company website:\nhttps://careers.cisco.com/j/1',
        );
    });
});
