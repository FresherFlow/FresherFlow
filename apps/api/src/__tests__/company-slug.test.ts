import { describe, it, expect } from 'vitest';
import { getCompanySlug } from '@fresherflow/utils';
import { FeedGeneratorService } from '../infrastructure/services/opportunity/feedGenerator.service';
import { CompanyDirectoryService } from '../infrastructure/services/opportunity/companyDirectory.service';

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

    it('reads the registrable domain across multi-part public suffixes', () => {
        // The old two-label rule produced `ac`, `com`, `gov` and `ab` here.
        expect(getCompanySlug('ALLEN Career Institute', 'https://www.allen.ac.in')).toBe('allen');
        expect(getCompanySlug('Westpac Group', 'https://www.westpac.com.au')).toBe('westpac');
        expect(getCompanySlug('CSIT', 'https://www.csit.gov.sg')).toBe('csit');
        expect(getCompanySlug('County of Grande Prairie', 'https://www.countygp.ab.ca')).toBe('countygp');
    });

    it('takes the employer from a path-routed ATS board', () => {
        // `jobs.lever.co` names the platform, not the employer; the old code
        // slugged every Lever customer as `lever`.
        expect(getCompanySlug('Northwind', 'https://jobs.lever.co/northwind')).toBe('northwind');
        expect(getCompanySlug('Northwind', 'https://boards.greenhouse.io/northwind')).toBe('northwind');
    });

    it('takes the tenant off a Workday shard host', () => {
        expect(getCompanySlug('Acme', 'https://acme.wd3.myworkdayjobs.com/en-US/acme')).toBe('acme');
    });

    it('never uses a job board or social profile as the employer', () => {
        expect(getCompanySlug('Acme Corp', 'https://www.linkedin.com/company/acme')).toBe('acme');
        expect(getCompanySlug('Acme Corp', 'https://www.naukri.com/acme-jobs')).toBe('acme');
    });
});

describe('company directory', () => {
    it('collapses every spelling of a company into one domain entry', () => {
        const directory = CompanyDirectoryService.build([
            { company: 'PwC', companyWebsite: 'https://www.pwc.com' },
            { company: 'PwC India', companyWebsite: 'https://www.pwc.in' },
            { company: 'PricewaterhouseCoopers Services LLP', companyWebsite: 'https://www.pwc.com' },
        ]);

        expect(directory.entries).toHaveLength(1);
        expect(directory.entries[0].slug).toBe('pwc');
        // Every spelling resolves to the one canonical entry, so the shard
        // upload writes `companies/pwc.json` once instead of three times.
        for (const name of ['PwC', 'PwC India', 'PricewaterhouseCoopers Services LLP']) {
            expect(directory.byName.get(name.toLowerCase())?.slug).toBe('pwc');
        }
    });

    it('slugs a name-variant company from its domain, not its legal name', () => {
        const directory = CompanyDirectoryService.build([
            { company: 'Electronic Arts (EA)', companyWebsite: 'https://www.ea.com' },
        ]);

        expect(directory.entries[0].slug).toBe('ea');
    });

    it('recovers the domain from a logo URL when the listing has no website', () => {
        const directory = CompanyDirectoryService.build([
            { company: 'Acme Corp', companyWebsite: null, companyLogoUrl: 'https://logo.clearbit.com/acme.com' },
        ]);

        expect(directory.entries[0].slug).toBe('acme');
        expect(directory.entries[0].url).toBe('https://acme.com');
    });

    it('keeps the published slug when a company still has no usable domain', () => {
        const directory = CompanyDirectoryService.build(
            [{ company: 'Acme Trace Systems' }],
            [{ name: 'Acme Trace Systems', url: null, logo_url: null, slug: 'acme-trace' }],
        );

        expect(directory.entries[0].slug).toBe('acme-trace');
    });

    it('re-slugs a name-derived entry once the company gains a domain', () => {
        const directory = CompanyDirectoryService.build(
            [{ company: 'Electronic Arts (EA)', companyWebsite: 'https://www.ea.com' }],
            [{ name: 'Electronic Arts (EA)', url: null, logo_url: null, slug: 'electronic-arts-ea' }],
        );

        expect(directory.entries[0].slug).toBe('ea');
    });
});