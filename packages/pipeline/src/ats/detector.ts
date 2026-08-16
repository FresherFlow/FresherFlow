import { AtsRegistry } from './parser.js';

export function extractAtsBoard(urlStr: string): { provider: keyof AtsRegistry, boardId: string } | null {
    try {
        const u = new URL(urlStr);
        const host = u.hostname.toLowerCase();
        const path = u.pathname;

        // Greenhouse: boards.greenhouse.io/company
        if (host === 'boards.greenhouse.io' || host.endsWith('.boards.greenhouse.io') || host === 'careers.greenhouse.io' || host.endsWith('.careers.greenhouse.io')) {
            const parts = path.split('/').filter(Boolean);
            if (parts.length > 0 && parts[0] !== 'jobs') return { provider: 'greenhouse', boardId: parts[0] };
        }
        
        // Lever: jobs.lever.co/company
        if (host === 'jobs.lever.co' || host.endsWith('.jobs.lever.co')) {
            const parts = path.split('/').filter(Boolean);
            if (parts.length > 0) return { provider: 'lever', boardId: parts[0] };
        }

        // Workday: company.wd1.myworkdayjobs.com/Board
        if (host === 'myworkdayjobs.com' || host.endsWith('.myworkdayjobs.com') || host === 'myworkdaysite.com' || host.endsWith('.myworkdaysite.com')) {
            const parts = path.split('/').filter(Boolean);
            if (parts.length > 0) {
                // boardId is the base url up to the board name
                return { provider: 'workday', boardId: `${u.origin}/${parts[0]}` };
            }
        }

        // Ashby: jobs.ashbyhq.com/company
        if (host === 'jobs.ashbyhq.com' || host.endsWith('.jobs.ashbyhq.com')) {
            const parts = path.split('/').filter(Boolean);
            if (parts.length > 0) return { provider: 'ashby', boardId: parts[0] };
        }

        // SmartRecruiters: jobs.smartrecruiters.com/company
        if (host === 'jobs.smartrecruiters.com' || host.endsWith('.jobs.smartrecruiters.com') || host === 'careers.smartrecruiters.com' || host.endsWith('.careers.smartrecruiters.com')) {
            const parts = path.split('/').filter(Boolean);
            if (parts.length > 0) return { provider: 'smartrecruiters', boardId: parts[0] };
        }
        
        // Workable: apply.workable.com/company
        if (host === 'apply.workable.com' || host.endsWith('.workable.com')) {
            const parts = path.split('/').filter(Boolean);
            if (parts.length > 0) return { provider: 'workable', boardId: parts[0] };
        }

        // Recruitee: company.recruitee.com
        if (host === 'recruitee.com' || host.endsWith('.recruitee.com')) {
            const subdomain = host.split('.')[0];
            return { provider: 'recruitee', boardId: subdomain };
        }

        // Teamtailor: careers.company.com or company.teamtailor.com
        if (host === 'teamtailor.com' || host.endsWith('.teamtailor.com')) {
             const subdomain = host.split('.')[0];
             return { provider: 'teamtailor', boardId: subdomain };
        }
        
        // iCIMS: company.icims.com
        if (host === 'icims.com' || host.endsWith('.icims.com')) {
            return { provider: 'icims', boardId: u.origin };
        }

        // Oracle: https://...oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/
        if ((host === 'oraclecloud.com' || host.endsWith('.oraclecloud.com')) && path.includes('/hcmUI/CandidateExperience/en/sites/')) {
            const match = path.match(/\/sites\/([^\/]+)/);
            if (match) {
                return { provider: 'oracle', boardId: `${u.origin}/hcmUI/CandidateExperience/en/sites/${match[1]}` };
            }
        }
        
        // SuccessFactors: careers.company.com/job/... 
        // A bit harder to fingerprint just from URL without loading, but if it has /career?company=
        if (host.match(/successfactors\.[a-z]+$/) || u.searchParams.has('company')) {
            const companyId = u.searchParams.get('company');
            if (companyId) return { provider: 'successfactors', boardId: companyId };
        }

        
        // Darwinbox: company.darwinbox.com
        if (host.endsWith('.darwinbox.com')) return { provider: 'darwinbox', boardId: host.split('.')[0] };
        // Keka: company.keka.com
        if (host.endsWith('.keka.com')) return { provider: 'keka', boardId: host.split('.')[0] };
        // Freshteam: company.freshteam.com
        if (host.endsWith('.freshteam.com')) return { provider: 'freshteam', boardId: host.split('.')[0] };
        // Zoho Recruit
        if (host === 'recruit.zoho.in' || host === 'recruit.zoho.com') return { provider: 'zohorecruit', boardId: new URL(urlStr).searchParams.get('department') ?? 'default' };
        // GreytHR: company.greythr.com
        if (host.endsWith('.greythr.com')) return { provider: 'greythr', boardId: host.split('.')[0] };
        // PeopleStrong
        if (host.endsWith('.peoplestrong.com')) return { provider: 'peoplestrong', boardId: host.split('.')[0] };
        // HROne
        if (host.endsWith('.hrone.cloud')) return { provider: 'hrone', boardId: host.split('.')[0] };
        // TurboHire
        if (host.endsWith('.turbohire.co')) return { provider: 'turbohire', boardId: host.split('.')[0] };
        // Oorwin
        if (host.endsWith('.oorwin.com')) return { provider: 'oorwin', boardId: host.split('.')[0] };
        // Zimyo
        if (host.endsWith('.zimyo.com')) return { provider: 'zimyo', boardId: host.split('.')[0] };
        // Zwayam
        if (host.endsWith('.zwayam.com')) return { provider: 'zwayam', boardId: host.split('.')[0] };
        // ISmartRecruit
        if (host.endsWith('.ismartrecruit.com')) return { provider: 'ismartrecruit', boardId: host.split('.')[0] };
        // HREasily
        if (host.endsWith('.hreasily.com')) return { provider: 'hreasily', boardId: host.split('.')[0] };
        
        return null;

    } catch {
        return null;
    }
}
