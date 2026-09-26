/**
 * Lever connector.
 *
 * Endpoint shape: `https://api.lever.co/v0/postings/{company}?mode=json`
 * Response: a bare array of postings:
 *   [{ id, text, categories:{team,location,commitment,department},
 *     hostedUrl, applyUrl, descriptionPlain, lists:[{text, content}] }]
 *
 * Unlike Greenhouse, Lever already returns `descriptionPlain`, so no HTML
 * stripping is needed and the content is safe to store as-is.
 */

import { safeFetchJson } from '../safeFetch';
import type { Connector, ConnectorContext, RawItem } from '../types';

interface LeverPosting {
    id?: unknown;
    text?: unknown;
    hostedUrl?: unknown;
    applyUrl?: unknown;
    descriptionPlain?: unknown;
    categories?: unknown;
    lists?: unknown;
    createdAt?: unknown;
}

function readCategory(categories: unknown, key: string): string | null {
    if (typeof categories !== 'object' || categories === null) return null;
    const value = (categories as Record<string, unknown>)[key];
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

/**
 * Lever splits requirements into separate `lists` blocks, each with a heading
 * (`text`) and HTML `content`. Flatten them into a readable description rather
 * than dropping the requirements, which are often the most useful part.
 */
function readLists(lists: unknown): string {
    if (!Array.isArray(lists)) return '';
    const blocks: string[] = [];
    for (const entry of lists) {
        if (typeof entry !== 'object' || entry === null) continue;
        const record = entry as Record<string, unknown>;
        const heading = typeof record.text === 'string' ? record.text.trim() : '';
        const content = typeof record.content === 'string' ? record.content : '';
        if (!content) continue;
        const stripped = content
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/li>/gi, '\n')
            .replace(/<\/p>/gi, '\n\n')
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .trim();
        if (stripped.length === 0) continue;
        blocks.push(heading ? `${heading}\n${stripped}` : stripped);
    }
    return blocks.join('\n\n');
}

export const leverConnector: Connector = {
    sourceType: 'LEVER',
    async fetchItems(ctx: ConnectorContext): Promise<RawItem[]> {
        const payload = await safeFetchJson(ctx.endpoint, {
            signal: ctx.signal,
            timeoutMs: ctx.timeoutMs,
            fetchImpl: ctx.fetchImpl,
        });

        const postings = Array.isArray(payload) ? (payload as LeverPosting[]) : [];

        return postings.map((posting) => {
            const description =
                typeof posting.descriptionPlain === 'string'
                    ? posting.descriptionPlain
                    : readLists(posting.lists);

            const location = readCategory(posting.categories, 'location');

            return {
                sourceExternalId: typeof posting.id === 'string' ? posting.id : null,
                title: typeof posting.text === 'string' ? posting.text : '',
                // Lever's public posting API omits the company name; the
                // endpoint host identifies the employer.
                company: '',
                sourceLink: typeof posting.hostedUrl === 'string' ? posting.hostedUrl : null,
                applyLink: typeof posting.applyUrl === 'string' ? posting.applyUrl : null,
                description: description || null,
                locations: location ? [location] : [],
                employmentTypes: readCategory(posting.categories, 'commitment')
                    ? [readCategory(posting.categories, 'commitment') as string]
                    : [],
                experienceLevel: readCategory(posting.categories, 'seniority'),
                requiredSkills: [],
                allowedDegrees: [],
                allowedCourses: [],
                allowedSpecializations: [],
                allowedPassoutYears: [],
                closesAt: null,
                publishedAt: typeof posting.createdAt === 'number' ? new Date(posting.createdAt).toISOString() : null,
                raw: posting as Record<string, unknown>,
                reasonFlags: [],
            } satisfies RawItem;
        });
    },
};
