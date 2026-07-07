import { AtsAdapter, AtsJob, fetchJson, sleep } from './BaseAdapter.js';

interface OracleRequisition {
    RequisitionNumber?: string;
    RequisitionTitle?: string;
    PrimaryLocation?: string;
    PrimaryLocationCountry?: string;
    Id?: number | string;
    PostingId?: string;
    ExternalURL?: string;     // Direct apply URL if provided
    ExternalPath?: string;    // Relative apply path if provided
    PostingStartDate?: string;
    JobFamily?: string;
}

interface OracleSearchResult {
    TotalJobsCount?: number;
    requisitionList?: OracleRequisition[];
}

interface OracleResponse {
    items?: OracleSearchResult[];
    hasMore?: boolean;
}

export class OracleAdapter implements AtsAdapter {
    providerName = 'Oracle';

    async fetchJobs(companyUrl: string, companyName: string): Promise<AtsJob[]> {
        try {
            const urlObj = new URL(companyUrl);
            const siteMatch = companyUrl.match(/\/sites\/([^\/]+)/);
            if (!siteMatch?.[1]) {
                console.warn(`[Oracle] Invalid URL for ${companyName}: ${companyUrl}`);
                return [];
            }
            const siteId = siteMatch[1];
            const origin = urlObj.origin;

            const allJobs: AtsJob[] = [];
            const seen = new Set<string>();
            let offset = 0;
            const limit = 25;
            let hasMore = true;

            while (hasMore) {
                const apiUrl = `${origin}/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=all&finder=findReqs;siteNumber=${siteId}&offset=${offset}&limit=${limit}`;
                const data = await fetchJson<OracleResponse>(apiUrl, {}, 'Oracle');
                if (!data) break;

                const result = data.items?.[0];
                if (!result) break;

                const reqs = result.requisitionList ?? [];
                if (reqs.length === 0) break;

                for (const r of reqs) {
                    // Prefer explicit URL fields over constructing
                    const applyLink =
                        r.ExternalURL ||
                        (r.ExternalPath ? `${origin}${r.ExternalPath}` : null) ||
                        `${companyUrl}/job/${r.RequisitionNumber ?? r.Id}`;

                    if (seen.has(applyLink)) continue;
                    seen.add(applyLink);

                    allJobs.push({
                        id: r.RequisitionNumber ?? String(r.Id ?? ''),
                        title: r.RequisitionTitle || 'Unknown Title',
                        applyLink,
                        company: companyName,
                        location: r.PrimaryLocation || r.PrimaryLocationCountry || '',
                        descriptionSource: 'NONE',
                        postedAt: r.PostingStartDate,
                        department: r.JobFamily,
                        source: 'ATS_ORACLE',
                        sourceType: 'ATS',
                    });
                }

                // Safely cap at 1000 jobs to avoid infinite loops
                if (offset >= 1000) {
                    console.warn(`[Oracle] Reached safety cap of 1000 jobs for ${companyName}`);
                    break;
                }

                hasMore = data.hasMore === true;
                offset += limit;
                await sleep(300);
            }

            return allJobs;
        } catch (error) {
            console.error(`[Oracle] Error for ${companyName}:`, (error as Error).message);
            return [];
        }
    }
}
