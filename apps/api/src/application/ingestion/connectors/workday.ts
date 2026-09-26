/**
 * Workday connector.
 *
 * Workday exposes a CXS (Career Experience) JSON endpoint shaped like:
 *   https://{tenant}.wd1.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs
 *   -> { jobPostings: [ { title, externalPath, locationsText, postedOn,
 *                         bulletFields, jobDescriptionInfo } ], total } }
 *
 * The public endpoint returns only a summary, so `jobDescriptionInfo` is often
 * absent. `externalPath` is required because it is the only stable identifier
 * that survives across runs when Workday omits an explicit id - the pair
 * (sourceId, externalPath) is what makes `@@unique([sourceId, sourceExternalId])`
 * work for Workday specifically.
 *
 * Note: Workday's `jobPostings[].externalPath` and `postedOn` are strings, and
 * `bulletFields` holds the numbered requirements.
 */

import { safeFetchJson } from '../safeFetch';
import type { Connector, ConnectorContext, RawItem } from '../types';

interface WorkdayPosting {
    title?: unknown;
    externalPath?: unknown;
    locationsText?: unknown;
    postedOn?: unknown;
    bulletFields?: unknown;
    jobDescriptionInfo?: unknown;
    timeType?: unknown;
}

function readString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function stripHtml(value: string): string {
    return value
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

export const workdayConnector: Connector = {
    sourceType: 'WORKDAY',
    async fetchItems(ctx: ConnectorContext): Promise<RawItem[]> {
        const payload = await safeFetchJson(ctx.endpoint, {
            signal: ctx.signal,
            timeoutMs: ctx.timeoutMs,
            fetchImpl: ctx.fetchImpl,
        });

        const postings =
            typeof payload === 'object' && payload !== null
                ? ((payload as { jobPostings?: WorkdayPosting[] }).jobPostings ?? [])
                : [];

        // The configured endpoint is the public board page; the description
        // endpoint differs by tenant, so the board origin is the safe base for
        // building an absolute link from `externalPath`.
        let boardOrigin: string;
        try {
            boardOrigin = new URL(ctx.endpoint).origin;
        } catch {
            boardOrigin = ctx.endpoint;
        }

        return postings.map((posting) => {
            const descriptionInfo = posting.jobDescriptionInfo;
            let description = '';

            if (typeof descriptionInfo === 'string') {
                description = stripHtml(descriptionInfo);
            } else if (typeof descriptionInfo === 'object' && descriptionInfo !== null) {
                const record = descriptionInfo as Record<string, unknown>;
                const parts: string[] = [];
                for (const key of ['jobDescription', 'jobSummary', 'jobRequirements']) {
                    const section = record[key];
                    const text = readString(section);
                    if (text) {
                        const heading = key === 'jobDescription'
                            ? ''
                            : key === 'jobSummary'
                              ? 'Summary'
                              : 'Requirements';
                        parts.push(heading ? `${heading}\n${stripHtml(text)}` : stripHtml(text));
                    }
                }
                description = parts.join('\n\n');
            }

            // `bulletFields` carries the numbered requirements when the
            // description endpoint was not fetched.
            if (description.length === 0 && Array.isArray(posting.bulletFields)) {
                description = posting.bulletFields
                    .map((field) => stripHtml(readString(field) ?? ''))
                    .filter(Boolean)
                    .join('\n');
            }

            const externalPath = readString(posting.externalPath);
            const locationsText = readString(posting.locationsText);

            return {
                // `externalPath` is the identity here; it is stable across
                // runs, whereas the numeric-looking board id is not exposed.
                sourceExternalId: externalPath,
                title: readString(posting.title) ?? '',
                // Workday omits the employer from the payload; the tenant is
                // part of the endpoint host, so it is the best available value.
                company: boardHostTenant(ctx.endpoint),
                sourceLink: externalPath ? `${boardOrigin}${externalPath}` : null,
                applyLink: null,
                description: description || null,
                locations: locationsText
                    ? locationsText
                          .split(/\s*[|;]\s*/)
                          .map((part) => part.trim())
                          .filter(Boolean)
                    : [],
                employmentTypes: readString(posting.timeType) ? [readString(posting.timeType) as string] : [],
                requiredSkills: [],
                allowedDegrees: [],
                allowedCourses: [],
                allowedSpecializations: [],
                allowedPassoutYears: [],
                closesAt: null,
                publishedAt: readString(posting.postedOn),
                raw: posting as Record<string, unknown>,
                reasonFlags: [],
            } satisfies RawItem;
        });
    },
};

/** `{tenant}.wd1.myworkdayjobs.com` -> `{tenant}`. */
function boardHostTenant(endpoint: string): string {
    try {
        const host = new URL(endpoint).hostname.toLowerCase();
        const first = host.split('.')[0];
        return first && first !== 'wday' ? first : '';
    } catch {
        return '';
    }
}
