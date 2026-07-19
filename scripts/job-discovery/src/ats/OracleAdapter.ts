import { AtsAdapter, AtsJob, fetchJson, sleep, COUNTRY_CODE_MAP } from './BaseAdapter.js';

// Shape of each job in the requisitionList child array
interface OracleWorkLocation {
    LocationName?: string;
    TownOrCity?: string;
    Country?: string;  // ISO 2-letter
}

interface OracleRequisition {
    Id?: number | string;
    Title?: string;
    PostedDate?: string;
    PrimaryLocation?: string;         // Country name e.g. "India"
    PrimaryLocationCountry?: string;  // ISO code e.g. "IN"
    ShortDescriptionStr?: string;
    JobFamily?: string;
    WorkplaceType?: string;
    workLocation?: OracleWorkLocation[];
    otherWorkLocations?: OracleWorkLocation[];
}

// Shape of the search-session object (items[0]) returned by findReqs
interface OracleSearchSession {
    SearchId?: number;
    TotalJobsCount?: number;
    Offset?: number;
    Limit?: number;
    requisitionList?: OracleRequisition[];
}

interface OracleResponse {
    items?: OracleSearchSession[];
}

/** Derive a human-readable city string from Oracle's workLocation array */
function resolveCity(req: OracleRequisition): string {
    const locs = [...(req.workLocation ?? []), ...(req.otherWorkLocations ?? [])];
    if (locs.length > 0) {
        const loc = locs[0];
        const parts: string[] = [];
        if (loc.TownOrCity) parts.push(loc.TownOrCity);
        if (loc.Country) {
            const countryName = COUNTRY_CODE_MAP[loc.Country] ?? loc.Country;
            parts.push(countryName);
        }
        if (parts.length > 0) return parts.join(', ');
    }
    // Fall back to top-level country-name field
    return req.PrimaryLocation ?? (req.PrimaryLocationCountry ? (COUNTRY_CODE_MAP[req.PrimaryLocationCountry] ?? req.PrimaryLocationCountry) : '');
}

export class OracleAdapter implements AtsAdapter {
    providerName = 'Oracle';

    async fetchJobs(companyUrl: string, companyName: string): Promise<AtsJob[]> {
        try {
            const urlObj = new URL(companyUrl);
            const origin = urlObj.origin;

            // Extract the site number (CX_N) from the career page URL if present,
            // otherwise fetch the page HTML to find it from the CSS/script tags.
            // Priority order:
            //   1. siteNumber query param in URL
            //   2. The /sites/<code>/ segment IS the siteNumber if it starts with CX_
            //   3. Fetch page HTML and extract from ?siteNumber=CX_N in a CSS href
            let siteNumber: string | null =
                companyUrl.match(/[?&]siteNumber=(CX_\d+)/i)?.[1] ?? null;

            if (!siteNumber) {
                const siteCode = companyUrl.match(/\/sites\/([^/?]+)/)?.[1] ?? null;
                if (siteCode) {
                    if (/^CX_\d+$/i.test(siteCode)) {
                        // Already a numeric site number
                        siteNumber = siteCode;
                    } else {
                        // Fetch the career page HTML and look for siteNumber=CX_N
                        try {
                            const htmlRes = await fetch(`${companyUrl.replace(/\/$/, '')}/jobs`, {
                                headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' }
                            });
                            if (htmlRes.ok) {
                                const html = await htmlRes.text();
                                siteNumber = html.match(/siteNumber=(CX_\d+)/i)?.[1] ?? null;
                            }
                        } catch {
                            // ignore — siteNumber stays null
                        }
                        if (!siteNumber) {
                            siteNumber = siteCode;
                        }
                    }
                }
            }

            if (!siteNumber) {
                console.warn(`[Oracle] Could not determine siteNumber for ${companyName}: ${companyUrl}`);
                return [];
            }

            const allJobs: AtsJob[] = [];
            const seen = new Set<string>();

            // Oracle CE paginates via the `limit` and `offset` params INSIDE the finder string.
            // hasMore/offset in the outer envelope always reflect the search-session object (count=1),
            // NOT the inner requisitionList. We must track pagination via TotalJobsCount vs fetched count.
            let offset = 0;
            const limit = 25;
            let totalJobs: number | null = null;

            while (true) {
                // Exact URL shape captured from browser devtools on Honeywell's Oracle CE site
                const apiUrl =
                    `${origin}/hcmRestApi/resources/latest/recruitingCEJobRequisitions` +
                    `?onlyData=true` +
                    `&expand=requisitionList.workLocation,requisitionList.otherWorkLocations,requisitionList.secondaryLocations,requisitionList.requisitionFlexFields` +
                    `&finder=findReqs;siteNumber=${encodeURIComponent(siteNumber)},facetsList=LOCATIONS%3BWORK_LOCATIONS%3BWORKPLACE_TYPES%3BTITLES%3BCATEGORIES%3BORGANIZATIONS%3BPOSTING_DATES,limit=${limit},offset=${offset},sortBy=POSTING_DATES_DESC`;

                const data = await fetchJson<OracleResponse>(apiUrl, {}, 'Oracle');
                if (!data) break;

                const session = data.items?.[0];
                if (!session) break;

                if (totalJobs === null) totalJobs = session.TotalJobsCount ?? 0;

                const reqs = session.requisitionList ?? [];
                if (reqs.length === 0) break;

                for (const r of reqs) {
                    if (!r.Title || !r.Id) continue;

                    const jobId = String(r.Id);
                    const applyLink = `${companyUrl.replace(/\/$/, '')}/job/${jobId}`;

                    if (applyLink.includes('/undefined') || applyLink.includes('/null')) continue;
                    if (seen.has(applyLink)) continue;
                    seen.add(applyLink);

                    allJobs.push({
                        id: jobId,
                        title: r.Title,
                        applyLink,
                        company: companyName,
                        location: resolveCity(r),
                        description: r.ShortDescriptionStr || undefined,
                        descriptionSource: r.ShortDescriptionStr ? 'API' : 'NONE',
                        postedAt: r.PostedDate,
                        department: r.JobFamily,
                        employmentType: r.WorkplaceType,
                        source: 'ATS_ORACLE',
                        sourceType: 'ATS',
                    });
                }

                offset += reqs.length;

                // Safety cap
                if (offset >= 1000 || offset >= (totalJobs ?? 0)) {
                    if (offset >= 1000) {
                        console.warn(`[Oracle] Reached safety cap of 1000 jobs for ${companyName}`);
                    }
                    break;
                }

                await sleep(300);
            }

            return allJobs;
        } catch (error) {
            console.error(`[Oracle] Error for ${companyName}:`, (error as Error).message);
            return [];
        }
    }
}
