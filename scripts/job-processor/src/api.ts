import { ExtractedJob } from './normalizer';

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
                host.includes('myworkdayjobs.com') ||
                host.includes('eightfold.ai') ||
                host.includes('greenhouse.io') ||
                host.includes('lever.co') ||
                host.includes('darwinbox.in')
            ) {
                const parts = host.split('.');
                const subdomain = parts[0];
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

// POST parsed job to FresherFlow API
export async function postJobToApi(
    job: ExtractedJob,
    sourceLink: string,
    applyLink: string,
    apiBaseUrl: string
): Promise<boolean> {
    const url = `${apiBaseUrl}/api/opportunities/submit`;

    const { website, logoUrl } = resolveCompanyWebsiteAndLogo(job.company, applyLink, job.companyWebsite);

    // Clean applicationDetails — only keep non-empty fields
    let cleanedAppDetails: Record<string, unknown> | null = null;
    if (job.applicationDetails && typeof job.applicationDetails === 'object') {
        const ad = job.applicationDetails;
        cleanedAppDetails = { method: ad.method || 'DIRECT' };
        if (ad.platform) cleanedAppDetails.platform = ad.platform;
        if (ad.estimatedMinutes) cleanedAppDetails.estimatedMinutes = ad.estimatedMinutes;
        if (ad.requiredItems && ad.requiredItems.length > 0) cleanedAppDetails.requiredItems = ad.requiredItems;
    }

    const payload = {
        ...job,
        companyWebsite: website || job.companyWebsite || null,
        companyLogoUrl: logoUrl || null,
        sourceLink: null,
        applyLink,
        applicationDetails: cleanedAppDetails
    };

    try {
        console.log(`POSTing to backend API: ${url}`);
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.INTERNAL_API_SECRET || '',
            },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            let errorMessage = res.statusText;
            try {
                const body = await res.json() as Record<string, unknown>;
                if (body && typeof body.message === 'string') {
                    errorMessage = body.message;
                }
            } catch {
                // Ignore parsing errors
            }
            console.error(`API response failed (${res.status}):`, errorMessage);
            return false;
        }

        let successMessage = "Submitted successfully";
        try {
            const data = await res.json() as Record<string, unknown>;
            if (data && typeof data.message === 'string') {
                successMessage = data.message;
            }
        } catch {
            // Ignore parsing errors
        }
        console.log(`API response success:`, successMessage);
        return true;
    } catch (err) {
        console.error(`Failed to POST job to API:`, (err as Error).message);
        return false;
    }
}
