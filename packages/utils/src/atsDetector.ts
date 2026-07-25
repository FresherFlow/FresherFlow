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
        const url = rawUrl.toLowerCase();

        if (url.includes('workday') || url.includes('myworkdayjobs.com') || url.includes('myworkdaysite.com')) {
            return 'Workday';
        }
        if (url.includes('greenhouse.io') || url.includes('greenhouse')) {
            return 'Greenhouse';
        }
        if (url.includes('lever.co') || url.includes('lever')) {
            return 'Lever';
        }
        if (url.includes('ashbyhq.com') || url.includes('ashby')) {
            return 'Ashby';
        }
        if (url.includes('smartrecruiters.com') || url.includes('smartrecruiters')) {
            return 'SmartRecruiters';
        }
        if (url.includes('icims.com') || url.includes('icims')) {
            return 'iCIMS';
        }
        if (url.includes('oraclecloud.com') || url.includes('oracle')) {
            return 'Oracle HCM';
        }
        if (url.includes('successfactors.com') || url.includes('successfactors') || url.includes('sap.com')) {
            return 'SuccessFactors';
        }
        if (url.includes('eightfold.ai') || url.includes('eightfold')) {
            return 'Eightfold';
        }
        if (url.includes('darwinbox.com') || url.includes('darwinbox')) {
            return 'DarwinBox';
        }
        if (url.includes('bamboohr.com') || url.includes('bamboohr')) {
            return 'BambooHR';
        }
        if (url.includes('recruitee.com') || url.includes('recruitee')) {
            return 'Recruitee';
        }
        if (url.includes('teamtailor.com') || url.includes('teamtailor')) {
            return 'Teamtailor';
        }
        if (url.includes('workable.com') || url.includes('workable')) {
            return 'Workable';
        }
    }

    if (urls.some(Boolean)) {
        return 'Direct ATS';
    }

    return null;
}
