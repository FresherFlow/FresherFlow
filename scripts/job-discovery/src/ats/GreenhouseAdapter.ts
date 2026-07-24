import { AtsAdapter, AtsJob, fetchJson } from './BaseAdapter.js';

function decodeGreenhouseContent(raw: string): string {
    const unescaped = raw
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&nbsp;/g, ' ');

    return unescaped
        .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n\n**$1**\n\n')
        .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
        .replace(/<li[^>]*>/gi, '\n- ')
        .replace(/<\/li>/gi, '')
        .replace(/<p[^>]*>/gi, '\n')
        .replace(/<\/p>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
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
