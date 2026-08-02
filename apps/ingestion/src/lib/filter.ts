import type { AtsJob } from '@fresherflow/plugins';

const INDIA_TERMS = ['india', 'bengaluru', 'bangalore', 'mumbai', 'delhi', 'hyderabad', 'pune', 'chennai', 'kolkata', 'ahmedabad', 'noida', 'gurugram', 'gurgaon', 'pan-india', 'remote', 'work from home', 'wfh'];

const FOREIGN = ['united states', ' usa', 'united kingdom', 'germany',
  'france', 'australia', 'canada', 'singapore', 'dubai', 'netherlands'];

const SENIOR = ['senior', 'lead', 'manager', 'director', 'vp ', 'principal', 'staff ', 'head of', 'architect'];

const FRESHER = ['fresher', 'entry level', 'entry-level', 'trainee', 'graduate', 'intern', 'junior', 'associate', '0-1 year', '0-2 year', 'new grad', 'campus', 'sde 1', 'sde-1', 'software engineer i '];

export function isIndiaOrRemote(location?: string): boolean {
  if (!location) return true;
  const l = location.toLowerCase();
  if (INDIA_TERMS.some(t => l.indexOf(t) !== -1)) return true;
  return !FOREIGN.some(t => l.indexOf(t) !== -1);
}

export function isFresherEligible(job: AtsJob): boolean {
  const text = [job.title, job.jobLevel].filter(Boolean).join(' ').toLowerCase();
  if (SENIOR.some(t => text.indexOf(t) !== -1)) return false;
  if (FRESHER.some(t => text.indexOf(t) !== -1)) return true;
  if (job.experienceYears !== undefined && job.experienceYears > 2) return false;
  return true;
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
  return freshJobs.filter(j => isIndiaOrRemote(j.location) && isFresherEligible(j));
}
