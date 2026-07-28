import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
    
    // Graceful fallback to avoid 500 when credentials are missing locally
    if (!supabaseUrl || !supabaseKey) {
        console.warn('Missing Supabase credentials for pending jobs API.');
        return NextResponse.json({ jobs: [], runs: [] }, { status: 200 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const statusParam = searchParams.get('status');

        let jobsQuery = `${supabaseUrl}/rest/v1/processed_jobs?order=created_at.desc&limit=200`;
        if (statusParam && statusParam !== 'all') {
            jobsQuery = `${supabaseUrl}/rest/v1/processed_jobs?status=eq.${encodeURIComponent(statusParam)}&order=created_at.desc&limit=200`;
        }

        // Fetch processed jobs from Supabase
        const resJobs = await fetch(jobsQuery, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
            },
        });

        if (!resJobs.ok) {
            const errText = await resJobs.text();
            throw new Error(`Failed to fetch discovered jobs: ${errText}`);
        }

        const jobs = await resJobs.json();
        
        // Compute domain for logos
        const mappedJobs = jobs.map((job: any) => {
            const applyLink = job.apply_link || '';
            let domain = '';
            try {
                if (applyLink) {
                    domain = new URL(applyLink).hostname.toLowerCase().replace(/^www\./, '');
                }
            } catch {}

            return {
                ...job,
                companyLogoUrl: job.company_logo_url || (domain ? `https://icons.duckduckgo.com/ip3/${domain}.ico` : undefined),
                createdAt: job.created_at,
                applyLink: job.apply_link,
                sourceType: job.type || 'JOB',
                status: job.status || 'PENDING_REVIEW',
            };
        });

        // Fetch recent crawler runs from Supabase discovery_runs table
        const resRuns = await fetch(`${supabaseUrl}/rest/v1/discovery_runs?order=started_at.desc&limit=30`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
            },
        });

        const runs = resRuns.ok ? await resRuns.json() : [];

        return NextResponse.json({ jobs: mappedJobs, runs }, { status: 200 });
    } catch (error: any) {
        console.error('Error fetching pending data from Supabase:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch pending data' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json({ error: 'Supabase credentials missing' }, { status: 500 });
    }

    try {
        const body = await request.json();
        const { id, status } = body;
        
        if (!id || !status) {
            return NextResponse.json({ error: 'Missing job ID or status' }, { status: 400 });
        }

        // Update status in Supabase processed_jobs table
        const res = await fetch(`${supabaseUrl}/rest/v1/processed_jobs?id=eq.${encodeURIComponent(id)}`, {
            method: 'PATCH',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({ status, updated_at: new Date().toISOString() })
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Failed to update job status: ${errText}`);
        }

        const updated = await res.json();
        return NextResponse.json({ success: true, job: updated[0] || { id, status } }, { status: 200 });
    } catch (error: any) {
        console.error('Error updating pending job in Supabase:', error);
        return NextResponse.json({ error: error.message || 'Failed to update job' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json({ error: 'Supabase credentials missing' }, { status: 500 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        
        if (!id) {
            return NextResponse.json({ error: 'Missing job ID' }, { status: 400 });
        }

        // Delete from Supabase processed_jobs table where id matches
        const res = await fetch(`${supabaseUrl}/rest/v1/processed_jobs?id=eq.${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
            },
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Failed to delete job: ${errText}`);
        }

        return NextResponse.json({ success: true, id }, { status: 200 });
    } catch (error: any) {
        console.error('Error deleting pending job from Supabase:', error);
        return NextResponse.json({ error: error.message || 'Failed to delete job' }, { status: 500 });
    }
}

