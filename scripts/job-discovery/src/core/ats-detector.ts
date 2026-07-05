import { AtsRegistry } from '../ats/index.js';

export function extractAtsBoard(urlStr: string): { provider: keyof AtsRegistry, boardId: string } | null {
    try {
        const u = new URL(urlStr);
        const host = u.hostname.toLowerCase();
        const path = u.pathname;

        // Greenhouse: boards.greenhouse.io/company
        if (host.includes('boards.greenhouse.io') || host.includes('careers.greenhouse.io')) {
            const parts = path.split('/').filter(Boolean);
            if (parts.length > 0 && parts[0] !== 'jobs') return { provider: 'greenhouse', boardId: parts[0] };
        }
        
        // Lever: jobs.lever.co/company
        if (host.includes('jobs.lever.co')) {
            const parts = path.split('/').filter(Boolean);
            if (parts.length > 0) return { provider: 'lever', boardId: parts[0] };
        }

        // Workday: company.wd1.myworkdayjobs.com/Board
        if (host.includes('myworkdayjobs.com') || host.includes('myworkdaysite.com')) {
            const parts = path.split('/').filter(Boolean);
            if (parts.length > 0) {
                // boardId is the base url up to the board name
                return { provider: 'workday', boardId: `${u.origin}/${parts[0]}` };
            }
        }

        // Ashby: jobs.ashbyhq.com/company
        if (host.includes('jobs.ashbyhq.com')) {
            const parts = path.split('/').filter(Boolean);
            if (parts.length > 0) return { provider: 'ashby', boardId: parts[0] };
        }

        // SmartRecruiters: jobs.smartrecruiters.com/company
        if (host.includes('jobs.smartrecruiters.com') || host.includes('careers.smartrecruiters.com')) {
            const parts = path.split('/').filter(Boolean);
            if (parts.length > 0) return { provider: 'smartrecruiters', boardId: parts[0] };
        }
        
        // iCIMS: company.icims.com
        if (host.includes('.icims.com')) {
            return { provider: 'icims', boardId: u.origin };
        }

        // Oracle: https://...oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/
        if (host.includes('oraclecloud.com') && path.includes('/hcmUI/CandidateExperience/en/sites/')) {
            const match = path.match(/\/sites\/([^\/]+)/);
            if (match) {
                return { provider: 'oracle', boardId: `${u.origin}/hcmUI/CandidateExperience/en/sites/${match[1]}` };
            }
        }
        
        // SuccessFactors: careers.company.com/job/... 
        // A bit harder to fingerprint just from URL without loading, but if it has /career?company=
        if (host.includes('successfactors') || u.searchParams.has('company')) {
            const companyId = u.searchParams.get('company');
            if (companyId) return { provider: 'successfactors', boardId: companyId };
        }

        return null;
    } catch {
        return null;
    }
}
