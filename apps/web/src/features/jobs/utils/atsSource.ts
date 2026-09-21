/**
 * Canonical opportunity → source display name.
 *
 * Single home for the "Source" taxonomy used by the jobs Source filter
 * (`FilterDropdownBar`, feed aggregates) and the companies directory.
 * Maps applyLink || sourceLink || companyWebsite to names like
 * Greenhouse, Naukri, Careers, Website. Keep in sync — do not duplicate.
 */
export const getAtsName = (link?: string | null) => {
    if (!link) return null;
    try {
        const url = new URL(link);
        const host = url.hostname.toLowerCase();

        // CodeQL [js/incomplete-url-substring-sanitization] false positive — display only

        if (host.includes('greenhouse.io')) return 'Greenhouse';
        if (host.includes('lever.co')) return 'Lever';
        if (host.includes('myworkdayjobs.com') || host.includes('workday.com')) return 'Workday';
        if (host.includes('ashbyhq.com')) return 'Ashby';
        if (host.includes('bamboohr.com')) return 'BambooHR';
        if (host.includes('breezy.hr')) return 'BreezyHR';
        if (host.includes('smartrecruiters.com')) return 'SmartRecruiters';
        if (host.includes('workable.com')) return 'Workable';
        if (host.includes('icims.com')) return 'iCIMS';
        if (host.includes('jobvite.com')) return 'Jobvite';
        if (host.includes('recruitee.com')) return 'Recruitee';
        if (host.includes('phenompro.com') || host.includes('phenom.com')) return 'Phenom';
        if (host.includes('taleo.net')) return 'Taleo';
        if (host.includes('successfactors.com') || host.includes('successfactors.eu')) return 'SuccessFactors';
        if (host.includes('darwinbox.in') || host.includes('darwinbox.com')) return 'Darwinbox';
        if (host.includes('eightfold.ai')) return 'Eightfold';
        if (host.includes('mercor.com')) return 'Mercor';
        if (host.includes('keka.com')) return 'Keka';
        if (host.includes('oraclecloud.com')) return 'Oracle';

        if (host.includes('internshala.com')) return 'Internshala';
        if (host.includes('linkedin.com')) return 'LinkedIn';
        if (host.includes('wellfound.com') || host.includes('angel.co')) return 'Wellfound';
        if (host.includes('naukri.com')) return 'Naukri';
        if (host.includes('instahyre.com')) return 'Instahyre';
        if (host.includes('unstop.com')) return 'Unstop';

        if (host.includes('amazon.jobs')) return 'Amazon';
        if (host.includes('careers.google.com')) return 'Google';
        if (host.includes('apple.com')) return 'Apple';
        if (host.includes('metacareers.com')) return 'Meta';
        if (host.includes('microsoft.com')) return 'Microsoft';
        if (host.includes('oraclecloud.com')) return 'Oracle';
        if (host.includes('keka.com')) return 'Keka';

        const path = url.pathname.toLowerCase();
        if (host.includes('careers.') || host.includes('jobs.') || path.includes('/careers') || path.includes('/jobs') || host.includes('careers')) {
            return 'Careers';
        }
    } catch {}
    return 'Website';
};
