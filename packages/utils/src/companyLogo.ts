import { BRAND_DOMAINS } from './domains.js';

export function extractDomain(url?: string | null): string | null {
    if (!url) return null;
    try {
        const { hostname } = new URL(url);
        return hostname.toLowerCase().replace(/^www\./, '');
    } catch {
        return null;
    }
}

export function generateCompanyLogoUrl(website?: string | null): string | null {
    const domain = extractDomain(website);
    return domain ? `https://logo.clearbit.com/${domain}` : null;
}

export interface CanonicalCompanyLookup {
    url?: string;
    logo_url?: string;
}

export function resolveCompanyWebsiteAndLogo(
    company: string,
    applyLink: string,
    extractedWebsite: string | null | undefined,
    canonical?: CanonicalCompanyLookup | null
): { website: string; logoUrl: string } {
    let website = (canonical?.url || extractedWebsite || "").trim();
    let logoUrl = (canonical?.logo_url || "").trim();

    const isAtsUrl = (urlStr: string) => {
        try {
            const h = new URL(urlStr).hostname.toLowerCase();
            return h.includes('oraclecloud') || h.includes('myworkdayjobs') || h.includes('eightfold') ||
                   h.includes('greenhouse') || h.includes('lever') || h.includes('darwinbox') ||
                   h.includes('successfactors') || h.includes('taleo') || h.includes('icims') ||
                   h.includes('jobvite') || h.includes('recruitee') || h.includes('smartrecruiters') ||
                   h.includes('ashbyhq') || h.includes('freshteam') || h.includes('keka') ||
                   h.includes('peoplestrong') || h.includes('phenom') || h.includes('bamboohr') ||
                   h.includes('workable') || h.includes('zoho') || h.includes('breezy');
        } catch {
            return false;
        }
    };

    if (!website || !website.startsWith('http') || isAtsUrl(website)) {
        try {
            const url = new URL(applyLink);
            const host = url.hostname.toLowerCase();
            
            // Handle enterprise ATS subdomains (e.g. philips.wd3.myworkdayjobs.com -> philips.com)
            if (
                host === 'myworkdayjobs.com' || host.endsWith('.myworkdayjobs.com') ||
                host === 'eightfold.ai' || host.endsWith('.eightfold.ai') ||
                host === 'greenhouse.io' || host.endsWith('.greenhouse.io') ||
                host === 'lever.co' || host.endsWith('.lever.co') ||
                host === 'darwinbox.in' || host.endsWith('.darwinbox.in') ||
                host === 'oraclecloud.com' || host.endsWith('.oraclecloud.com') ||
                host === 'successfactors.com' || host.endsWith('.successfactors.com') ||
                host === 'taleo.net' || host.endsWith('.taleo.net') ||
                host === 'icims.com' || host.endsWith('.icims.com') ||
                host === 'jobvite.com' || host.endsWith('.jobvite.com') ||
                host === 'recruitee.com' || host.endsWith('.recruitee.com') ||
                host === 'freshteam.com' || host.endsWith('.freshteam.com') ||
                host === 'keka.com' || host.endsWith('.keka.com') ||
                host === 'bamboohr.com' || host.endsWith('.bamboohr.com') ||
                host === 'workable.com' || host.endsWith('.workable.com')
            ) {
                const parts = host.split('.');
                let subdomain = parts[0];
                if ((subdomain === 'job-boards' || subdomain === 'boards') && (host === 'greenhouse.io' || host.endsWith('.greenhouse.io'))) {
                    const pathParts = url.pathname.split('/').filter(Boolean);
                    if (pathParts.length > 0) {
                        subdomain = pathParts[0];
                    }
                }
                const matchedDomain = BRAND_DOMAINS[subdomain.toLowerCase().trim()];
                if (matchedDomain) {
                    website = `https://${matchedDomain}`;
                } else {
                    website = `https://${subdomain}.com`;
                }
            } else if (isAtsUrl(applyLink)) {
                // For ATS domains where company is in the path (e.g. jobs.smartrecruiters.com/Company)
                // or we don't have a reliable subdomain extraction logic, fallback to empty to avoid corrupting db
                website = '';
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
            // Do not guess "https://${cleanName}.com" when applyLink parsing fails.
            // Leaving it empty is safer.
            website = '';
        }
    }

    if (!logoUrl) {
        try {
            const parsedUrl = new URL(website);
            const domain = parsedUrl.hostname.replace(/^www\./i, '');
            logoUrl = `https://logo.clearbit.com/${domain}`;
        } catch {
            // Ignore
        }
    }

    return { website, logoUrl };
}

