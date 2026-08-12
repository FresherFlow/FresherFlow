export type AtsProvider =
    | 'Workday'
    | 'Greenhouse'
    | 'Lever'
    | 'Ashby'
    | 'SmartRecruiters'
    | 'iCIMS'
    | 'Oracle HCM'
    | 'SuccessFactors'
    | 'Eightfold'
    | 'DarwinBox'
    | 'BambooHR'
    | 'Recruitee'
    | 'Teamtailor'
    | 'Workable'
    | 'Direct ATS';

/**
 * Detects ATS provider from website, apply link, or source links.
 */
export function detectAtsProvider(urls: (string | null | undefined)[]): AtsProvider | null {
    for (const rawUrl of urls) {
        if (!rawUrl) continue;
        let hostname = '';
        try {
            hostname = new URL(rawUrl).hostname.toLowerCase();
        } catch {
            continue;
        }

        if (hostname.includes('workday') || hostname === 'myworkdayjobs.com' || hostname.endsWith('.myworkdayjobs.com') || hostname === 'myworkdaysite.com' || hostname.endsWith('.myworkdaysite.com')) {
            return 'Workday';
        }
        if (hostname === 'greenhouse.io' || hostname.endsWith('.greenhouse.io') || hostname.includes('greenhouse')) {
            return 'Greenhouse';
        }
        if (hostname === 'lever.co' || hostname.endsWith('.lever.co') || hostname.includes('lever')) {
            return 'Lever';
        }
        if (hostname === 'ashbyhq.com' || hostname.endsWith('.ashbyhq.com') || hostname.includes('ashby')) {
            return 'Ashby';
        }
        if (hostname === 'smartrecruiters.com' || hostname.endsWith('.smartrecruiters.com') || hostname.includes('smartrecruiters')) {
            return 'SmartRecruiters';
        }
        if (hostname === 'icims.com' || hostname.endsWith('.icims.com') || hostname.includes('icims')) {
            return 'iCIMS';
        }
        if (hostname === 'oraclecloud.com' || hostname.endsWith('.oraclecloud.com') || hostname.includes('oracle')) {
            return 'Oracle HCM';
        }
        if (hostname === 'successfactors.com' || hostname.endsWith('.successfactors.com') || hostname.includes('successfactors') || hostname === 'sap.com' || hostname.endsWith('.sap.com')) {
            return 'SuccessFactors';
        }
        if (hostname === 'eightfold.ai' || hostname.endsWith('.eightfold.ai') || hostname.includes('eightfold')) {
            return 'Eightfold';
        }
        if (hostname === 'darwinbox.com' || hostname.endsWith('.darwinbox.com') || hostname.includes('darwinbox')) {
            return 'DarwinBox';
        }
        if (hostname === 'bamboohr.com' || hostname.endsWith('.bamboohr.com') || hostname.includes('bamboohr')) {
            return 'BambooHR';
        }
        if (hostname === 'recruitee.com' || hostname.endsWith('.recruitee.com') || hostname.includes('recruitee')) {
            return 'Recruitee';
        }
        if (hostname === 'teamtailor.com' || hostname.endsWith('.teamtailor.com') || hostname.includes('teamtailor')) {
            return 'Teamtailor';
        }
        if (hostname === 'workable.com' || hostname.endsWith('.workable.com') || hostname.includes('workable')) {
            return 'Workable';
        }
    }

    if (urls.some(Boolean)) {
        return 'Direct ATS';
    }

    return null;
}
