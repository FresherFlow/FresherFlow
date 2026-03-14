import { Worker, Job } from 'bullmq';
import { redis } from '@fresherflow/redis';
import { logger } from '@fresherflow/logger';
import prisma from '@fresherflow/database';

export async function processIngestionJob(job: Job) {
    try {
        const payload = job.data.payload;
        const sourceId = payload.sourceId || 'SYSTEM_DEFAULT';
        
        logger.info(`Processing ingestion job ${job.id} for source ${sourceId}`, { payload });

        await prisma.rawOpportunity.create({
            data: {
                sourceId,
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
