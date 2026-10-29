/**
 * The guest (anonymous) cache keys and the purge patterns that remove them.
 *
 * The defect this exists for: the invalidation purged `opportunities|v4|*`
 * and `opportunity_detail|v3|*|id:<value>` while the routes wrote `v5` keys
 * with a different segment order, so the purge matched NOTHING and stale guest
 * responses survived until their TTL expired. The writer and the purger now
 * build their keys from the same functions, and these tests assert that a key
 * the route writes really is matched by the pattern that purges it.
 */
import { describe, expect, it } from 'vitest';
import {
    buildGuestFeedCacheKey,
    buildGuestDetailCacheKey,
    guestFeedCachePurgePattern,
    guestDetailCachePurgePattern,
} from './publicOpportunityCache.service';

/**
 * Redis glob (`stringmatchlen`) → RegExp. Redis supports `*`, `?`, `[...]`
 * classes and `\` as the escape character.
 */
function redisGlobToRegExp(pattern: string): RegExp {
    let out = '';
    for (let i = 0; i < pattern.length; i += 1) {
        const ch = pattern[i];
        if (ch === '\\') {
            const next = pattern[i + 1];
            if (next !== undefined) {
                out += next.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                i += 1;
                continue;
            }
            out += '\\\\';
            continue;
        }
        if (ch === '*') {
            out += '.*';
            continue;
        }
        if (ch === '?') {
            out += '.';
            continue;
        }
        if (ch === '[') {
            let j = i + 1;
            let cls = '[';
            if (pattern[j] === '^') {
                cls += '^';
                j += 1;
            }
            if (pattern[j] === ']') {
                cls += '\\]';
                j += 1;
            }
            while (j < pattern.length && pattern[j] !== ']') {
                cls += pattern[j];
                j += 1;
            }
            cls += ']';
            out += cls;
            i = j;
            continue;
        }
        out += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    return new RegExp(`^${out}$`);
}

const FEED_PARTS = {
    siteMode: 'private',
    feedType: 'all',
    type: 'all',
    city: 'all',
    tag: 'all',
    minSalary: 'na',
    maxSalary: 'na',
    sort: 'default',
    page: 1,
    limit: 200,
};

describe('guest feed cache key', () => {
    it('has the documented layout', () => {
        expect(buildGuestFeedCacheKey(FEED_PARTS)).toBe(
            'opportunities|v5|mode:private|feed:all|type:all|city:all|tag:all|min:na|max:na|sort:default|page:1|limit:200'
        );
    });

    it('is matched by the purge pattern', () => {
        const matcher = redisGlobToRegExp(guestFeedCachePurgePattern());
        expect(matcher.test(buildGuestFeedCacheKey(FEED_PARTS))).toBe(true);
        expect(matcher.test(buildGuestFeedCacheKey({ ...FEED_PARTS, siteMode: 'govt', feedType: 'walkins' }))).toBe(true);
    });
});

describe('guest detail cache key', () => {
    const slug = 'senior-software-engineer-acme-1a2b3c';

    it('has the documented layout', () => {
        expect(buildGuestDetailCacheKey('private', slug)).toBe(
            `opportunity_detail|v5|mode:private|id:${slug}`
        );
    });

    it('is matched by the purge pattern in every site mode', () => {
        const matcher = redisGlobToRegExp(guestDetailCachePurgePattern(slug));
        expect(matcher.test(buildGuestDetailCacheKey('private', slug))).toBe(true);
        expect(matcher.test(buildGuestDetailCacheKey('govt', slug))).toBe(true);
    });

    it('does not purge a different listing', () => {
        const matcher = redisGlobToRegExp(guestDetailCachePurgePattern('abc-123'));
        expect(matcher.test(buildGuestDetailCacheKey('private', 'abc-1234'))).toBe(false);
        expect(matcher.test(buildGuestDetailCacheKey('private', 'xyz-123'))).toBe(false);
        expect(matcher.test(buildGuestDetailCacheKey('private', 'abc-123-extra'))).toBe(false);
    });

    it('does not let a glob character in the value widen the match', () => {
        const matcher = redisGlobToRegExp(guestDetailCachePurgePattern('a*c'));
        expect(matcher.test(buildGuestDetailCacheKey('private', 'a*c'))).toBe(true);
        expect(matcher.test(buildGuestDetailCacheKey('private', 'abc'))).toBe(false);
    });
});
