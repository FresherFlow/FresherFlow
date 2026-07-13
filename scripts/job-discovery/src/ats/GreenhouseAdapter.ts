import { AtsAdapter, AtsJob, fetchJson } from './BaseAdapter.js';

// Greenhouse content field is double-HTML-escaped (e.g. &lt;p&gt; not <p>).
// Unescape once, then strip all tags to get plain text for the scorer.
function decodeGreenhouseContent(raw: string): string {
    // First unescape HTML entities (&lt; → <, &gt; → >, &amp; → &, &#39; → ', &quot; → ")
    const unescaped = raw
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&amp;/g, '&');
    // Strip HTML tags, collapse whitespace
    return unescaped.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

interface GreenhouseJob {
    id: number | string;
    title: string;
    absolute_url: string;
    location: { name: string };
    updated_at: string;
    first_published: string;
    company_name: string;
    metadata: Array<{ name: string; value: unknown; value_type: string }>;
}

interface GreenhouseJobListResponse {
    jobs: GreenhouseJob[];
}

interface GreenhouseJobDetailResponse extends GreenhouseJob {
    content?: string;
    departments?: Array<{ id: number; name: string }>;
    offices?: Array<{ id: number; name: string }>;
}

export class GreenhouseAdapter implements AtsAdapter {
    providerName = 'Greenhouse';

    async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
        const url = `https://boards-api.greenhouse.io/v1/boards/${companyId}/jobs`;
        const data = await fetchJson<GreenhouseJobListResponse>(url, {}, 'Greenhouse');
        if (!data?.jobs?.length) return [];

        return data.jobs.map(j => ({
            id: String(j.id),
            title: j.title || 'Unknown Title',
            applyLink: j.absolute_url,
            company: companyName,
            location: j.location?.name,
            postedAt: j.first_published || j.updated_at,
            descriptionSource: 'NONE',
            source: 'ATS_GREENHOUSE',
            sourceType: 'ATS' as const,
            boardToken: companyId,
        }));
    }

    async fetchJobDetails(job: AtsJob): Promise<string | undefined> {
        if (!job.id) return undefined;

        const boardToken = job.boardToken || (() => {
            const urlObj = new URL(job.applyLink);
            const parts = urlObj.pathname.split('/').filter(Boolean);
            const boardsIdx = parts.indexOf('boards');
            return boardsIdx !== -1 ? parts[boardsIdx + 1] : parts[0];
        })();

        const url = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs/${job.id}?content=true`;
        const data = await fetchJson<GreenhouseJobDetailResponse>(url, {}, 'Greenhouse Details');
        if (!data?.content) return undefined;

        // Capture department if available (enriches AtsJob in-place for downstream use)
        if (data.departments?.length) {
            (job as any).department = data.departments[0].name;
        }

        return decodeGreenhouseContent(data.content);
    }
}
