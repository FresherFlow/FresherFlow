import { describe, it, expect } from 'vitest';

// Pure modules only: the normalizer, the SSRF guard, and the dedupe key
// helpers touch no database and no network, so they need no mocks. That is a
// deliberate property of the Phase 13 design, and this suite enforces it.
import {
    normalizeRawItem,
    parseSalaryToAnnualInr,
} from '../application/ingestion/normalize';
import { assertSafeEndpoint, UnsafeEndpointError } from '../application/ingestion/safeFetch';
import {
    canonicalizeLink,
    contentKey,
} from '../application/ingestion/dedupe';
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

describe('parseSalaryToAnnualInr', () => {
    const cases: Array<[string, number | null]> = [
        ['8 LPA', 800_000],
        ['8.5 lpa', 850_000],
        ['6-10 LPA', 600_000],
        ['12,00,000', 1_200_000],
        ['Rs. 15,00,000 per annum', 1_500_000],
        ['50000 per month', 600_000],
        ['1000000', 1_000_000],
        ['', null],
        ['competitive', null],
        ['negotiable', null],
    ];

    for (const [input, expected] of cases) {
        it(`parses ${JSON.stringify(input)} as ${expected}`, () => {
            expect(parseSalaryToAnnualInr(input)).toBe(expected);
        });
    }

    it('never returns a wrong number for unparseable text', () => {
        // A wrong salary is worse than a missing one, so anything unrecognized
        // must be null rather than a guess.
        expect(parseSalaryToAnnualInr('see job description')).toBeNull();
        expect(parseSalaryToAnnualInr('a'.repeat(200))).toBeNull();
        expect(parseSalaryToAnnualInr({})).toBeNull();
        expect(parseSalaryToAnnualInr(-5)).toBeNull();
    });
});

describe('normalizeRawItem', () => {
    it('rejects an item with no title', () => {
        const result = normalizeRawItem(makeItem({ title: '   ' }));
        expect(result.ok).toBe(false);
        expect(result.reasonFlags).toContain('missing_title');
    });

    it('rejects an item with no company', () => {
        const result = normalizeRawItem(makeItem({ company: '' }));
        expect(result.ok).toBe(false);
        expect(result.reasonFlags).toContain('missing_company');
    });

    it('keeps an item with a missing link but flags it', () => {
        const result = normalizeRawItem(
            makeItem({ sourceLink: null, applyLink: null }),
            { fallbackSourceLink: 'https://acme.com/careers' }
        );
        expect(result.ok).toBe(true);
        expect(result.draft?.sourceLink).toBe('https://acme.com/careers');
    });

    it('truncates an absurdly long title rather than rejecting it', () => {
        const result = normalizeRawItem(makeItem({ title: 'x'.repeat(5000) }));
        expect(result.ok).toBe(true);
        expect(result.draft?.title.length).toBe(200);
    });

    it('drops a javascript: link', () => {
        const result = normalizeRawItem(
            makeItem({ sourceLink: 'javascript:alert(1)', applyLink: 'https://acme.com/apply' })
        );
        expect(result.draft?.sourceLink).toBeNull();
    });

    it('drops a data: apply link', () => {
        const result = normalizeRawItem(makeItem({ applyLink: 'data:text/html,<script>x</script>' }));
        expect(result.draft?.applyLink).toBeNull();
    });

    it('normalizes an inverted salary range instead of dropping the listing', () => {
        const result = normalizeRawItem(makeItem({ salaryMin: 900_000, salaryMax: 400_000 }));
        expect(result.draft?.salaryMin).toBe(900_000);
        expect(result.draft?.salaryMax).toBe(900_000);
    });

    it('applies the default category when the feed sends an unknown one', () => {
        const result = normalizeRawItem(makeItem({ category: 'NOT_A_CATEGORY' as never }), {
            defaultCategory: 'SCHOLARSHIP' as never,
        });
        expect(result.draft?.category).toBe('SCHOLARSHIP');
    });

    it('discards passout years outside a plausible range', () => {
        const result = normalizeRawItem(makeItem({ allowedPassoutYears: [2025, 12, 9999, 2024] }));
        expect(result.draft?.allowedPassoutYears).toEqual([2025, 2024]);
    });

    it('does not mutate the input item', () => {
        const item = makeItem({ title: '  Spaced   Out  ' });
        normalizeRawItem(item);
        expect(item.title).toBe('  Spaced   Out  ');
    });

    it('preserves paragraph breaks in the description', () => {
        const result = normalizeRawItem(
            makeItem({ description: 'Line one\n\n\n\nLine two' })
        );
        expect(result.draft?.description).toBe('Line one\n\nLine two');
    });
});

