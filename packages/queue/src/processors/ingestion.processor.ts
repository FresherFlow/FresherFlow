import { Worker, Job } from 'bullmq';
import { redis } from '@fresherflow/redis';
import { logger } from '@fresherflow/logger';
import prisma from '@fresherflow/database';

export async function processIngestionJob(job: Job) {
    try {
        logger.info(`Processing ingestion job ${job.id}`);
        // Create a draft opportunity or raw payload in the DB
        const payload = job.data.payload;

        await prisma.rawOpportunity.create({
            data: {
                sourceId: payload.sourceId || 'SYSTEM_DEFAULT', // Fallback or defined static
                rawPayload: payload.rawPayload,
                title: payload.title,
                company: payload.company,
                sourceLink: payload.sourceLink,
                suggestedType: payload.type || 'JOB',
                status: 'FETCHED'
            }
        });

        logger.info(`Successfully processed ingestion job ${job.id} into database`);
    } catch (error) {
        logger.error(`Error processing ingestion job ${job.id}:`, error);
        throw error;
    }
}
