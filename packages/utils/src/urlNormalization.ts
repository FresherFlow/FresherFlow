/**
 * Normalizes a job opportunity URL by removing tracking parameters, UTM tags, and fragments.
 * This helps in deduplication and cleaner sharing.
 */
export const normalizeOpportunityUrl = (url: string): string => {
    if (!url) return '';

    try {
        // Basic clean
        let clean = url.trim();

        // Handle protocols
        if (!clean.startsWith('http')) {
            clean = 'https://' + clean;
        }

        const urlObj = new URL(clean);

        // Only strip tracking/anchor fragments — preserve SPA hash routes (e.g. #/signup/...)
        if (urlObj.hash && !urlObj.hash.startsWith('#/')) {
            urlObj.hash = '';
        }

        // Parameters to strip (UTM, tracking, referrals)
        const stripParams = [
            'utm_source',
            'utm_medium',
            'utm_campaign',
            'utm_term',
            'utm_content',
            'utm_id',
            'utm_source_platform',
            'utm_creative_format',
            'utm_marketing_tactic',
            'trackingId',
            'ref',
            'ref_',
            'fbclid',
            'gclid',
            'msclkid',
            '_hsenc',
            '_hsmi',
            'mc_cid',
            'mc_eid',
            'igshid',
            'source',
            'medium',
            'campaign',
            'referrer',
            'origin',
            's',
            'sid',
            'qid',
            'shareId',
            '_branch_match_id',
            'mctx'
        ];

        stripParams.forEach(param => {
            urlObj.searchParams.delete(param);
        });

        // Remove any parameter that starts with utm_, ref_, tracking, or looks like a tracker
        const allKeys = Array.from(urlObj.searchParams.keys());
        allKeys.forEach(key => {
            const lowKey = key.toLowerCase();
            if (
                lowKey.startsWith('utm_') ||
                lowKey.startsWith('ref_') ||
                lowKey.startsWith('tracking') ||
                lowKey === 'source' ||
                lowKey === 'referrer'
            ) {
                urlObj.searchParams.delete(key);
            }
        });

        // 1. LinkedIn Canonicalization
        const hostname = urlObj.hostname.toLowerCase();
        if (hostname.includes('linkedin.com')) {
            // Extract job ID from /jobs/view/123 or /jobs/view/slug-123
            const jobMatch = urlObj.pathname.match(/\/jobs\/(?:view|collections\/v2)\/.*?(\d+)/) ||
                             urlObj.pathname.match(/\/jobs\/view\/(\d+)/);
            if (jobMatch && jobMatch[1]) {
                urlObj.pathname = `/jobs/view/${jobMatch[1]}`;
                urlObj.hostname = 'www.linkedin.com';
                // Remove all query params for LinkedIn canonical
                const keys = Array.from(urlObj.searchParams.keys());
                keys.forEach(k => urlObj.searchParams.delete(k));
            }
        }

        // 2. Naukri Canonicalization
        if (hostname.includes('naukri.com')) {
            // Extract job ID from /job-listings-...-123
            const jobMatch = urlObj.pathname.match(/-(\d{10,15})(?:[^\d]|$)/);
            if (jobMatch && jobMatch[1]) {
                urlObj.pathname = `/job-listings-${jobMatch[1]}`;
                urlObj.hostname = 'www.naukri.com';
                // Remove all query params
                const keys = Array.from(urlObj.searchParams.keys());
                keys.forEach(k => urlObj.searchParams.delete(k));
            }
        }

        // Aggressive normalization for known job boards where IDs are in path
        const aggressiveDomains = [
            'linkedin.com',
            'naukri.com',
            'foundit.in',
            'internshala.com',
            'hirist.com',
            'hirist.tech',
            'wellfound.com',
            'glassdoor.co.in',
            'glassdoor.com',
            'indeed.com',
            'lever.co',
            'greenhouse.io',
            'ashbyhq.com',
            'breezy.hr',
            'workable.com'
        ];

        if (aggressiveDomains.some(domain => hostname.includes(domain))) {
            // For these major platforms, we know the job ID is in the path.
            // We strip ALL query params to ensure absolute uniqueness.
            const keys = Array.from(urlObj.searchParams.keys());
            keys.forEach(key => {
                // Keep 'id' just in case, though most use path
                if (key !== 'id' && key !== 'jk' && key !== 'jobId') {
                    urlObj.searchParams.delete(key);
                }
            });
        }

        // Normalize hostname to lowercase
        urlObj.hostname = urlObj.hostname.toLowerCase();

        // Remove trailing slash for consistency (except for root domain)
        let result = urlObj.toString();
        if (result.endsWith('/') && urlObj.pathname === '/') {
            result = result.slice(0, -1);
        } else if (result.endsWith('/') && urlObj.pathname.length > 1) {
            result = result.slice(0, -1);
        }

        // Final trim of any remaining spaces
        return result.trim();
    } catch {
        // If URL parsing fails, return trimmed original
        return url.trim();
    }
};
