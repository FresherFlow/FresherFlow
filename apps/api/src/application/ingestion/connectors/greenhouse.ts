/**
 * Greenhouse job board connector.
 *
 * Endpoint shape: `https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true`
 * Response: `{ jobs: [{ id, title, updated_at, absolute_url, location, departments,
 * offices, content, metadata }] }`
 *
 * `content=true` is required: without it Greenhouse returns an HTML string
 * instead of a description, and every listing would be rejected as empty.
 */

import { safeFetchJson } from '../safeFetch';
import type { Connector, ConnectorContext, RawItem } from '../types';

/** Greenhouse embeds structured data in a JSON blob on some boards. */
interface GreenhouseJob {
    id?: unknown;
    title?: unknown;
    absolute_url?: unknown;
    location?: unknown;
    updated_at?: unknown;
    content?: unknown;
    departments?: unknown;
    offices?: unknown;
    metadata?: unknown;
}

function stripHtml(value: string): string {
    return value
        .replace(/<br\s*\/?>/gi, '\n')
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

function toLocations(value: unknown): string[] {
    if (typeof value !== 'string') return [];
    // Greenhouse uses "Bengaluru, Karnataka, India" or "Remote - US".
    return value
        .split(/\s*\|\s*/)
        .map((part) => part.trim())
        .filter(Boolean);
}

export const greenhouseConnector: Connector = {
    sourceType: 'GREENHOUSE',
    async fetchItems(ctx: ConnectorContext): Promise<RawItem[]> {
        const payload = await safeFetchJson(ctx.endpoint, {
            signal: ctx.signal,
            timeoutMs: ctx.timeoutMs,
            fetchImpl: ctx.fetchImpl,
        });

        const jobs =
            typeof payload === 'object' && payload !== null
                ? ((payload as { jobs?: GreenhouseJob[] }).jobs ?? [])
                : [];

        return jobs.map((job) => {
            const content = typeof job.content === 'string' ? job.content : '';
            const metadata =
                typeof job.metadata === 'object' && job.metadata !== null
                    ? (job.metadata as Record<string, unknown>)
                    : {};

            // Greenhouse stores the real salary in metadata IDs like
            // `meta-12345`; there is no dependable field, so read any
            // numeric-looking metadata value rather than guessing.
            const salaryValue = Object.values(metadata).find(
                (value) => typeof value === 'number' || /^\d+$/.test(String(value))
            );

            return {
                sourceExternalId: typeof job.id === 'number' ? String(job.id) : null,
                title: typeof job.title === 'string' ? job.title : '',
                // A board endpoint is one employer, so the company is the host
                // of the configured endpoint rather than a per-job field.
                company: typeof metadata.name === 'string' ? metadata.name : '',
                sourceLink: typeof job.absolute_url === 'string' ? job.absolute_url : null,
                applyLink: null,
                description: content ? stripHtml(content) : null,
                locations: toLocations(job.location),
                requiredSkills: [],
                allowedDegrees: [],
                allowedCourses: [],
                allowedSpecializations: [],
                allowedPassoutYears: [],
                closesAt: null,
                publishedAt: typeof job.updated_at === 'string' ? job.updated_at : null,
                salaryMin: typeof salaryValue === 'number' ? salaryValue : null,
                salaryMax: null,
                raw: job as Record<string, unknown>,
                reasonFlags: [],
            } satisfies RawItem;
        });
    },
};
