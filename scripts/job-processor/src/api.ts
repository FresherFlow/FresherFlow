import { ExtractedJob, upsertProcessedJob } from '@fresherflow/pipeline';

// POST parsed job to ingestion postgres processed_jobs table
export async function saveJobToSupabase(
    job: ExtractedJob,
    sourceLink: string,
    applyLink: string
): Promise<boolean> {
    console.log(`Saving to DB: ${job.title} @ ${job.company}`);
    return upsertProcessedJob(job, sourceLink, applyLink);
}
