'use server';

import prisma from '@fresherflow/database';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export async function submitJobLinkAction(
    url: string, 
    source: string, 
    details?: {
        title?: string;
        company?: string;
        contact?: string;
        description?: string;
    },
    userContext?: {
        userId?: string;
        username?: string;
    }
) {
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
        return { error: 'Valid URL is required' };
    }

    try {
        let ingestionSource = await prisma.ingestionSource.findFirst({
            where: { name: 'Crowdsourced Links' }
        });

        if (!ingestionSource) {
            ingestionSource = await prisma.ingestionSource.create({
                data: {
                    name: 'Crowdsourced Links',
                    sourceType: 'CUSTOM',
                    endpoint: 'Public Submissions',
                    defaultType: 'JOB',
                }
            });
        }

        const reasonFlags = ['CROWDSOURCED', `submitted_by:${source}`];
        if (userContext?.username) {
            reasonFlags.push(`username:${userContext.username}`);
        }

        const cookieStore = await cookies();
        let anonId = cookieStore.get('anon_id')?.value;
        
        let finalUserId = userContext?.userId;
        if (!finalUserId) {
            if (!anonId) {
                anonId = crypto.randomUUID();
                cookieStore.set('anon_id', anonId, { 
                    httpOnly: true, 
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                    maxAge: 60 * 60 * 24 * 365 
                });
            }
            
            // Look up or create the anonymous user
            let guestUser = await prisma.user.findUnique({ where: { anon_id: anonId } });
            if (!guestUser) {
                guestUser = await prisma.user.create({
                    data: {
                        isAnonymous: true,
                        anon_id: anonId,
                    }
                });
            }
            finalUserId = guestUser.id;
        }

        const rawPayload: any = { url, source, submittedAt: new Date().toISOString() };
        if (details) {
            Object.assign(rawPayload, details);
        }

        await prisma.rawOpportunity.create({
            data: {
                sourceId: ingestionSource.id as string,
                sourceLink: url,
                status: 'FETCHED',
                reasonFlags,
                title: details?.title || undefined,
                company: details?.company || undefined,
                createdByUserId: finalUserId || undefined,
                rawPayload,
            }
        });

        // Also sync to discovered_jobs for automated bot processing
        try {
            await prisma.$executeRawUnsafe(
                `INSERT INTO public.discovered_jobs (url, title, company, source, status, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, 'PENDING', NOW(), NOW())
                 ON CONFLICT (url) DO NOTHING;`,
                url,
                details?.title || 'Community Opportunity',
                details?.company || 'Community / Recruiter',
                `community:${source}`
            );
        } catch {
            // Non-fatal if discovered_jobs table is handled separately or doesn't exist
        }

        return { success: true };
    } catch (error: any) {
        return { error: error.message || 'Failed to submit' };
    }
}

export async function getSubmissionHistoryAction(userId?: string) {
    try {
        let finalUserId = userId;
        
        if (!finalUserId) {
            const cookieStore = await cookies();
            const anonId = cookieStore.get('anon_id')?.value;
            if (anonId) {
                const guestUser = await prisma.user.findUnique({ where: { anon_id: anonId } });
                if (guestUser) {
                    finalUserId = guestUser.id;
                }
            }
        }
        
        if (!finalUserId) return { submissions: [] };

        const submissions = await prisma.rawOpportunity.findMany({
            where: { createdByUserId: finalUserId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                sourceLink: true,
                title: true,
                company: true,
                status: true,
                createdAt: true,
                mappedOpportunityId: true,
            },
            take: 50
        });
        return { submissions };
    } catch (error: any) {
        return { error: 'Failed to fetch history' };
    }
}
