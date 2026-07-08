import { AtsAdapter, AtsJob, fetchJson, sleep } from './BaseAdapter.js';

interface WorkdayJobResponse {
    jobPostings?: Array<{
        title: string;
        externalPath: string;
        locationsText?: string;
        timeType?: string;
        postedOn?: string;       // e.g. "Posted 2 Days Ago"
        bulletFields?: string[];
    }>;
    total?: number;
}

// Detect locale prefixes like "en-US", "fr-FR" in Workday URL paths
const LOCALE_RE = /^[a-z]{2}(-[A-Z]{2})?$/i;

function extractWorkdayBoard(pathname: string): string {
    const parts = pathname.split('/').filter(Boolean);
    // Skip locale segment if present e.g. [en-US, Careers] → Careers
    const board = parts.length >= 2 && LOCALE_RE.test(parts[0]) ? parts[1] : parts[0];
    return board ?? '';
}

export class WorkdayAdapter implements AtsAdapter {
    providerName = 'Workday';

    async fetchJobs(companyUrl: string, companyName: string): Promise<AtsJob[]> {
        try {
            const urlObj = new URL(companyUrl);
            const tenant = urlObj.hostname.split('.')[0];
            const board = extractWorkdayBoard(urlObj.pathname);

            if (!tenant || !board) {
                console.warn(`[Workday] Invalid URL for ${companyName}: ${companyUrl}`);
                return [];
            }

            const apiUrl = `${urlObj.origin}/wday/cxs/${tenant}/${board}/jobs`;
            const baseUrl = `${urlObj.origin}/${board}`;

            const allJobs: AtsJob[] = [];
            const seen = new Set<string>();
            let offset = 0;
            const limit = 20; // Workday max per page
            let total = Infinity;

            while (offset < total && offset < 1000) {
                let data: WorkdayJobResponse | null = null;

                const payloads = [
                    { appliedFacets: {}, limit: limit, offset: offset, searchText: "" },
                    { limit: limit, offset: offset }
                ];

                for (const body of payloads) {
                    data = await fetchJson<WorkdayJobResponse>(
                        apiUrl,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body)
                        },
                        'Workday'
                    );
                    if (data) break; // Success
                }

                if (!data) break;

                const page = data.jobPostings ?? [];
                if (offset === 0) total = data.total ?? 0;
                if (page.length === 0) break;

                for (const j of page) {
                    // Skip malformed entries with no title or externalPath
                    if (!j.title || !j.externalPath || j.externalPath === 'undefined') continue;

                    // Safely build apply URL even when externalPath has a leading /en-US/...
                    const applyLink = new URL(j.externalPath, `${urlObj.origin}/${board}/`).toString();

                    // Guard: skip if URL contains literal 'undefined' (malformed data)
                    if (applyLink.includes('/undefined')) continue;

                    if (seen.has(applyLink)) continue;
                    seen.add(applyLink);

                    allJobs.push({
                        title: j.title,
                        applyLink,
                        company: companyName,
                        location: j.locationsText,
                        descriptionSource: 'NONE',
                        source: 'ATS_WORKDAY',
                        sourceType: 'ATS',
                    });
                }

                if (page.length < limit) break;
                offset += limit;
                await sleep(300);
            }

            if (offset >= 1000 && total > 1000) {
                console.warn(`[Workday] Reached safety cap of 1000 jobs for ${companyName} (Total: ${total})`);
            }

            return allJobs;
        } catch (error) {
            console.error(`[Workday] Error for ${companyName}:`, (error as Error).message);
            return [];
        }
    }
}
