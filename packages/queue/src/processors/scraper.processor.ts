import { Job } from 'bullmq';

export async function processScraperJob(job: Job) {
    return job.data;
}

