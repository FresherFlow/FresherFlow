import { AtsJob, htmlToPlainText, markdownConverter, extractSalary, extractExperience as pluginExtractExperience } from '@fresherflow/plugins';
import { extractWorkMode, extractExperience } from '@fresherflow/parser';
import { scoreJobDescription } from '@fresherflow/domain';
import { pool } from './db.js';
import { normalizeRawJson, postProcessNormalize, jobSchema } from '@fresherflow/pipeline';
import { analyze } from '@fresherflow/utils/analytics/index';
function resolveCompanyWebsiteAndLogo(
    company: string,
    applyLink: string,
    extractedWebsite: string | null | undefined
): { website: string; logoUrl: string } {
    let website = (extractedWebsite || "").trim();
    
    if (!website || !website.startsWith('http')) {
        try {
            const url = new URL(applyLink);
            const host = url.hostname.toLowerCase();
            const parts = host.split('.');
            if (parts.length >= 2) {
                const domain = parts.slice(-2).join('.');
                website = `https://${domain}`;
            } else {
                website = `https://${host}`;
            }
        } catch {
            const cleanName = company.toLowerCase().replace(/[^a-z0-9]/g, '');
            website = cleanName ? `https://${cleanName}.com` : 'https://example.com';
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

export async function submitJobsToApi(jobs: AtsJob[], targetCompany: string): Promise<{ saved: number; skipped: number }> {
    let saved = 0;
    let skipped = 0;

    for (const job of jobs) {
        const company = job.company || targetCompany;
        const applyLink = job.applyUrl || job.applyLink || '';
        
        if (!applyLink || !job.title) {
            console.warn(`Skipping job with missing title or link: ${job.title}`);
            skipped++;
            continue;
        }

        const { website, logoUrl } = resolveCompanyWebsiteAndLogo(company, applyLink, job.companyUrl);
        const fullTextForExtraction = `${job.title} ${job.description || ''} ${job.experienceRange || ''}`;

        // Convert description to markdown
        if (job.description) {
            const md = markdownConverter(job.description);
            if (md) job.description = md;
        }

        // Extract compensation if missing
        if (!job.compensation) {
            const extractedSalary = extractSalary(fullTextForExtraction);
            if (extractedSalary && extractedSalary.minSalary) {
                job.compensation = {
                    interval: extractedSalary.interval || 'YEARLY',
                    minAmount: extractedSalary.minSalary,
                    maxAmount: extractedSalary.maxSalary || extractedSalary.minSalary,
                    currency: extractedSalary.currency || 'INR'
                };
            }
        }


        let workMode: string | null = extractWorkMode(fullTextForExtraction) ?? null;
        if (!workMode) {
            if (job.isRemote || job.workFromHomeType?.toLowerCase() === 'remote') {
                workMode = 'REMOTE';
            } else if (job.workFromHomeType?.toLowerCase() === 'hybrid') {
                workMode = 'HYBRID';
            } else if (job.workFromHomeType) {
                workMode = 'ONSITE';
            }
        }

        const parsedExp = extractExperience(fullTextForExtraction);
        const pluginExp = pluginExtractExperience(fullTextForExtraction);
        const experienceMin = job.experienceYears ?? (parsedExp.min !== undefined ? parsedExp.min : pluginExp.minExperienceYears ?? null);
        const experienceMax = parsedExp.max !== undefined ? parsedExp.max : (pluginExp.maxExperienceYears ?? null);

        // Build raw job object for normalization using normalizer.ts
        const rawJob: Record<string, unknown> = {
            type: (job.jobType && job.jobType.length > 0 && job.jobType[0].toUpperCase() === 'INTERNSHIP') ? 'INTERNSHIP' : 'JOB',
            status: 'PUBLISHED',
            title: job.title,
            company: company,
            companyWebsite: website || '',
            companyLogoUrl: logoUrl || '',
            description: job.description || '',
            allowedDegrees: job.degree ? [job.degree] : [],
            allowedCourses: [],
            allowedSpecializations: [],
            allowedPassoutYears: job.batchYear ? [parseInt(job.batchYear, 10)].filter(y => !isNaN(y)) : [],
            requiredSkills: job.skills && job.skills.length > 0 ? job.skills : [],
            locations: job.location ? [job.location] : [],
            workMode: workMode,
            experienceMin: experienceMin || 0,
            experienceMax: experienceMax || 0,
            salaryRange: job.compensation ? `${job.compensation.minAmount || ''}-${job.compensation.maxAmount || ''} ${job.compensation.currency || ''}`.trim() : '',
            salaryPeriod: job.compensation?.interval?.toUpperCase() === 'MONTHLY' ? 'MONTHLY' : (job.compensation?.interval?.toUpperCase() === 'HOURLY' ? 'HOURLY' : 'YEARLY'),
            employmentType: (job.jobType && job.jobType.length > 0) ? job.jobType[0].toUpperCase() : (job.employmentType || ''),
            jobFunction: job.jobFunction || job.department || null,
            applyLink: applyLink,
            sourceLink: job.jobUrlDirect || applyLink,
            customSlug: '',
            applicationDetails: { method: 'DIRECT', platform: '', requiredItems: [] },
        };

        try {
        const preNormalized = normalizeRawJson(rawJob);
        const parsedJob = jobSchema.parse(preNormalized);
        const normalizedJob = postProcessNormalize(parsedJob, fullTextForExtraction);

        const cleanText = job.description ? htmlToPlainText(job.description) : '';
        const fresherScore = scoreJobDescription(normalizedJob.title, cleanText).score;

        try {
            // 1. Save to discovered_jobs table
            const discoveredRes = await pool.query(
                `INSERT INTO discovered_jobs
                (source, source_type, company, title, location, apply_link, source_url, ats_type, ats_text, fresher_score, status, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PROCESSED', NOW(), NOW())
                ON CONFLICT (source, apply_link) DO UPDATE SET
                    title = EXCLUDED.title,
                    source_url = EXCLUDED.source_url,
                    updated_at = NOW()
                RETURNING id`,
                [
                    job.source || 'ATS',
                    job.sourceType || 'ATS',
                    normalizedJob.company,
                    normalizedJob.title,
                    normalizedJob.locations.length > 0 ? normalizedJob.locations.join(', ') : (job.location || null),
                    applyLink,
                    normalizedJob.sourceLink || job.jobUrlDirect || applyLink,
                    job.atsType || targetCompany,
                    normalizedJob.description || null,
                    fresherScore,
                ]
            );


            const discoveredJobId = discoveredRes.rows[0]?.id || null;

            // 2. Save to processed_jobs table
            await pool.query(
                `INSERT INTO processed_jobs 
                (discovered_job_id, type, title, company, company_website, company_logo_url, description, allowed_degrees, allowed_courses, allowed_specializations, allowed_passout_years, required_skills, locations, structured_locations, work_mode, experience_min, experience_max, salary_range, salary_period, employment_type, job_function, apply_link, source_url, status, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, 'PUBLISHED', NOW(), NOW())
                ON CONFLICT (apply_link) DO UPDATE SET
                    title = EXCLUDED.title,
                    company = EXCLUDED.company,
                    description = EXCLUDED.description,
                    allowed_degrees = EXCLUDED.allowed_degrees,
                    allowed_courses = EXCLUDED.allowed_courses,
                    allowed_specializations = EXCLUDED.allowed_specializations,
                    allowed_passout_years = EXCLUDED.allowed_passout_years,
                    required_skills = EXCLUDED.required_skills,
                    locations = EXCLUDED.locations,
                    structured_locations = EXCLUDED.structured_locations,
                    work_mode = EXCLUDED.work_mode,
                    experience_min = EXCLUDED.experience_min,
                    experience_max = EXCLUDED.experience_max,
                    updated_at = NOW()`,
                [
                    discoveredJobId,
                    normalizedJob.type || 'JOB',
                    normalizedJob.title,
                    normalizedJob.company,
                    normalizedJob.companyWebsite || null,
                    normalizedJob.companyLogoUrl || null,
                    normalizedJob.description || '',
                    normalizedJob.allowedDegrees,
                    normalizedJob.allowedCourses,
                    normalizedJob.allowedSpecializations,
                    normalizedJob.allowedPassoutYears,
                    normalizedJob.requiredSkills,
                    normalizedJob.locations,
                    normalizedJob.structuredLocations && normalizedJob.structuredLocations.length > 0
                        ? JSON.stringify(normalizedJob.structuredLocations)
                        : (job.parsedLocation ? JSON.stringify({
                            city: job.parsedLocation.city || '',
                            state: job.parsedLocation.region || '',
                            country: job.parsedLocation.country || ''
                        }) : null),
                    normalizedJob.workMode || 'ONSITE',
                    normalizedJob.experienceMin ?? 0,
                    normalizedJob.experienceMax ?? 0,
                    normalizedJob.salaryRange || null,
                    normalizedJob.salaryPeriod || 'YEARLY',
                    normalizedJob.employmentType || 'FULL_TIME',
                    normalizedJob.jobFunction || job.department || null,
                    applyLink,
                    normalizedJob.sourceLink || job.jobUrlDirect || applyLink,
                ]
            );
            console.log('[Ingestion DB] Saved:', normalizedJob.title, '@', normalizedJob.company);
            saved++;
        } catch (err: any) {
            console.error('[Ingestion DB Error]', job.title, '@', company, ':', err.message);
            skipped++;
        }
        } catch (err: any) {
            console.error('[Ingestion Normalize Error] Skipping job:', job.title, ':', err.message);
            skipped++;
        }
    }

    try {
        const analysis = analyze(jobs);
        console.log(`[Analytics] Run completed. Summary:`, JSON.stringify(analysis.summary));
    } catch (err: any) {
        console.error(`[Analytics Error] Failed to generate telemetry:`, err.message);
    }

    return { saved, skipped };
}
