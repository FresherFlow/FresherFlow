import { ExtractedJob } from './normalizer';
import { createClient } from '@supabase/supabase-js';

export function resolveCompanyWebsiteAndLogo(
    company: string,
    applyLink: string,
    extractedWebsite: string | null | undefined
): { website: string; logoUrl: string } {
    let website = (extractedWebsite || "").trim();
    
    if (!website || !website.startsWith('http')) {
        try {
            const url = new URL(applyLink);
            const host = url.hostname.toLowerCase();
            
            // Handle enterprise ATS subdomains (e.g. philips.wd3.myworkdayjobs.com -> philips.com)
            if (
                host === 'myworkdayjobs.com' || host.endsWith('.myworkdayjobs.com') ||
                host === 'eightfold.ai' || host.endsWith('.eightfold.ai') ||
                host === 'greenhouse.io' || host.endsWith('.greenhouse.io') ||
                host === 'lever.co' || host.endsWith('.lever.co') ||
                host === 'darwinbox.in' || host.endsWith('.darwinbox.in')
            ) {
                const parts = host.split('.');
                let subdomain = parts[0];
                if ((subdomain === 'job-boards' || subdomain === 'boards') && (host === 'greenhouse.io' || host.endsWith('.greenhouse.io'))) {
                    const pathParts = url.pathname.split('/').filter(Boolean);
                    if (pathParts.length > 0) {
                        subdomain = pathParts[0];
                    }
                }
                website = `https://${subdomain}.com`;
            } else {
                // E.g. careers.cisco.com -> cisco.com
                const parts = host.split('.');
                if (parts.length >= 2) {
                    const domain = parts.slice(-2).join('.');
                    website = `https://${domain}`;
                } else {
                    website = `https://${host}`;
                }
            }
        } catch {
            const cleanName = company.toLowerCase().replace(/[^a-z0-9]/g, '');
            website = `https://${cleanName}.com`;
        }
    }

    let logoUrl = "";
    try {
        const parsedUrl = new URL(website);
        const domain = parsedUrl.hostname.replace(/^www\./i, '');
        logoUrl = `https://logo.clearbit.com/${domain}`;
    } catch {
        // Ignore
    }

    return { website, logoUrl };
}

// POST parsed job to Supabase ProcessedJobs table
export async function saveJobToSupabase(
    job: ExtractedJob,
    sourceLink: string,
    applyLink: string
): Promise<boolean> {
    const supabaseUrl = process.env.SUPABASE_DISCOVERY_DATABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
        return false;
    }

    // Need a clean base URL, assuming SUPABASE_DISCOVERY_DATABASE_URL might be a connection string
    // If it's a postgres:// connection string, we should probably rely on a direct Supabase REST API URL
    // Actually, createClient expects the REST API URL (e.g. https://xxx.supabase.co) and the Anon/Service key.
    // Let's assume SUPABASE_URL is the REST URL.
    const restUrl = process.env.SUPABASE_URL || process.env.SUPABASE_DISCOVERY_URL;
    
    if (!restUrl) {
         console.error("Missing SUPABASE_URL (needs REST API endpoint)");
         return false;
    }

    const supabase = createClient(restUrl, supabaseKey);
    const { website, logoUrl } = resolveCompanyWebsiteAndLogo(job.company, applyLink, job.companyWebsite);

    const payload = {
        type: job.type,
        title: job.title,
        company: job.company,
        company_id: (job as any).companyId || (job as any).company_id || null,
        company_website: website || job.companyWebsite || null,
        company_logo_url: logoUrl || null,
        description: job.description,
        allowed_degrees: job.allowedDegrees,
        allowed_courses: job.allowedCourses,
        allowed_specializations: job.allowedSpecializations,
        allowed_passout_years: job.allowedPassoutYears,
        required_skills: job.requiredSkills,
        locations: job.locations,
        structured_locations: job.structuredLocations,
        work_mode: job.workMode,
        experience_min: job.experienceMin,
        experience_max: job.experienceMax,
        salary_range: job.salaryRange,
        salary_amount: job.salaryAmount,
        salary_period: job.salaryPeriod,
        employment_type: job.employmentType,
        job_function: job.jobFunction,
        incentives: job.incentives,
        selection_process: job.selectionProcess,
        notes_highlights: job.notesHighlights,
        apply_link: applyLink,
        custom_slug: job.customSlug,
        application_details: job.applicationDetails,
        walk_in_details: job.walkInDetails || null,
        status: 'PENDING_REVIEW'
    };

    try {
        console.log(`Saving to Supabase: ${job.title} @ ${job.company}`);
        const { error } = await supabase
            .from('processed_jobs')
            .insert(payload);
            
        if (error) {
            console.error("Supabase insert error:", error.message);
            return false;
        }
        console.log(`Saved to Supabase successfully`);
        return true;
    } catch (err) {
        console.error(`Failed to save job to Supabase:`, (err as Error).message);
        return false;
    }
}

// POST parsed job directly to the main API → Neon DB
export async function submitJobToApi(
    job: ExtractedJob,
    sourceLink: string,
    applyLink: string
): Promise<boolean> {
    const apiUrl = process.env.API_BASE_URL;
    const apiKey = process.env.INTERNAL_API_SECRET;

    if (!apiUrl || !apiKey) {
        console.error('Missing API_BASE_URL or INTERNAL_API_SECRET — cannot submit to main DB');
        return false;
    }

    const { website, logoUrl } = resolveCompanyWebsiteAndLogo(job.company, applyLink, job.companyWebsite);

    const payload = {
        type: job.type,
        title: job.title,
        company: job.company,
        companyWebsite: website || job.companyWebsite || null,
        companyLogoUrl: logoUrl || null,
        description: job.description || '',
        allowedDegrees: job.allowedDegrees || [],
        allowedCourses: job.allowedCourses || [],
        allowedSpecializations: job.allowedSpecializations || [],
        allowedPassoutYears: job.allowedPassoutYears || [],
        requiredSkills: job.requiredSkills || [],
        locations: job.locations || [],
        structuredLocations: job.structuredLocations || null,
        workMode: job.workMode || null,
        experienceMin: job.experienceMin ?? null,
        experienceMax: job.experienceMax ?? null,
        salaryRange: job.salaryRange || null,
        salaryPeriod: (job.salaryPeriod as string) || 'YEARLY',
        employmentType: job.employmentType || null,
        jobFunction: job.jobFunction || null,
        incentives: job.incentives || null,
        selectionProcess: job.selectionProcess || null,
        notesHighlights: job.notesHighlights || null,
        applyLink: applyLink || null,
        sourceLink: sourceLink || null,
        applicationDetails: job.applicationDetails || null,
        status: 'PUBLISHED',
    };

    try {
        console.log(`Submitting to main API: ${job.title} @ ${job.company}`);
        // codeql[js/request-forgery]
        // lgtm[js/request-forgery]
        const res = await fetch(`${apiUrl}/api/opportunities/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(15000),
        });
        const result = await res.json() as { success: boolean; message?: string; id?: string };
        if (!res.ok) {
            console.error(`Submit API error (${res.status}): ${result.message}`);
            return false;
        }
        console.log(`Submitted to Neon: ${job.title} @ ${job.company} → id=${result.id}`);
        return true;
    } catch (err) {
        console.error('Submit API call failed:', (err as Error).message);
        return false;
    }
}

export function warmupApi(): void {
    const apiUrl = process.env.API_BASE_URL;
    if (!apiUrl) return;

    console.log(`Waking up main API at ${apiUrl}... (fire and forget)`);
    fetch(`${apiUrl}/api/health`, { method: 'GET' }).catch(() => {});
}
