import { createClient } from '@supabase/supabase-js';

export interface DiscoveredJobRow {
    id: string;
    apply_link: string;
    source: string;
    company: string;
    title: string;
    ats_text?: string;
    description?: string;
    location?: string;
    location_city?: string;
    is_remote?: boolean;
    experience_years?: number;
    employment_type?: string;
    skills?: string; // JSON string
    posted_at?: string;
    batch_year?: string;
    degree?: string;
    department?: string;
    status: string;
}

function getSupabaseClient() {
    const sbUrl = process.env.SUPABASE_URL || process.env.SUPABASE_DISCOVERY_URL;
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!sbUrl || !sbKey) {
        throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing');
    }
    return createClient(sbUrl, sbKey, { auth: { persistSession: false } });
}

export async function fetchUnprocessedFromSupabase(limit = 100): Promise<DiscoveredJobRow[]> {
    const sb = getSupabaseClient();
    const { data: rows, error } = await sb
        .from('discovered_jobs')
        .select('id, apply_link, source, company, title, ats_text, description, location, location_city, is_remote, experience_years, employment_type, skills, posted_at, batch_year, degree, department, status')
        .eq('status', 'DISCOVERED')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        throw new Error(`Supabase fetch error: ${error.message}`);
    }
    
    return (rows || []) as DiscoveredJobRow[];
}

export async function markDiscoveredJobStatus(
    id: string,
    status: 'PROCESSING' | 'PROCESSED' | 'REJECTED' | 'FAILED'
): Promise<void> {
    const sb = getSupabaseClient();
    const { error } = await sb
        .from('discovered_jobs')
        .update({ status })
        .eq('id', id);

    if (error) {
        console.warn(`[SUPABASE] Failed to mark job ${id} as ${status}: ${error.message}`);
    }
}
