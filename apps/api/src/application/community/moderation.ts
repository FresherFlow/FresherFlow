import prisma from '../../infrastructure/database/prisma';
import { AppError } from '../../middleware/errorHandler';
import { CommunityPostStatus } from '@fresherflow/database';

export type CommunityModerationKind = 'interview' | 'update' | 'hiring-post';

export type CommunityModerationStatus = 'ACTIVE' | 'ARCHIVED' | 'DELETED';

const OPPORTUNITY_SELECT = {
    id: true,
    slug: true,
    title: true,
    company: true,
} as const;

const AUTHOR_SELECT = {
    id: true,
    fullName: true,
    username: true,
} as const;

/**
 * Review queue for community contributions that have no PENDING_REVIEW gate:
 * interview experiences, application updates, and HIRING_UPDATE posts go live
 * immediately, so moderators triage newest-first and remove what is spam or
 * inappropriate. Jobs and resources keep their existing PENDING_REVIEW queues.
 */
export async function listCommunityModerationQueue(input: {
    kind: CommunityModerationKind;
    status: CommunityModerationStatus;
    page?: number;
    limit?: number;
}) {
    const page = Math.max(input.page ?? 1, 1);
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 50);
    const skip = (page - 1) * limit;

    if (input.kind === 'interview') {
        const where = { status: input.status as CommunityPostStatus };
        const [items, total] = await Promise.all([
            prisma.interviewExperience.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                select: {
                    id: true,
                    role: true,
                    difficulty: true,
                    result: true,
                    status: true,
                    createdAt: true,
                    author: { select: AUTHOR_SELECT },
                    opportunity: { select: OPPORTUNITY_SELECT },
                },
            }),
            prisma.interviewExperience.count({ where }),
        ]);
        return { kind: input.kind, status: input.status, items, total, page, limit };
    }

    if (input.kind === 'update') {
        // ApplicationUpdate has no status column: every row is live, and the
        // only moderation action is delete. The status filter is accepted for a
        // stable API shape but only ACTIVE returns rows.
        if (input.status !== 'ACTIVE') {
            return { kind: input.kind, status: input.status, items: [], total: 0, page, limit };
        }
        const [items, total] = await Promise.all([
            prisma.applicationUpdate.findMany({
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                select: {
                    id: true,
                    status: true,
                    description: true,
                    createdAt: true,
                    author: { select: AUTHOR_SELECT },
                    opportunity: { select: OPPORTUNITY_SELECT },
                },
            }),
            prisma.applicationUpdate.count(),
        ]);
        return { kind: input.kind, status: input.status, items, total, page, limit };
    }

    const where = { category: 'HIRING_UPDATE' as const, status: input.status as CommunityPostStatus };
    const [items, total] = await Promise.all([
        prisma.communityPost.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            select: {
                id: true,
                title: true,
                body: true,
                category: true,
                status: true,
                createdAt: true,
                author: { select: AUTHOR_SELECT },
            },
        }),
        prisma.communityPost.count({ where }),
    ]);
    return { kind: input.kind, status: input.status, items, total, page, limit };
}

/**
 * Soft-remove an interview experience (ARCHIVED hides it from public lists,
 * which only read ACTIVE rows) or restore it to ACTIVE.
 */
export async function setInterviewExperienceStatus(id: string, status: 'ACTIVE' | 'ARCHIVED') {
    const existing = await prisma.interviewExperience.findUnique({
        where: { id },
        select: { id: true, status: true },
    });
    if (!existing) throw new AppError('Interview experience not found', 404);
    if (existing.status === 'DELETED') throw new AppError('Interview experience is deleted', 409);
    if (existing.status === status) return existing;
    return prisma.interviewExperience.update({ where: { id }, data: { status } });
}

/**
 * ApplicationUpdate rows carry no status flag, so removal is a hard delete.
 */
export async function deleteApplicationUpdate(id: string) {
    const existing = await prisma.applicationUpdate.findUnique({
        where: { id },
        select: { id: true },
    });
    if (!existing) throw new AppError('Application update not found', 404);
    await prisma.applicationUpdate.delete({ where: { id } });
    return { id };
}

/**
 * Soft-remove a community post (ARCHIVED) or restore it to ACTIVE.
 */
export async function setCommunityPostStatus(id: string, status: 'ACTIVE' | 'ARCHIVED') {
    const existing = await prisma.communityPost.findUnique({
        where: { id },
        select: { id: true, status: true },
    });
    if (!existing) throw new AppError('Community post not found', 404);
    if (existing.status === CommunityPostStatus.DELETED) throw new AppError('Community post is deleted', 409);
    if (existing.status === status) return existing;
    return prisma.communityPost.update({ where: { id }, data: { status } });
}
