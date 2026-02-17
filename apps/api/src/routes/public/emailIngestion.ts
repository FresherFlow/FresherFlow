import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient, IngestionSourceType, RawOpportunityStatus } from '@prisma/client';
import { z } from 'zod';
import { AppError } from '../../middleware/errorHandler';
import logger from '../../utils/logger';

const router = express.Router();
const prisma = new PrismaClient();

const emailIngestionSchema = z.object({
    sourceLabel: z.string().min(1).max(100).default('company_email'),
    envelope: z.object({
        from: z.string().trim().min(3),
        to: z.string().trim().min(3)
    }),
    messageId: z.string().optional().nullable(),
    subject: z.string().optional().default(''),
    text: z.string().optional().default(''),
    html: z.string().optional().default(''),
    links: z.array(z.string()).optional().default([]),
    receivedAt: z.string().datetime().optional()
});

function normalizeLinks(links: string[]): string[] {
    if (!links.length) return [];
    const normalized = new Set<string>();

    for (const raw of links) {
        const candidate = raw.trim();
        if (!candidate) continue;
        try {
            const parsed = new URL(candidate);
            if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
                normalized.add(parsed.toString());
            }
        } catch {
            // Ignore malformed links from email HTML extraction.
        }
    }

    return Array.from(normalized);
}

function extractApplyLink(links: string[]): string | undefined {
    if (!links.length) return undefined;
    return links[0];
}

function extractTitle(subject: string): string | undefined {
    const normalized = subject.trim();
    if (!normalized) return undefined;
    return normalized.slice(0, 200);
}

function extractCompanyFromSender(sender: string): string | undefined {
    const domain = sender.split('@')[1]?.toLowerCase();
    if (!domain) return undefined;
    const root = domain.split('.')[0];
    if (!root) return undefined;
    return root.replace(/[-_]/g, ' ').replace(/\b\w/g, (s) => s.toUpperCase());
}

router.post('/email', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.header('authorization') || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
        const expected = process.env.INGESTION_WORKER_TOKEN || '';

        if (!token || !expected || token !== expected) {
            return next(new AppError('Unauthorized ingestion request', 401));
        }

        const parsedResult = emailIngestionSchema.safeParse(req.body);
        if (!parsedResult.success) {
            logger.error('Invalid email ingestion payload', {
                issues: parsedResult.error.issues.map((issue) => ({
                    path: issue.path.join('.'),
                    message: issue.message
                })),
                bodyType: typeof req.body
            });
            return next(new AppError('Invalid email ingestion payload', 400));
        }
        const parsed = parsedResult.data;

        const source = await prisma.ingestionSource.upsert({
            where: { id: 'email-ingestion-source' },
            update: {
                enabled: true,
                sourceType: IngestionSourceType.CUSTOM,
                endpoint: 'email://sources@fresherflow.in',
                lastRunAt: new Date(),
                updatedAt: new Date()
            },
            create: {
                id: 'email-ingestion-source',
                name: 'Email Ingestion',
                sourceType: IngestionSourceType.CUSTOM,
                endpoint: 'email://sources@fresherflow.in',
                enabled: true,
                runFrequencyMinutes: 5,
                defaultType: 'JOB'
            }
        });

        const links = normalizeLinks(parsed.links || []);
        const title = extractTitle(parsed.subject || '');
        const company = extractCompanyFromSender(parsed.envelope.from);
        const applyLink = extractApplyLink(links);

        const rawPayload = {
            sourceLabel: parsed.sourceLabel,
            envelope: parsed.envelope,
            messageId: parsed.messageId || null,
            subject: parsed.subject || '',
            text: parsed.text || '',
            html: parsed.html || '',
            links,
            receivedAt: parsed.receivedAt || new Date().toISOString()
        };

        const created = await prisma.rawOpportunity.create({
            data: {
                sourceId: source.id,
                status: RawOpportunityStatus.FETCHED,
                sourceExternalId: parsed.messageId || undefined,
                rawPayload: rawPayload as unknown as object,
                title,
                company,
                applyLink
            }
        });

        logger.info('Email ingestion accepted', {
            rawOpportunityId: created.id,
            sourceLabel: parsed.sourceLabel,
            from: parsed.envelope.from,
            links: links.length
        });

        res.status(202).json({
            ok: true,
            rawOpportunityId: created.id
        });
    } catch (error) {
        next(error);
    }
});

export default router;
