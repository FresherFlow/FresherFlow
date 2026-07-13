import { extractAtsBoard } from './ats-detector.js';

export interface ParsedJobUrl {
    adapter: string;
    company: string;
    jobId: string;
}

/**
 * Extracts adapter, company, and jobId from a URL to use as the R2 storage path.
 * Example: https://jobs.lever.co/cloudsek/a1b2-c3d4 -> { adapter: 'lever', company: 'cloudsek', jobId: 'a1b2-c3d4' }
 */
export function parseJobUrl(urlStr: string): ParsedJobUrl | null {
    try {
        const u = new URL(urlStr);
        const host = u.hostname.toLowerCase();
        const parts = u.pathname.split('/').filter(Boolean);

        const boardInfo = extractAtsBoard(urlStr);
        if (!boardInfo) return null;

        const { provider, boardId } = boardInfo;
        const company = boardId.split('/').pop()?.toLowerCase() || 'unknown';

        let jobId = '';

        if (provider === 'lever') {
            // jobs.lever.co/company/jobId
            const idx = parts.indexOf(company);
            if (idx !== -1 && parts.length > idx + 1) {
                jobId = parts[idx + 1];
            } else {
                jobId = parts[parts.length - 1];
            }
        } 
        else if (provider === 'greenhouse') {
            // boards.greenhouse.io/company/jobs/jobId
            const jobsIdx = parts.indexOf('jobs');
            if (jobsIdx !== -1 && parts.length > jobsIdx + 1) {
                jobId = parts[jobsIdx + 1];
            } else {
                jobId = parts[parts.length - 1];
            }
        }
        else if (provider === 'ashby') {
            // jobs.ashbyhq.com/company/jobId
            const idx = parts.indexOf(company);
            if (idx !== -1 && parts.length > idx + 1) {
                jobId = parts[idx + 1];
            } else {
                jobId = parts[parts.length - 1];
            }
        }
        else if (provider === 'smartrecruiters') {
            // jobs.smartrecruiters.com/company/jobIdSlug
            const idx = parts.indexOf(company);
            if (idx !== -1 && parts.length > idx + 1) {
                const slug = parts[idx + 1];
                jobId = slug.split('-')[0]; // The ID is before the first dash
            } else {
                jobId = parts[parts.length - 1].split('-')[0];
            }
        }
        else if (provider === 'icims') {
            // company.icims.com/jobs/jobId/title/job
            const jobsIdx = parts.indexOf('jobs');
            if (jobsIdx !== -1 && parts.length > jobsIdx + 1) {
                jobId = parts[jobsIdx + 1];
            } else {
                jobId = parts[parts.length - 1];
            }
        }
        else if (provider === 'workday') {
            // company.wd1.myworkdayjobs.com/Board/job/Location/Title_JR12345
            const lastPart = parts[parts.length - 1];
            if (lastPart.includes('_')) {
                const idParts = lastPart.split('_');
                jobId = idParts[idParts.length - 1]; // JR12345
            } else {
                jobId = lastPart;
            }
        }
        else {
            // Generic fallback: use the last segment as the ID
            jobId = parts[parts.length - 1];
        }

        // Clean up jobId (remove query strings if they sneaked in)
        jobId = jobId.split('?')[0].split('#')[0];

        if (!jobId || jobId === company) return null;

        return {
            adapter: provider as string,
            company,
            jobId
        };
    } catch {
        return null;
    }
}
