import PendingTool from './components/PendingTool';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Pending Opportunities - FresherFlow Admin',
    description: 'Verify and view pending jobs',
    robots: {
        index: false,
        follow: false,
    },
};

export const dynamic = 'force-dynamic';

export default async function PendingJobsPage() {
    let initialJobs: any[] = [];
    let initialRuns: any[] = [];

    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

    if (supabaseUrl && supabaseKey) {
        try {
            // Server-side fetch for processed jobs (up to 200 items across statuses)
            const resJobs = await fetch(`${supabaseUrl}/rest/v1/processed_jobs?order=created_at.desc&limit=200`, {
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                },
                next: { revalidate: 0 } // ensure dynamic data
            });

            if (resJobs.ok) {
                const raw = await resJobs.json();
                initialJobs = raw.map((job: any) => {
                    const applyLink = job.apply_link || '';
                    let domain = '';
                    try {
                        if (applyLink) {
                            domain = new URL(applyLink).hostname.toLowerCase().replace(/^www\./, '');
                        }
                    } catch {}

                    return {
                        ...job,
                        applyLink: job.apply_link,
                        url: job.apply_link,
                        fresherScore: job.fresher_score,
                        companyLogoUrl: job.company_logo_url || (domain ? `https://icons.duckduckgo.com/ip3/${domain}.ico` : undefined),
                        sourceType: job.type || 'JOB',
                        source: job.company,
                        createdAt: job.created_at,
                        status: job.status || 'PENDING_REVIEW',
                    };
                });
            }

            // Server-side fetch for crawler runs (up to 30 runs)
            const resRuns = await fetch(`${supabaseUrl}/rest/v1/discovery_runs?order=started_at.desc&limit=30`, {
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                },
                next: { revalidate: 0 }
            });

            if (resRuns.ok) {
                initialRuns = await resRuns.json();
            }
        } catch (err) {
            console.error('Error fetching initial pending jobs from Supabase:', err);
        }
    }

    return (
        <div className="flex-1 w-full p-0 sm:p-4 lg:p-6 max-w-[1600px] mx-auto flex flex-col h-[calc(100vh)] lg:h-screen min-h-0 overflow-hidden">
            <PendingTool initialJobs={initialJobs} initialRuns={initialRuns} />
        </div>
    );
}

