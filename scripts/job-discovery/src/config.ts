import fs from 'node:fs/promises';
import path from 'node:path';

// --- LOAD ENV ---
async function fileExists(filePath: string): Promise<boolean> {
    try { await fs.access(filePath); return true; } catch { return false; }
}

export async function loadEnv() {
    let envPath = path.join(process.cwd(), '.env');
    if (!(await fileExists(envPath))) {
        envPath = path.join(process.cwd(), '../../.env');
    }
    if (await fileExists(envPath)) {
        try {
            const envContent = await fs.readFile(envPath, 'utf8');
            for (const line of envContent.split('\n')) {
                const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
                if (match) {
                    const key = match[1];
                    let value = (match[2] || '').trim();
                    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
                    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
                    process.env[key] = value;
                }
            }
        } catch {
            // Ignore env load errors on systems where file is missing
        }
    }
}
await loadEnv();

// --- CONFIGURATION ---
export const CDN_SECRET = (process.env.CDN_SIGNATURE_SECRET || '').trim().replace(/^["']|["']$/g, '');
export const TELEGRAM_BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim().replace(/^["']|["']$/g, '').replace(/^bot/i, '');
export const TELEGRAM_CHAT_ID = (process.env.TELEGRAM_CHAT_ID || '').trim().replace(/^["']|["']$/g, '');
export const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL || 'https://cdn.fresherflow.in';

export const TARGET_SITES = [
    {
        name: 'job4freshers',
        urls: [
            'https://job4freshers.co.in/',
            'https://job4freshers.co.in/category/software-it-jobs/'
        ]
    },
    {
        name: 'frontlinesmedia',
        urls: [
            'https://frontlinesmedia.in/tag/fresher-jobs/'
        ]
    },
    {
        name: 'govtjobmart',
        urls: [
            'https://govtjobmart.in/'
        ]
    },
    {
        name: 'findmyjobss',
        urls: [
            'https://findmyjobss.com/',
            'https://findmyjobss.com/category/latest-jobs/'
        ]
    },
    {
        name: 'dailypharmajobs',
        urls: [
            'https://jobs.dailypharmajobs.in/',
            'https://jobs.dailypharmajobs.in/category/fresher-jobs/'
        ]
    },
    {
        name: 'jobsaddafreshers',
        urls: [
            'https://jobsaddafreshers.com/category/freshers/',
            'https://jobsaddafreshers.com/category/internships/'
        ]
    },
    {
        name: 'internshipss',
        urls: [
            'https://internshipss.com/',
            'https://internshipss.com/Fresher-Jobs.html',
            'https://internshipss.com/Internships.html',
            'https://internshipss.com/Remote-Jobs.html'
        ]
    },
    {
        name: 'freshersvoice',
        urls: [
            'https://www.freshersvoice.com/',
            'https://www.freshersvoice.com/it-software-jobs',
            'https://www.freshersvoice.com/off-campus-drives'
        ]
    },
    {
        name: 'placementdrive',
        urls: [
            'https://placementdrive.in/',
            'https://placementdrive.in/category/fresher-jobs',
            'https://placementdrive.in/category/internships',
            'https://placementdrive.in/category/off-campus-jobs'
        ]
    },
    {
        name: 'freshershunt',
        urls: [
            'https://freshershunt.in/',
            'https://freshershunt.in/off-campus-drive-jobs/off-campus-drive/',
            'https://freshershunt.in/off-campus-drive-jobs/work-from-home/',
            'https://freshershunt.in/off-campus-drive-jobs/internship/'
        ]
    },
    {
        name: 'fresheropenings',
        urls: [
            'https://fresheropenings.com/',
            'https://fresheropenings.com/jobs/',
            'https://fresheropenings.com/internship/'
        ]
    },
    {
        name: 'freshersjobsaadda',
        urls: [
            'https://freshersjobsaadda.blogspot.com/search'
        ]
    },
    {
        name: 'topvarsity',
        urls: [
            'https://jobs.topvarsity.in/'
        ]
    },
    {
        name: 'love2pickleball',
        urls: [
            'https://love2pickleball.com/category/hire_alert_jobs/'
        ]
    },
    {
        name: 'freshersnow',
        urls: [
            'https://www.freshersnow.com/off-campus-drives/',
            'https://www.freshersnow.com/internship-jobs/',
            'https://www.freshersnow.com/freshers-jobs/'
        ]
    },
    {
        name: 'softwaremuchatlu',
        urls: [
            'https://softwaremuchatlu.com/jobs/',
            'https://softwaremuchatlu.com/internships/'
        ]
    },
    {
        name: 'onlinestudy4u',
        urls: [
            'https://onlinestudy4u.in/category/job-updates/'
        ]
    },
    {
        name: 'merademyjobs',
        urls: [
            'https://merademyjobs.com/index.php/category/freshers/',
            'https://merademyjobs.com/index.php/category/internships/',
            'https://merademyjobs.com/index.php/category/work-from-home/',
            'https://merademyjobs.com/index.php/category/it-jobs/'
        ]
    },
    {
        name: 'fresheroffcampus',
        urls: [
            'https://www.fresheroffcampus.com/',
            'https://www.fresheroffcampus.com/category/internship-jobs/'
        ]
    },
    {
        name: 'kickcharm',
        urls: [
            'https://kickcharm.com/',
            'https://kickcharm.com/category/work-from-home/'
        ]
    },
    {
        name: 'offcampusjobdrives',
        urls: [
            'https://offcampusjobdrives.com/category/home/',
            'https://offcampusjobdrives.com/category/fresher-jobs/',
            'https://offcampusjobdrives.com/category/internships/'
        ]
    },
    {
        name: 'mohancareers',
        urls: [
            'https://mohancareers.com/',
            'https://mohancareers.com/category/private-jobs/',
            'https://mohancareers.com/category/work-from-home-jobs/'
        ]
    }
];

export const VISITED_FILE = path.join(process.cwd(), 'visited_urls.json');

export const EXPIRED_PHRASES = [
    "no longer available",
    "the job you are trying to apply for is no longer available",
    "position has been filled",
    "position closed",
    "no longer accepting applications",
    "this job is no longer accepting applications",
    "job has expired",
    "job is no longer active",
    "job posting is no longer active",
    "no longer active",
    "this job is closed",
    "requisition is closed",
    "the page you are looking for doesn't exist",
    "the job you requested was not found",
    "job not found",
    "page not found",
    "an error has occurred",
    "you can't view this job because it's not available at this time",
    "you cant view this job because it's not available at this time",
    "you cant view this job because its not available at this time",
    "you can't view this job because its not available at this time",
    "not available at this time",
    "job is not available at this time",
    "job is not available at this time.",
    "has expired",
    "no longer open",
    "this requisition is no longer accepting applications",
    "no longer accepting applications via careers",
    "please explore other open opportunities",
    "currently not accepting applications",
    "not accepting applications for this job",
    "not accepting applications for this position",
    "this job is not available",
    "job does not exist or is not currently active",
    "job does not exist",
    "is not currently active",
    "job closed",
    "role is no longer available",
    "position you're looking for may have been filled",
    "we couldn't find the job posting you're looking for",
    "we couldnt find the job posting you're looking for",
    "may have been filled or deactivated",
    "doesn't seem to exist or may have been removed",
    "doesnt seem to exist or may have been removed"
];

// Phrases indicating it's a fresher job
export const FRESHER_PHRASES = [
    "0 years",
    "0 year",
    "fresher",
    "freshers",
    "experience: 0",
    "entry level",
    "entry-level",
    "intern",
    "internship",
    "graduate",
    "graduate engineer",
    "graduate trainee",
    "trainee",
    "associate",
    "junior",
    "campus hiring",
    "off campus",
    "software engineer i",
    "sde 1",
    "analyst",
    "business analyst",
    "data analyst",
    "apprentice"
];

// Phrases indicating it's NOT a fresher job (we skip if we see these AND we don't see fresher phrases)
export const EXPERIENCED_PHRASES = [
    "1.5+ years",
    "1.5 years",
    "18+ months",
    "12+ months",
    "24+ months",
    "12 months",
    "18 months",
    "24 months",
    "1 year of exp",
    "1 year exp",
    "1+ exp",
    "2+ exp",
    "3+ exp",
    "4+ exp",
    "5+ exp",
    "6+ exp",
    "7+ exp",
    "8+ exp",
    "10+ exp"
];
