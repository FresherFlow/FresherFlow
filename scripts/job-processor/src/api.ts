import { ExtractedJob } from './normalizer';
import { createClient } from '@supabase/supabase-js';
import { resolveCompanyWebsiteAndLogo } from '@fresherflow/utils';


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

    const restUrl = process.env.SUPABASE_URL || process.env.SUPABASE_DISCOVERY_URL;
    
    if (!restUrl) {
         console.error("Missing SUPABASE_URL (needs REST API endpoint)");
         return false;
    }

    const supabase = createClient(restUrl, supabaseKey);
    const { website, logoUrl } = resolveCompanyWebsiteAndLogo(job.company, applyLink, job.companyWebsite);

    const payload = {
        type: job.type || 'JOB',
        title: job.title,
        company: job.company,
        company_id: (job as any).companyId || (job as any).company_id || null,
        company_website: website || job.companyWebsite || null,
        company_logo_url: logoUrl || null,
        description: job.description || null,
        allowed_degrees: job.allowedDegrees || [],
        allowed_courses: job.allowedCourses || [],
        allowed_specializations: job.allowedSpecializations || [],
        allowed_passout_years: job.allowedPassoutYears || [],
        required_skills: job.requiredSkills || [],
        locations: job.locations || [],
        structured_locations: job.structuredLocations || [],
        work_mode: job.workMode || null,
        experience_min: job.experienceMin !== undefined ? job.experienceMin : null,
        experience_max: job.experienceMax !== undefined ? job.experienceMax : null,
        salary_range: job.salaryRange || null,
        salary_amount: job.salaryAmount || null,
        salary_period: job.salaryPeriod || null,
        employment_type: job.employmentType || null,
        job_function: job.jobFunction || null,
        incentives: job.incentives || null,
        selection_process: job.selectionProcess || null,
        notes_highlights: job.notesHighlights || null,
        apply_link: applyLink,
        source_url: sourceLink || applyLink,
        custom_slug: job.customSlug || null,
        application_details: job.applicationDetails || null,
        walk_in_details: job.walkInDetails || null,
        status: 'PENDING_REVIEW'
    };

    try {
        console.log(`Saving to Supabase: ${job.title} @ ${job.company}`);
        
        // Check if job with this apply_link already exists in processed_jobs
        const { data: existing } = await supabase
            .from('processed_jobs')
            .select('id')
            .eq('apply_link', applyLink)
            .limit(1);

        if (existing && existing.length > 0) {
            // Update existing job
            const { error } = await supabase
                .from('processed_jobs')
                .update(payload)
                .eq('apply_link', applyLink);
                
            if (error) {
                console.error("Supabase update error:", error.message);
                return false;
            }
            console.log(`Updated existing job in Supabase successfully`);
        } else {
            // Insert new job
            const { error } = await supabase
                .from('processed_jobs')
                .insert(payload);
                
            if (error) {
                console.error("Supabase insert error:", error.message);
                return false;
            }
            console.log(`Saved to Supabase successfully`);
        }
        
        return true;
    } catch (err) {
        console.error(`Failed to save job to Supabase:`, (err as Error).message);
        return false;
    }
}


