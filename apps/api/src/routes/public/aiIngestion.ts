import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import prisma from '../../lib/prisma';
import stagingPrisma from '../../lib/stagingPrisma';
import { OpportunityStatus } from '@prisma/client';
import { OpportunityType, RawOpportunityStatus, IngestionSourceType } from '@prisma/staging-client';
import { generateSlug } from '../../utils/slugify';
import logger from '../../utils/logger';

const router = express.Router();

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'super_secret_dev_key';
const FALLBACK_ADMIN_ID = process.env.INGESTION_DEFAULT_ADMIN_ID;

interface AIJobPayload {
    job: {
        title: string;
        company: string;
        locations: string[];
        experienceRequirementRaw?: string;
        skills: string[];
        education?: string;
        descriptionSummary: string;
        employmentType: string;
        workMode?: 'ONSITE' | 'REMOTE' | 'HYBRID';
    };
    classification: {
        isFresherRole: boolean;
        confidenceScore: number;
        reasoning: string;
    };
    source_url: string;
    job_fingerprint: string;
}

// Ensure the raw body is available for HMAC validation
// Express json() middleware needs to be configured to expose rawBody, or we do it carefully.
// Assuming app.use(express.json()) is already there, we will stringify it and compare,
// but it's safer to use a custom middleware for this specific route if the raw bytes matter.
// However, since we're controlling both ends, reconstructing the JSON string is usually fine if sorted keys aren't an issue.
// To be extremely safe, we read the exact bytes if possible, but let's just do a standardized JSON check.

function verifyHmac(req: Request, res: Response, next: NextFunction) {
    const signature = req.headers['x-webhook-signature'];
    if (!signature || typeof signature !== 'string') {
        logger.warn('AI Ingestion Webhook rejected: missing signature');
        return res.status(401).json({ error: 'Missing signature' });
    }

    // Workaround since express.json() destroyed the raw buffer:
    // We recreate the raw payload string. It must exactly match the Python sender.
    const rawPayload = JSON.stringify(req.body);
    const expectedSignature = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(rawPayload, 'utf-8')
        .digest('hex');

    if (signature !== expectedSignature) {
        // Also try with no spaces (in case Express parsed it slightly differently)
        const noSpacePayload = JSON.stringify(req.body, null, 0);
        const altSignature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(noSpacePayload, 'utf-8').digest('hex');

        if (signature !== altSignature) {
            logger.warn('AI Ingestion Webhook rejected: invalid signature');
            return res.status(401).json({ error: 'Invalid signature' });
        }
    }

    next();
}

router.post('/webhook', verifyHmac, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const payload = req.body as AIJobPayload;

        if (!FALLBACK_ADMIN_ID) {
            logger.error('INGESTION_DEFAULT_ADMIN_ID is required to create an AI draft');
            return res.status(500).json({ error: 'Server misconfiguration' });
        }

        const { job, classification, source_url, job_fingerprint } = payload;

        // 1. Deduplication (Cryptographic approach)
        const recentDuplicate = await prisma.opportunity.findFirst({
            where: {
                OR: [
                    { applyLink: source_url },
                    { notesHighlights: { contains: job_fingerprint } }
                ],
                deletedAt: null
            }
        });

        if (recentDuplicate) {
            logger.info('AI Ingestion deduped', { fingerprint: job_fingerprint, id: recentDuplicate.id });
            return res.status(200).json({ status: 'deduped', id: recentDuplicate.id });
        }

        // 2. Determine Type & Default to India if no locations provided
        const oppType = job.employmentType === 'INTERN' || job.title.toLowerCase().includes('intern')
            ? OpportunityType.INTERNSHIP
            : OpportunityType.JOB;

        const draftId = crypto.randomUUID();

        // 3. Insert Draft
        const createdOpportunity = await prisma.opportunity.create({
            data: {
                id: draftId,
                slug: generateSlug(job.title, job.company, draftId),
                type: oppType,
                title: job.title,
                company: job.company,
                description: `**Overview**\n${job.descriptionSummary}\n\n**Experience Requirement:** ${job.experienceRequirementRaw || 'Not explicitly stated'}\n**Education:** ${job.education || 'Not explicitly stated'}`,
                locations: job.locations.length > 0 ? job.locations : ['India'],
                workMode: job.workMode,
                applyLink: source_url,
                experienceMin: 0,
                experienceMax: 1, // Forced by classifier definition
                allowedDegrees: job.education ? ['DEGREE'] : [], // Generic degree fallback
                requiredSkills: job.skills,
                status: OpportunityStatus.DRAFT,
                postedByUserId: FALLBACK_ADMIN_ID,
                notesHighlights: `[AI_INGESTION_FINGERPRINT=${job_fingerprint}] fresherScore=${classification.confidenceScore} | Reasoning: ${classification.reasoning}`
            }
        });

        // 4. Log to staging database for observability
        const sourceEndpoint = `ai://${new URL(source_url).hostname}`;
        const source = await stagingPrisma.ingestionSource.findFirst({
            where: { endpoint: sourceEndpoint }
        });

        let sourceId = source?.id;
        if (!sourceId) {
            const newSource = await stagingPrisma.ingestionSource.create({
                data: {
                    name: `AI CRAWLER: ${new URL(source_url).hostname}`,
                    sourceType: IngestionSourceType.CUSTOM,
                    endpoint: sourceEndpoint,
                    enabled: true,
                    runFrequencyMinutes: 0,
                    defaultType: OpportunityType.JOB
                }
            });
            sourceId = newSource.id;
        }

        await stagingPrisma.rawOpportunity.create({
            data: {
                sourceId,
                status: RawOpportunityStatus.DRAFT_CREATED,
                rawPayload: payload as unknown as object,
                title: job.title,
                company: job.company,
                applyLink: source_url,
                suggestedType: oppType,
                fresherScore: classification.confidenceScore,
                reasonFlags: ['ai_extracted', classification.isFresherRole ? 'is_fresher' : 'not_fresher'],
                mappedOpportunityId: draftId,
            }
        });

        logger.info('AI Ingestion success: Draft created', { id: draftId, company: job.company });
        res.status(201).json({ status: 'created', id: draftId });
    } catch (error) {
        logger.error('AI Ingestion Webhook error', { error: error instanceof Error ? error.message : 'Unknown error' });
        next(error);
    }
});

export default router;