describe('assertSafeEndpoint (SSRF guard)', () => {
    const rejected: Array<[string, string]> = [
        ['cloud metadata IPv4', 'http://169.254.169.254/latest/meta-data/'],
        ['private class A', 'https://10.0.0.5/jobs'],
        ['private class B', 'https://172.16.0.1/jobs'],
        ['private class C', 'https://192.168.1.1/jobs'],
        ['loopback', 'https://127.0.0.1/jobs'],
        ['localhost by name', 'https://localhost/jobs'],
        ['metadata hostname', 'https://metadata.google.internal/'],
        ['carrier-grade NAT', 'https://100.64.0.1/jobs'],
        ['file scheme', 'file:///etc/passwd'],
        ['gopher scheme', 'gopher://example.com/'],
        ['credentials in URL', 'https://user:pass@acme.com/jobs'],
        ['malformed', 'not-a-url'],
        ['protocol-relative', '//acme.com/jobs'],
    ];

    for (const [label, url] of rejected) {
        it(`rejects ${label}`, () => {
            expect(() => assertSafeEndpoint(url)).toThrow(UnsafeEndpointError);
        });
    }

    it('rejects a subdomain that merely looks like a public host', () => {
        // The classic bypass: a suffix check without the dot lets
        // `notexample.com` match an `example.com` allowlist rule.
        expect(() => assertSafeEndpoint('https://internal.acme.com.attacker.net/x')).not.toThrow();
    });

    it('accepts a normal https endpoint', () => {
        const url = assertSafeEndpoint('https://boards-api.greenhouse.io/v1/boards/acme/jobs');
        expect(url.hostname).toBe('boards-api.greenhouse.io');
    });

    it('does not echo the hostile input in the error message', () => {
        // The message reaches an admin UI, so it must not reflect raw input.
        let message = '';
        try {
            assertSafeEndpoint('https://user:sup3rsecret@acme.com/x');
        } catch (error) {
            message = (error as Error).message;
        }
        expect(message).not.toContain('sup3rsecret');
    });
});

describe('canonicalizeLink', () => {
    it('strips tracking params so the same job compares equal', () => {
        const a = canonicalizeLink('https://acme.com/jobs/1?utm_source=twitter');
        const b = canonicalizeLink('https://acme.com/jobs/1');
        expect(a).toBe(b);
    });

    it('normalizes a trailing slash', () => {
        expect(canonicalizeLink('https://acme.com/jobs/1/')).toBe(
            canonicalizeLink('https://acme.com/jobs/1')
        );
    });

    it('lowercases the host', () => {
        expect(canonicalizeLink('https://ACME.com/jobs/1')).toBe(
            canonicalizeLink('https://acme.com/jobs/1')
        );
    });

    it('keeps genuinely different paths different', () => {
        expect(canonicalizeLink('https://acme.com/jobs/1')).not.toBe(
            canonicalizeLink('https://acme.com/jobs/2')
        );
    });

    it('returns null for an unparseable link', () => {
        expect(canonicalizeLink('nope')).toBeNull();
        expect(canonicalizeLink(null)).toBeNull();
    });
});

describe('contentKey', () => {
    it('matches despite punctuation and case differences', () => {
        const a = contentKey('Backend Engineer', 'Acme Corp', 'Bengaluru');
        const b = contentKey('backend  engineer', 'ACME corp.', 'bengaluru');
        expect(a).toBe(b);
    });

    it('does not match different roles at the same company', () => {
        expect(contentKey('Backend Engineer', 'Acme', 'Bengaluru')).not.toBe(
            contentKey('Frontend Engineer', 'Acme', 'Bengaluru')
        );
    });

    it('returns null when either side is empty', () => {
        expect(contentKey('', 'Acme', 'Bengaluru')).toBeNull();
        expect(contentKey('Engineer', '', 'Bengaluru')).toBeNull();
    });
});
