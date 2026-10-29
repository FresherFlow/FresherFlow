import { describe, it, expect } from 'vitest';
import { getCompanySlug } from '@fresherflow/utils';
import { FeedGeneratorService } from '../infrastructure/services/opportunity/feedGenerator.service';

/**
 * Guards the two rules that keep /companies/{slug} stable:
 *
 *  1. A company slug comes from its domain word, not its registration string.
 *     `LLT India Pvt Ltd` publishing from `llt.com` must be `/companies/llt`,
 *     never `/companies/llt-india-pvt-ltd`.
 *  2. FeedGeneratorService.getCompanySlug must use the same domain-aware
 *     derivation. It used to fall back to a raw name slugify, which is how
 *     `llt-india-pvt-ltd` reached the shard upload and the sitemap in the
 *     first place.
 */
describe('company slug derivation', () => {
    it('prefers the domain word over the legal name', () => {
        expect(getCompanySlug('LLT India Pvt Ltd', 'https://llt.com')).toBe('llt');
    });

    it('strips legal suffixes when there is no usable URL', () => {
        expect(getCompanySlug('LLT India Pvt Ltd', null)).toBe('llt');
    });

    it('takes the subdomain off an ATS host', () => {
        expect(getCompanySlug('Acme Corp', 'https://acme.lever.co')).toBe('acme');
    });

    it('falls back to the name when the URL is unparseable', () => {
        expect(getCompanySlug('Infosys Limited', 'not a url')).toBe('infosys');
    });

    it('FeedGeneratorService does not emit a name slug when a website is known', () => {
        // Empty slug map: the directory has never seen this company, which is
        // exactly the branch that used to produce the bad slug.
        expect(FeedGeneratorService.getCompanySlug('LLT India Pvt Ltd', 'https://llt.com')).toBe('llt');
    });

    it('FeedGeneratorService still handles a company with no website', () => {
        expect(FeedGeneratorService.getCompanySlug('LLT India Pvt Ltd', null)).toBe('llt');
    });

    it('returns empty for an empty company name', () => {
        expect(FeedGeneratorService.getCompanySlug('', null)).toBe('');
    });
});