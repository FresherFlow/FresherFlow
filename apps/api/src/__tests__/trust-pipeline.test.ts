import { describe, it, expect } from 'vitest';

import { mapCategoryFromText } from '../application/ingestion/categoryMap';
import { normalizeRawItem } from '../application/ingestion/normalize';
import { domainTierForLink } from '../application/trust/domainReputation';
import {
    assertListingTrust,
    canTransitionTrust,
    clampTrustScore,
    trustScoreDelta,
} from '../application/trust/trustState';
import type { RawItem } from '../application/ingestion/types';

function makeItem(overrides: Partial<RawItem> = {}): RawItem {
    return {
        sourceExternalId: 'job-1',
        title: 'Backend Engineer',
        company: 'Acme Corp',
        sourceLink: 'https://acme.com/careers/backend',
        applyLink: 'https://acme.com/apply/1',
        description: 'Build things.',
        locations: ['Bengaluru'],
        requiredSkills: [],
        allowedDegrees: [],
        allowedCourses: [],
        allowedSpecializations: [],
        allowedPassoutYears: [],
        raw: {},
        ...overrides,
    };
}

describe('mapCategoryFromText', () => {
    it('maps hackathon listings to COMPETITION', () => {
        expect(mapCategoryFromText('Smart India Hackathon 2026', 'Build in 36 hours')).toBe('COMPETITION');
    });

    it('maps scholarship text to SCHOLARSHIP', () => {
        expect(mapCategoryFromText('Merit Scholarship for girls', 'Tuition waiver')).toBe('SCHOLARSHIP');
    });

    it('maps webinar text to EVENT', () => {
        expect(mapCategoryFromText('Career fair webinar', 'Join the live session')).toBe('EVENT');
    });

    it('returns null when nothing matches', () => {
        expect(mapCategoryFromText('Backend Engineer', 'Java and Spring')).toBeNull();
    });

    it('returns null for empty input', () => {
        expect(mapCategoryFromText('', '')).toBeNull();
        expect(mapCategoryFromText(null, undefined)).toBeNull();
    });
});

describe('normalize category inference (Phase 13)', () => {
    it('infers COMPETITION when the feed sends no category', () => {
        const result = normalizeRawItem(
            makeItem({ title: 'Hackathon finals', description: 'National-level hackathon', category: undefined }),
            { defaultCategory: 'EMPLOYMENT' as never }
        );
        expect(result.ok).toBe(true);
        expect(result.draft?.category).toBe('COMPETITION');
    });

    it('uses the source default when nothing matches', () => {
        const result = normalizeRawItem(makeItem({ category: undefined }), {
            defaultCategory: 'SCHOLARSHIP' as never,
        });
        expect(result.draft?.category).toBe('SCHOLARSHIP');
    });

    it('fills the company from the source fallback and flags it', () => {
        const result = normalizeRawItem(makeItem({ company: '' }), { fallbackCompany: 'Acme Boards' });
        expect(result.ok).toBe(true);
        expect(result.draft?.company).toBe('Acme Boards');
        expect(result.reasonFlags).toContain('company_inferred');
    });

    it('still rejects when neither company nor fallback exists', () => {
        const result = normalizeRawItem(makeItem({ company: '' }));
        expect(result.ok).toBe(false);
        expect(result.reasonFlags).toContain('missing_company');
    });
});

describe('domainTierForLink (Phase 14)', () => {
    it('treats ATS hosts as official', () => {
        expect(domainTierForLink('https://acme.wd1.myworkdayjobs.com/wday/cxs/acme/jobs')).toBe('official_ats');
        expect(domainTierForLink('https://boards-api.greenhouse.io/v1/boards/acme/jobs')).toBe('official_ats');
        expect(domainTierForLink('https://api.lever.co/v0/postings/acme?mode=json')).toBe('official_ats');
    });

    it('does not trust a lookalike subdomain', () => {
        expect(domainTierForLink('https://greenhouse.io.evil.com/jobs')).toBe('unknown');
    });

    it('does not trust a query-string smuggle', () => {
        expect(domainTierForLink('https://evil.com/?x=greenhouse.io')).toBe('unknown');
    });

    it('marks shorteners and unparseable links suspicious', () => {
        expect(domainTierForLink('https://bit.ly/abc123')).toBe('suspicious');
        expect(domainTierForLink('not-a-url')).toBe('suspicious');
        expect(domainTierForLink(null)).toBe('suspicious');
    });
});

describe('listing trust state (Phase 14)', () => {
    it('refuses to write a user trust level onto a listing', () => {
        expect(() => assertListingTrust('BANNED')).toThrow();
        expect(() => assertListingTrust('CONTRIBUTOR')).toThrow();
        expect(() => assertListingTrust('MODERATOR')).toThrow();
        expect(() => assertListingTrust('NEW')).toThrow();
    });

    it('accepts every listing trust level', () => {
        for (const level of ['UNVERIFIED', 'COMMUNITY_REPORTED', 'VERIFIED', 'FLAGGED', 'REJECTED']) {
            expect(assertListingTrust(level)).toBe(level);
        }
    });

    it('allows report -> review -> recover transitions', () => {
        expect(canTransitionTrust('UNVERIFIED', 'COMMUNITY_REPORTED')).toBe(true);
        expect(canTransitionTrust('COMMUNITY_REPORTED', 'VERIFIED')).toBe(true);
        expect(canTransitionTrust('FLAGGED', 'VERIFIED')).toBe(true);
        expect(canTransitionTrust('REJECTED', 'UNVERIFIED')).toBe(true);
    });

    it('blocks REJECTED -> VERIFIED without re-review', () => {
        expect(canTransitionTrust('REJECTED', 'VERIFIED')).toBe(false);
        expect(canTransitionTrust('REJECTED', 'FLAGGED')).toBe(false);
    });

    it('clamps trust scores into 0..100', () => {
        expect(clampTrustScore(50 + trustScoreDelta('official_verified'))).toBe(75);
        expect(clampTrustScore(200)).toBe(100);
        expect(clampTrustScore(-20)).toBe(0);
        expect(clampTrustScore(Number.NaN)).toBe(50);
    });
});
