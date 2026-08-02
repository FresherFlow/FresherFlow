import { AtsJob } from '@fresherflow/plugins';

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

export async function submitJobsToApi(jobs: AtsJob[], targetCompany: string): Promise<{ saved: number; skipped: number }> {
    const apiUrl = process.env.INTERNAL_API_URL || 'http://localhost:5000';
    const apiKey = process.env.INTERNAL_API_SECRET;

    if (!apiUrl || !apiKey) {
        console.error('Missing INTERNAL_API_URL or INTERNAL_API_SECRET — cannot submit to main DB');
        return { saved: 0, skipped: jobs.length };
    }

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

        let workMode = null;
        if (job.isRemote || job.workFromHomeType?.toLowerCase() === 'remote') {
            workMode = 'REMOTE';
        } else if (job.workFromHomeType?.toLowerCase() === 'hybrid') {
            workMode = 'HYBRID';
        } else if (job.workFromHomeType) {
            workMode = 'ONSITE';
        }

        let experienceMin = job.experienceYears ?? null;
        let experienceMax = null;
        if (job.experienceRange && experienceMin === null) {
            const match = job.experienceRange.match(/(\d+)(?:\s*(?:-|to)\s*(\d+))?/i);
            if (match) {
                experienceMin = parseInt(match[1], 10);
                if (match[2]) {
                    experienceMax = parseInt(match[2], 10);
                }
            }
        }

        const payload = {
            type: 'JOB',
            title: job.title,
            company: company,
            companyWebsite: website || null,
            companyLogoUrl: logoUrl || null,
            description: job.description || '',
            allowedDegrees: [],
            allowedCourses: [],
            allowedSpecializations: [],
            allowedPassoutYears: [],
            requiredSkills: job.skills || [],
            locations: job.location ? [job.location] : [],
            structuredLocations: job.parsedLocation ? {
                city: job.parsedLocation.city || '',
                state: job.parsedLocation.region || '',
                country: job.parsedLocation.country || ''
            } : null,
            workMode: workMode,
            experienceMin: experienceMin,
            experienceMax: experienceMax,
            salaryRange: job.compensation ? `${job.compensation.minAmount || ''}-${job.compensation.maxAmount || ''} ${job.compensation.currency || ''}`.trim() : null,
            salaryMin: job.compensation?.minAmount ?? null,
            salaryMax: job.compensation?.maxAmount ?? null,
            salaryPeriod: job.compensation?.interval?.toUpperCase() || 'YEARLY',
            employmentType: (job.jobType && job.jobType.length > 0) ? job.jobType[0].toUpperCase() : (job.employmentType || null),
            jobFunction: job.jobFunction || job.department || null,
            applyLink: applyLink,
            sourceLink: job.jobUrlDirect || applyLink,
            status: 'PUBLISHED',
        };

        try {
            console.log(`Submitting to main API: ${job.title} @ ${company}`);
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
                skipped++;
            } else {
                console.log(`Submitted to API: ${job.title} @ ${company} → id=${result.id}`);
                saved++;
            }
        } catch (err) {
            console.error('Submit API call failed:', (err as Error).message);
            skipped++;
        }
    }

    return { saved, skipped };
}
