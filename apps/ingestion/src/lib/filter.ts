import { AtsJob, htmlToPlainText } from '@fresherflow/plugins';
import {
    isLocationIndiaOrRemote,
    hasFresherKeyword,
    isActualJob,
    isPotentialFresherJob,
    isSeniorJob,
    isFresherJob
} from '@fresherflow/utils';

export function isIndiaOrRemote(location?: string, title?: string): boolean {
    return isLocationIndiaOrRemote(location || '', title || '');
}

export function isFresherEligible(job: AtsJob): boolean {
    if (!job.title) return false;

    const cleanDescription = job.description ? htmlToPlainText(job.description) : '';
    const fullText = [job.title, job.jobLevel, cleanDescription].filter(Boolean).join(' ');


    // 1. Is location India or Remote?
    if (!isLocationIndiaOrRemote(job.location || '', job.title)) {
        return false;
    }

    // 2. Is it an actual job post (not a course, syllabus, exam result, or study material)?
    if (!isActualJob(job.title) && !hasFresherKeyword(fullText)) {
        return false;
    }

    // 3. Reject obvious senior titles (Senior, Lead, Manager, Director, VP, Architect, Level II/III/IV)
    if (!isPotentialFresherJob(job.title)) {
        return false;
    }

    // 4. Reject if text contains senior experience requirements (3+ years, 5+ yrs, etc.)
    if (isSeniorJob(fullText)) {
        return false;
    }

    // 5. Reject if explicit experienceYears is provided and > 2
    if (job.experienceYears !== undefined && job.experienceYears > 2) {
        return false;
    }

    // 6. Must pass fresher regex patterns or defaults
    return isFresherJob(fullText);
}

export function filterStaleJobs(jobs: AtsJob[], hoursOld: number = 336): AtsJob[] {
    const cutoff = Date.now() - hoursOld * 60 * 60 * 1000;
    return jobs.filter(job => {
        if (!job.postedAt) return true;
        const timestamp = new Date(job.postedAt).getTime();
        if (isNaN(timestamp)) return true;
        return timestamp >= cutoff;
    });
}

export function applyFilter(jobs: AtsJob[], hoursOld?: number): AtsJob[] {
    const freshJobs = hoursOld ? filterStaleJobs(jobs, hoursOld) : jobs;
    return freshJobs.filter(j => isFresherEligible(j));
}

