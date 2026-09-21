import crypto from 'crypto';
import prisma from '../database/prisma';
import { AppError } from '../../middleware/errorHandler';
import { createRateLimiter } from '../../middleware/rateLimit';
import { slugify } from '@fresherflow/utils';
import {
    CommentType,
    CommentVoteValue,
    CommunityPostCategory,
    CommunityPostStatus,
    EducationLevel as DbEducationLevel,
    JobSignalType,
    NotificationType,
    OpportunityType,
    ReportReason,
    SalaryPeriod,
    WorkMode,
} from '@fresherflow/database';
import type { Prisma } from '@prisma/client';

// Re-export CommunityPostUser for consumers
export type CommunityPostUser = {
    id: string;
    fullName: string | null;
    username: string | null;
    avatarUrl: string | null;
};

export type CommunityPostCommentNode = {
    id: string;
    body: string;
    isAnonymous: boolean;
    anonId: string | null;
    likesCount: number;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    author: CommunityPostUser;
    myVote: number | null;
    replies: CommunityPostCommentNode[];
};

/** Shape accepted by submitJob for applicationDetails (mirrors ApplicationDetails in @fresherflow/types). */
type ApplicationDetailsInput = {
    method?: 'DIRECT' | 'FORM' | 'ASSESSMENT';
    platform?: string;
    estimatedMinutes?: number;
    requiredItems?: string[];
};

/**
 * Community service - real Postgres-backed comments, votes, signals,
 * submissions, reports, notifications.
 *
 * Design (per 09b section 7/8):
 * - commentId/opportunityId accept slug-or-id (detail.ts resolves both)
 * - writes never 500 on identity confusion; anonymous users rejected up front
 * - aggregates only (no per-user rows exposed in reads)
 * - Report dedupe: one OPEN report per (reporter, target, reason)
 */

// ========================================
// Rate limiters (doc 23 section 3.0)
// ========================================

export const commentsWriteLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 20,
    message: 'Too many comment actions. Please slow down.',
    keyPrefix: 'community_comments',
});

export const signalsLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 30,
    message: 'Too many signal actions. Please slow down.',
    keyPrefix: 'community_signals',
});

export const submitLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: 'Too many submissions. Please try again later.',
    keyPrefix: 'community_submit',
});

export const guestSubmitLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: 'Too many guest submissions. Please sign in or try again later.',
    keyPrefix: 'community_guest_submit',
});

/** MCP-facing anonymous submissions: tighter than the general guest limiter
 *  because the caller is unauthenticated and untrusted. */
export const mcpSubmitLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: 'Too many MCP submissions. Please slow down.',
    keyPrefix: 'mcp_submit',
});

export const ingestJobsMinuteLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 60,
    message: 'Too many ingest requests. Please slow down.',
    keyPrefix: 'ingest_jobs_min',
});

export const ingestJobsHourLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 500,
    message: 'Ingest hourly quota exceeded. Please try again later.',
    keyPrefix: 'ingest_jobs_hour',
});

export const reportsLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: 'Too many reports. Please try again later.',
    keyPrefix: 'community_reports',
});

export const notificationsLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 60,
    message: 'Too many notification requests. Please slow down.',
    keyPrefix: 'community_notifications',
});

export const communityReadLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 120,
    message: 'Too many requests. Please try again in a minute.',
    keyPrefix: 'community_read',
});

// ========================================
// Types
// ========================================

export interface CommunityViewer {
    userId?: string | null;
}

export interface CommunityCommentUser {
    id: string;
    fullName: string | null;
    username: string | null;
    avatarUrl: string | null;
}

export interface CommunityCommentNode {
    id: string;
    text: string;
    commentType: string;
    upvotes: number;
    downvotes: number;
    createdAt: Date;
    editedAt: Date | null;
    userId: string;
    user: CommunityCommentUser;
    myVote: string | null;
    replies: CommunityCommentNode[];
}

const COMMENT_AUTHOR_SELECT = {
    id: true,
    fullName: true,
    username: true,
    profile: { select: { avatarUrl: true } },
} as const;

const MAX_ID_LENGTH = 200;
const SIGNAL_TYPES: JobSignalType[] = [
    JobSignalType.APPLIED,
    JobSignalType.INTERVIEWED,
    JobSignalType.OFFER,
    JobSignalType.CLOSED,
    JobSignalType.HELPFUL,
    JobSignalType.INCORRECT,
];

// ========================================
// Helpers
// ========================================

function decodeSafe(value: string): string {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

function normalizeSlugOrId(value: string): string {
    const decoded = decodeSafe(value).trim();
    if (/^https?:\/\//i.test(decoded)) {
        try {
            const url = new URL(decoded);
            const segments = url.pathname.split('/').filter(Boolean);
            return segments[segments.length - 1] || decoded;
        } catch {
            return decoded.replace(/^https?:\/+/i, '');
        }
    }
    return decoded;
}

function mapCommentUser(user: {
    id: string;
    fullName: string | null;
    username: string | null;
    profile: { avatarUrl: string | null } | null;
}): CommunityCommentUser {
    return {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        avatarUrl: user.profile?.avatarUrl ?? null,
    };
}

/** Resolve a slug-or-id to the canonical Opportunity row (must not be soft-deleted). */
export async function resolveOpportunity(slugOrId: string) {
    const id = normalizeSlugOrId(slugOrId);
    if (!id || id.length > MAX_ID_LENGTH) {
        throw new AppError('Opportunity not found', 404);
    }

    const select = { id: true, slug: true, title: true, company: true, postedByUserId: true } as const;

    let opportunity = await prisma.opportunity.findFirst({
        where: { OR: [{ slug: id }, { id }], deletedAt: null },
        select,
    });

    if (!opportunity) {
        const parts = id.split('-').filter(Boolean);
        const last = parts[parts.length - 1] || '';
        if (/^[a-f0-9]{6,12}$/i.test(last)) {
            opportunity = await prisma.opportunity.findFirst({
                where: { id: { endsWith: last.toLowerCase() }, deletedAt: null },
                select,
            });
        }
    }

    if (!opportunity) {
        throw new AppError('Opportunity not found', 404);
    }
    return opportunity;
}

// ========================================
// Comments (P0.3)
// ========================================

export async function listComments(opportunityId: string, viewer: CommunityViewer = {}) {
    const rows = await prisma.opportunityComment.findMany({
        where: { opportunityId, deletedAt: null },
        orderBy: { createdAt: 'asc' },
        take: 300,
        select: {
            id: true,
            text: true,
            commentType: true,
            upvotes: true,
            downvotes: true,
            createdAt: true,
            editedAt: true,
            parentCommentId: true,
            userId: true,
            user: { select: COMMENT_AUTHOR_SELECT },
        },
    });

    const ids = rows.map((row) => row.id);
    const myVotes = new Map<string, string>();
    if (viewer.userId && ids.length > 0) {
        const votes = await prisma.commentVote.findMany({
            where: { commentId: { in: ids }, userId: viewer.userId },
            select: { commentId: true, value: true },
        });
        for (const vote of votes) myVotes.set(vote.commentId, vote.value);
    }

    const nodes = new Map<string, CommunityCommentNode>();
    for (const row of rows) {
        nodes.set(row.id, {
            id: row.id,
            text: row.text,
            commentType: row.commentType,
            upvotes: row.upvotes,
            downvotes: row.downvotes,
            createdAt: row.createdAt,
            editedAt: row.editedAt,
            userId: row.userId,
            user: mapCommentUser(row.user),
            myVote: myVotes.get(row.id) ?? null,
            replies: [],
        });
    }

    const roots: CommunityCommentNode[] = [];
    for (const row of rows) {
        const node = nodes.get(row.id);
        if (!node) continue;
        if (row.parentCommentId) {
            const parent = nodes.get(row.parentCommentId);
            // D4: replies under a deleted root are hidden with the whole subtree.
            if (!parent) continue;
            parent.replies.push(node);
        } else {
            roots.push(node);
        }
    }

    return { comments: roots, total: rows.length };
}

/**
 * Batched comment counts for feed cards.
 * Two queries total (resolve ids, then one groupBy) — no per-card requests.
 * Feed ids may be slugs or DB ids, so resolve them to canonical rows first.
 * Returns { opportunityId: count } only for ids that have ≥1 visible comment.
 */
export async function getCommentCounts(opportunityIds: string[]): Promise<Record<string, number>> {
    const uniqueIds = Array.from(new Set(opportunityIds.filter((id) => id && id.length <= MAX_ID_LENGTH)));
    if (uniqueIds.length === 0) return {};
    if (uniqueIds.length > 200) {
        throw new AppError('Too many opportunity ids (max 200)', 400);
    }

    // Resolve requested slug-or-id values to canonical opportunity rows.
    const rows = await prisma.opportunity.findMany({
        where: { OR: [{ id: { in: uniqueIds } }, { slug: { in: uniqueIds } }], deletedAt: null },
        select: { id: true, slug: true },
    });
    if (rows.length === 0) return {};

    const grouped = await prisma.opportunityComment.groupBy({
        by: ['opportunityId'],
        where: { opportunityId: { in: rows.map((r) => r.id) }, deletedAt: null },
        _count: { _all: true },
    });
    const countsByCanonicalId = new Map<string, number>();
    for (const row of grouped) {
        countsByCanonicalId.set(row.opportunityId, row._count._all);
    }

    const counts: Record<string, number> = {};
    for (const requestedId of uniqueIds) {
        const row = rows.find((r) => r.id === requestedId || r.slug === requestedId);
        const count = row ? countsByCanonicalId.get(row.id) : undefined;
        if (count && count > 0) counts[requestedId] = count;
    }
    return counts;
}

export async function postComment(input: {
    opportunityId: string;
    userId: string;
    text: string;
    commentType?: CommentType;
    parentCommentId?: string | null;
}) {
    const { opportunityId, userId } = input;
    const text = input.text.trim();
    const commentType = input.commentType ?? CommentType.GENERAL;

    let parent: { id: string; userId: string } | null = null;
    if (input.parentCommentId) {
        parent = await prisma.opportunityComment.findFirst({
            where: { id: input.parentCommentId, opportunityId, deletedAt: null },
            select: { id: true, userId: true },
        });
        if (!parent) {
            throw new AppError('Parent comment not found', 404);
        }
    }

    const comment = await prisma.$transaction(async (tx) => {
        const created = await tx.opportunityComment.create({
            data: {
                opportunityId,
                userId,
                text,
                commentType,
                parentCommentId: parent?.id ?? null,
            },
            select: {
                id: true,
                text: true,
                commentType: true,
                upvotes: true,
                downvotes: true,
                createdAt: true,
                editedAt: true,
                user: { select: COMMENT_AUTHOR_SELECT },
            },
        });

        if (parent && parent.userId !== userId) {
            await tx.notification.create({
                data: {
                    userId: parent.userId,
                    type: NotificationType.COMMENT_REPLY,
                    actorId: userId,
                    opportunityId,
                    commentId: created.id,
                    payload: { excerpt: text.slice(0, 140) },
                },
            });
        }

        return created;
    });

    return {
        id: comment.id,
        text: comment.text,
        commentType: comment.commentType,
        upvotes: comment.upvotes,
        downvotes: comment.downvotes,
        createdAt: comment.createdAt,
        editedAt: comment.editedAt,
        userId,
        user: mapCommentUser(comment.user),
        myVote: null,
        replies: [] as CommunityCommentNode[],
    } satisfies CommunityCommentNode;
}

export async function voteComment(input: {
    commentId: string;
    userId: string;
    value: CommentVoteValue;
    opportunityId?: string;
}) {
    const comment = await prisma.opportunityComment.findFirst({
        where: {
            id: input.commentId,
            ...(input.opportunityId ? { opportunityId: input.opportunityId } : {}),
            deletedAt: null,
        },
        select: { id: true },
    });
    if (!comment) {
        throw new AppError('Comment not found', 404);
    }

    const existing = await prisma.commentVote.findUnique({
        where: { commentId_userId: { commentId: comment.id, userId: input.userId } },
        select: { id: true, value: true },
    });

    return prisma.$transaction(async (tx) => {
        // Doc 23 section 3.4: re-sending the same vote is an idempotent no-op.
        if (!existing || existing.value !== input.value) {
            if (existing) {
                await tx.commentVote.update({ where: { id: existing.id }, data: { value: input.value } });
            } else {
                await tx.commentVote.create({
                    data: { commentId: comment.id, userId: input.userId, value: input.value },
                });
            }
        }

        const grouped = await tx.commentVote.groupBy({
            by: ['value'],
            where: { commentId: comment.id },
            _count: { _all: true },
        });

        const counts: Record<string, number> = { UPVOTE: 0, DOWNVOTE: 0 };
        for (const group of grouped) {
            counts[group.value] = group._count._all;
        }

        await tx.opportunityComment.update({
            where: { id: comment.id },
            data: { upvotes: counts.UPVOTE, downvotes: counts.DOWNVOTE },
        });

        return {
            upvotes: counts.UPVOTE,
            downvotes: counts.DOWNVOTE,
            myVote: input.value,
        };
    });
}

export async function deleteComment(input: {
    commentId: string;
    userId: string;
    opportunityId?: string;
}) {
    const comment = await prisma.opportunityComment.findFirst({
        where: {
            id: input.commentId,
            ...(input.opportunityId ? { opportunityId: input.opportunityId } : {}),
            deletedAt: null,
        },
        select: { id: true, userId: true },
    });
    if (!comment) {
        throw new AppError('Comment not found', 404);
    }
    if (comment.userId !== input.userId) {
        throw new AppError('You can only delete your own comments', 403);
    }
    await prisma.opportunityComment.update({
        where: { id: comment.id },
        data: { deletedAt: new Date() },
    });
}

// ========================================
// Signals (P0.4)
// ========================================

async function buildSignalState(opportunityId: string, userId?: string | null) {
    const grouped = await prisma.jobSignal.groupBy({
        by: ['signalType'],
        where: { opportunityId },
        _count: { _all: true },
    });

    const summary: Record<string, number> = {};
    for (const type of SIGNAL_TYPES) summary[type] = 0;
    for (const group of grouped) summary[group.signalType] = group._count._all;

    let mySignals: string[] = [];
    if (userId) {
        const rows = await prisma.jobSignal.findMany({
            where: { opportunityId, userId },
            select: { signalType: true },
        });
        mySignals = rows.map((row) => row.signalType);
    }

    return { summary, mySignals };
}

export async function getSignals(slugOrId: string, viewer: CommunityViewer = {}) {
    const opportunity = await resolveOpportunity(slugOrId);
    return buildSignalState(opportunity.id, viewer.userId);
}

export async function toggleSignal(input: { slugOrId: string; userId: string; signalType: JobSignalType }) {
    const opportunity = await resolveOpportunity(input.slugOrId);

    const existing = await prisma.jobSignal.findUnique({
        where: {
            opportunityId_userId_signalType: {
                opportunityId: opportunity.id,
                userId: input.userId,
                signalType: input.signalType,
            },
        },
        select: { id: true },
    });

    if (existing) {
        await prisma.jobSignal.delete({ where: { id: existing.id } });
    } else {
        await prisma.jobSignal.create({
            data: {
                opportunityId: opportunity.id,
                userId: input.userId,
                signalType: input.signalType,
            },
        });
    }

    return buildSignalState(opportunity.id, input.userId);
}

// ========================================
// Submission (P0.5)
// ========================================

const TRACKING_PARAMS = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'gclid',
    'fbclid',
    'ref',
];

function normalizeUrl(raw: string): string {
    let url: URL;
    try {
        url = new URL(raw.trim());
    } catch {
        throw new AppError('A valid URL is required', 400);
    }

    const isLocalDev =
        process.env.NODE_ENV !== 'production' &&
        (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLocalDev)) {
        throw new AppError('Only https links are supported', 400);
    }

    url.hash = '';
    for (const param of TRACKING_PARAMS) url.searchParams.delete(param);

    let normalized = url.toString();
    if (normalized.endsWith('/')) normalized = normalized.slice(0, -1);
    return normalized;
}

function urlVariants(url: string): string[] {
    return [...new Set([url, `${url}/`])];
}

export interface SubmitJobInput {
    userId?: string | null;
    sourceUrl: string;
    applyUrl?: string | null;
    title: string;
    company?: string | null;
    description?: string | null;
    companyWebsite?: string | null;
    companyLogoUrl?: string | null;
    type?: OpportunityType;
    locations?: string[];
    workMode?: WorkMode | null;
    salaryRange?: string | null;
    salaryMin?: number | null;
    salaryMax?: number | null;
    salaryPeriod?: SalaryPeriod;
    stipend?: string | null;
    employmentType?: string | null;
    experienceMin?: number | null;
    experienceMax?: number | null;
    requiredSkills?: string[];
    tags?: string[];
    allowedDegrees?: string[];
    allowedCourses?: string[];
    allowedSpecializations?: string[];
    allowedPassoutYears?: number[];
    jobFunction?: string | null;
    incentives?: string | null;
    selectionProcess?: string | null;
    notesHighlights?: string | null;
    expiresAt?: string | null;
    applicationDetails?: ApplicationDetailsInput | null;
    dates?: string[];
    dateRange?: string | null;
    timeRange?: string | null;
    venueAddress?: string | null;
    venueLink?: string | null;
    reportingTime?: string | null;
    contact?: string | null;
    submitterName?: string | null;
    submittedVia?: string | null;
    /** When false, the opportunity is created as DRAFT and the submission as
     *  PENDING_REVIEW (anonymous MCP / guest submissions). Default true. */
    published?: boolean;
}

let cachedCommunityUserId: string | null = null;

/** Resolve attribution for guest + member submits without a schema migration. */
export async function resolveSubmitAttributionUserId(userId?: string | null): Promise<string> {
    if (userId) {
        const existing = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
        if (existing) return existing.id;
    }
    if (cachedCommunityUserId) return cachedCommunityUserId;
    const bot = await prisma.user.findFirst({
        where: { OR: [{ email: 'community@fresherflow.app' }, { username: 'fresherflow_community' }] },
        select: { id: true },
    });
    if (bot) {
        cachedCommunityUserId = bot.id;
        return bot.id;
    }
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } });
    if (admin) {
        cachedCommunityUserId = admin.id;
        return admin.id;
    }
    const created = await prisma.user.create({
        data: {
            email: 'community@fresherflow.app',
            username: 'fresherflow_community',
            fullName: 'FresherFlow Community',
            role: 'USER',
        },
        select: { id: true },
    });
    cachedCommunityUserId = created.id;
    return created.id;
}

export async function submitJob(input: SubmitJobInput) {
    const sourceUrl = normalizeUrl(input.sourceUrl);
    const applyUrl = input.applyUrl ? normalizeUrl(input.applyUrl) : undefined;

    const sourceVariants = urlVariants(sourceUrl);
    const applyVariants = applyUrl ? urlVariants(applyUrl) : [];
    const allVariants = [...new Set([...sourceVariants, ...applyVariants])];

    const existingOpp = await prisma.opportunity.findFirst({
        where: {
            deletedAt: null,
            OR: [{ sourceLink: { in: allVariants } }, { applyLink: { in: allVariants } }],
        },
        select: { id: true, slug: true },
    });
    if (existingOpp) {
        return { existing: true, id: existingOpp.id, slug: existingOpp.slug, status: 'PUBLISHED' };
    }

    const existingSubmission = await prisma.jobSubmission.findFirst({
        where: {
            OR: [
                { sourceUrl: { in: sourceVariants } },
                ...(applyUrl ? [{ applyUrl: { in: applyVariants } }] : []),
            ],
        },
        select: { opportunityId: true, opportunity: { select: { id: true, slug: true } } },
    });
    if (existingSubmission?.opportunity) {
        // Record a MERGED history row so the contributor sees "your find, already
        // here" in their submissions. The attribution user owns guest rows; real
        // users own their own. The previous link's submission stays untouched.
        const attributionUserId = await resolveSubmitAttributionUserId(input.userId);
        await prisma.jobSubmission.create({
            data: {
                sourceUrl,
                applyUrl: applyUrl ?? null,
                title: input.title.trim(),
                company: (input.company?.trim() || 'Community').slice(0, 200),
                status: 'MERGED',
                submittedById: attributionUserId,
                opportunityId: existingSubmission.opportunity.id,
                extractedData: {
                    mergedIntoOpportunityId: existingSubmission.opportunity.id,
                    submittedVia: input.submittedVia || (!input.userId ? 'community_guest' : 'community_web'),
                    submittedById: input.userId ?? null,
                    guest: !input.userId,
                },
            },
            select: { id: true },
        });
        return {
            existing: true,
            id: existingSubmission.opportunity.id,
            slug: existingSubmission.opportunity.slug,
        };
    }

    const company = (input.company?.trim() || 'Community').slice(0, 200);
    let slug = slugify(`${company} ${input.title}`) || `job-${crypto.randomInt(100000, 999999)}`;
    const slugTaken = await prisma.opportunity.findFirst({ where: { slug }, select: { id: true } });
    if (slugTaken) {
        slug = `${slug}-${crypto.randomInt(0, 0xffffff).toString(16).padStart(6, '0')}`;
    }

    const attributionUserId = await resolveSubmitAttributionUserId(input.userId);
    const isGuest = !input.userId;
    const publish = input.published !== false;
    const workMode = input.workMode ?? null;
    const salaryPeriod = input.salaryPeriod ?? 'YEARLY';
    const salaryRange = input.salaryRange?.trim() || null;
    const salaryMin = input.salaryMin ?? null;
    const salaryMax = input.salaryMax ?? null;
    const cleanList = (values: string[] | undefined, max: number) =>
        (values ?? [])
            .map((v) => v.trim())
            .filter(Boolean)
            .slice(0, max);
    const locations = cleanList(input.locations, 15);
    const requiredSkills = cleanList(input.requiredSkills, 30);
    const tags = cleanList(input.tags, 20);
    const allowedCourses = cleanList(input.allowedCourses, 20);
    const allowedSpecializations = cleanList(input.allowedSpecializations, 20);
    const allowedDegrees = ((input.allowedDegrees ?? []) as unknown as DbEducationLevel[]).slice(0, 10);
    const allowedPassoutYears = (input.allowedPassoutYears ?? []).filter(
        (y) => Number.isInteger(y) && y >= 1990 && y <= 2100
    ).slice(0, 15);
    const applicationDetails = input.applicationDetails ?? null;
    const companyWebsite = input.companyWebsite?.trim() || null;
    const companyLogoUrl = input.companyLogoUrl?.trim() || null;
    const stipend = input.stipend?.trim() || null;
    const employmentType = input.employmentType?.trim() || null;
    const experienceMin = input.experienceMin ?? null;
    const experienceMax = input.experienceMax ?? null;
    const jobFunction = input.jobFunction?.trim() || null;
    const incentives = input.incentives?.trim() || null;
    const selectionProcess = input.selectionProcess?.trim() || null;
    const notesHighlights = input.notesHighlights?.trim() || null;
    const opportunityType = input.type ?? 'JOB';
    let expiresAt: Date | null = null;
    if (input.expiresAt?.trim()) {
        const parsed = new Date(input.expiresAt.trim());
        if (!Number.isNaN(parsed.getTime()) && parsed.getTime() > Date.now()) expiresAt = parsed;
    }
    const walkinDates = (input.dates ?? [])
        .map((d) => d.trim())
        .filter(Boolean)
        .slice(0, 10)
        .map((d) => new Date(d))
        .filter((d) => !Number.isNaN(d.getTime()));
    const dateRange = input.dateRange?.trim() || null;
    const timeRange = input.timeRange?.trim() || null;
    const venueAddress = input.venueAddress?.trim() || null;
    const venueLink = input.venueLink?.trim() || null;
    const reportingTime = input.reportingTime?.trim() || timeRange;
    const hasDetailFields =
        Boolean(
            companyWebsite ||
                companyLogoUrl ||
                salaryRange ||
                stipend ||
                employmentType ||
                jobFunction ||
                incentives ||
                selectionProcess ||
                notesHighlights ||
                expiresAt ||
                locations.length > 0 ||
                requiredSkills.length > 0 ||
                tags.length > 0 ||
                allowedCourses.length > 0 ||
                allowedSpecializations.length > 0 ||
                allowedPassoutYears.length > 0 ||
                allowedDegrees.length > 0 ||
                applicationDetails
        ) ||
        workMode !== null ||
        salaryMin !== null ||
        salaryMax !== null ||
        experienceMin !== null ||
        experienceMax !== null;

    const opportunity = await prisma.$transaction(async (tx) => {
        const created = await tx.opportunity.create({
            data: {
                slug,
                title: input.title.trim(),
                company,
                description: input.description?.trim() || null,
                type: opportunityType,
                status: publish ? 'PUBLISHED' : 'DRAFT',
                allowedDegrees,
                allowedCourses,
                allowedSpecializations,
                allowedPassoutYears,
                allowedAvailability: [],
                requiredSkills,
                tags,
                locations,
                sourceLink: sourceUrl,
                applyLink: applyUrl ?? sourceUrl,
                postedByUserId: attributionUserId,
                publishedAt: publish ? new Date() : null,
                expiresAt,
                // Community detail fields (all optional, progressive disclosure)
                companyWebsite,
                companyLogoUrl,
                workMode,
                salaryRange,
                salaryMin,
                salaryMax,
                salaryPeriod,
                stipend,
                employmentType,
                experienceMin,
                experienceMax,
                jobFunction,
                incentives,
                selectionProcess,
                notesHighlights,
                applicationDetails: applicationDetails
                    ? (applicationDetails as unknown as Prisma.InputJsonValue)
                    : undefined,
                ...(opportunityType === 'WALKIN'
                    ? {
                          walkInDetails: {
                              create: {
                                  dates: walkinDates.length > 0 ? walkinDates : [new Date()],
                                  dateRange,
                                  timeRange,
                                  venueAddress: venueAddress || locations[0] || 'Venue shared after apply',
                                  venueLink,
                                  reportingTime: reportingTime || '09:30 AM',
                                  requiredDocuments: [],
                              },
                          },
                      }
                    : {}),
            },
            select: { id: true, slug: true },
        });

        await tx.jobSubmission.create({
            data: {
                sourceUrl,
                applyUrl: applyUrl ?? null,
                title: input.title.trim(),
                company,
                description: input.description?.trim() || null,
                status: publish ? 'PUBLISHED' : 'PENDING_REVIEW',
                submittedById: attributionUserId,
                opportunityId: created.id,
                extractedData: {
                    submittedVia: input.submittedVia || (isGuest ? 'community_guest' : 'community_web'),
                    submittedById: input.userId ?? null,
                    guest: isGuest,
                    ...(input.contact?.trim() ? { guestContact: input.contact.trim().slice(0, 200) } : {}),
                    ...(input.submitterName?.trim() ? { guestName: input.submitterName.trim().slice(0, 120) } : {}),
                    ...(hasDetailFields ? { withDetails: true } : {}),
                },
            },
            select: { id: true },
        });

        return created;
    });

    return {
        existing: false,
        id: opportunity.id,
        slug: opportunity.slug,
        status: publish ? 'PUBLISHED' : 'PENDING_REVIEW',
    };
}

export type SubmissionViewState = 'PENDING' | 'LIVE' | 'REJECTED' | 'MERGED';

export interface MySubmissionItem {
    id: string;
    sourceLink: string;
    title: string;
    company: string | null;
    /** Raw JobSubmissionStatus value. */
    status: string;
    /** Contributor-facing state derived from status + the linked opportunity. */
    viewState: SubmissionViewState;
    createdAt: Date;
    mappedOpportunityId: string | null;
    slug: string | null;
    /** Slug of the listing this submission was folded into (MERGED state). */
    mergedTargetSlug: string | null;
    /** Moderator-provided rejection reason, when the submission was rejected. */
    rejectionReason: string | null;
}

/**
 * Derive what the contributor should see from the raw submission status plus the
 * linked opportunity. A submission whose opportunity went live is LIVE even if the
 * status enum still says PUBLISHED; a REJECTED submission whose opportunity is live
 * has been approved after rejection and reads LIVE too.
 */
function deriveSubmissionViewState(
    status: string,
    opportunity: { deletedAt: Date | null; status: string } | null
): SubmissionViewState {
    if (opportunity && opportunity.status === 'PUBLISHED' && !opportunity.deletedAt) {
        return 'LIVE';
    }
    switch (status) {
        case 'REJECTED':
            return 'REJECTED';
        case 'MERGED':
            return 'MERGED';
        case 'PUBLISHED':
            return 'LIVE';
        case 'PENDING_REVIEW':
        default:
            return 'PENDING';
    }
}

export async function listMySubmissions(userId: string) {
    const rows = await prisma.jobSubmission.findMany({
        where: { submittedById: userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
            id: true,
            sourceUrl: true,
            title: true,
            company: true,
            status: true,
            createdAt: true,
            extractedData: true,
            opportunityId: true,
            opportunity: { select: { slug: true, status: true, deletedAt: true } },
        },
    });

    // Resolve merge targets: a MERGED submission's linked opportunity is the
    // listing it was folded into. exposedData.mergedIntoOpportunityId wins when set.
    const mergeTargetIds = rows
        .map((row) => {
            const data = row.extractedData as { mergedIntoOpportunityId?: unknown } | null;
            return typeof data?.mergedIntoOpportunityId === 'string' ? data.mergedIntoOpportunityId : null;
        })
        .filter((id): id is string => Boolean(id) && id !== rows.find((r) => r.id)?.opportunityId);
    const mergeTargets =
        mergeTargetIds.length > 0
            ? await prisma.opportunity.findMany({
                  where: { id: { in: mergeTargetIds }, deletedAt: null },
                  select: { id: true, slug: true },
              })
            : [];
    const mergeTargetByOppId = new Map(mergeTargets.map((opp) => [opp.id, opp.slug]));

    const submissions: MySubmissionItem[] = rows.map((row) => {
        const data = row.extractedData as {
            rejectionReason?: unknown;
            mergedIntoOpportunityId?: unknown;
        } | null;
        const viewState = deriveSubmissionViewState(row.status, row.opportunity);
        const mergedIntoId = typeof data?.mergedIntoOpportunityId === 'string' ? data.mergedIntoOpportunityId : null;
        const mergedTargetSlug =
            (mergedIntoId ? mergeTargetByOppId.get(mergedIntoId) ?? null : null) ?? row.opportunity?.slug ?? null;

        return {
            id: row.id,
            sourceLink: row.sourceUrl,
            title: row.title,
            company: row.company,
            status: row.status,
            viewState,
            createdAt: row.createdAt,
            mappedOpportunityId: row.opportunityId,
            slug: row.opportunity?.slug ?? null,
            mergedTargetSlug: viewState === 'MERGED' ? mergedTargetSlug : null,
            rejectionReason:
                viewState === 'REJECTED' && typeof data?.rejectionReason === 'string'
                    ? data.rejectionReason
                    : null,
        };
    });

    return { submissions };
}

// ========================================
// Reports (P0.6)
// ========================================

export async function createReport(input: {
    reporterId: string;
    opportunityId?: string | null;
    commentId?: string | null;
    reason: ReportReason;
    message?: string | null;
}) {
    let { opportunityId, commentId } = input;
    const { reporterId, reason } = input;

    if ((opportunityId && commentId) || (!opportunityId && !commentId)) {
        throw new AppError('Provide exactly one report target', 400);
    }

    if (opportunityId) {
        const opportunity = await prisma.opportunity.findFirst({
            where: { OR: [{ id: opportunityId }, { slug: opportunityId }], deletedAt: null },
            select: { id: true },
        });
        if (!opportunity) {
            throw new AppError('Opportunity not found', 404);
        }
        opportunityId = opportunity.id;
    } else if (commentId) {
        const comment = await prisma.opportunityComment.findFirst({
            where: { id: commentId, deletedAt: null },
            select: { id: true },
        });
        if (!comment) {
            throw new AppError('Comment not found', 404);
        }
        commentId = comment.id;
    }

    const existing = await prisma.report.findFirst({
        where: {
            reporterId,
            status: 'OPEN',
            reason,
            ...(opportunityId ? { opportunityId } : { commentId }),
        },
        select: { id: true },
    });
    if (existing) {
        return { id: existing.id, deduped: true };
    }

    const created = await prisma.report.create({
        data: {
            reporterId,
            opportunityId: opportunityId ?? null,
            commentId: commentId ?? null,
            reason,
            message: input.message?.trim() || null,
            status: 'OPEN',
        },
        select: { id: true },
    });

    return { id: created.id, deduped: false };
}

// ========================================
// Notifications (P0.6 / P0.11)
// ========================================

function mapNotification(notification: {
    id: string;
    type: string;
    commentId: string | null;
    payload: unknown;
    readAt: Date | null;
    createdAt: Date;
    actor: {
        id: string;
        fullName: string | null;
        username: string | null;
        profile: { avatarUrl: string | null } | null;
    } | null;
    opportunity: { id: string; slug: string; title: string } | null;
}) {
    return {
        id: notification.id,
        type: notification.type,
        commentId: notification.commentId,
        payload: notification.payload ?? null,
        readAt: notification.readAt,
        createdAt: notification.createdAt,
        actor: notification.actor ? mapCommentUser(notification.actor) : null,
        opportunity: notification.opportunity,
    };
}

export async function listNotifications(
    userId: string,
    options: { unreadOnly?: boolean; limit?: number } = {}
) {
    const limit = Math.min(Math.max(options.limit ?? 50, 1), 50);

    const notifications = await prisma.notification.findMany({
        where: { userId, ...(options.unreadOnly ? { readAt: null } : {}) },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
            id: true,
            type: true,
            commentId: true,
            payload: true,
            readAt: true,
            createdAt: true,
            actor: { select: COMMENT_AUTHOR_SELECT },
            opportunity: { select: { id: true, slug: true, title: true } },
        },
    });

    const unreadCount = await prisma.notification.count({ where: { userId, readAt: null } });

    return {
        notifications: notifications.map(mapNotification),
        unreadCount,
    };
}

export async function markNotificationsRead(userId: string, ids?: string[]) {
    const where =
        ids && ids.length > 0
            ? { userId, id: { in: ids } }
            : { userId, readAt: null };
    const result = await prisma.notification.updateMany({
        where,
        data: { readAt: new Date() },
    });
    return { updated: result.count };
}

// ========================================
// Public activity (P1 contribution identity)
// ========================================

export async function getUserActivity(username: string, options: { limit?: number } = {}) {
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 50);

    const user = await prisma.user.findUnique({
        where: { username },
        select: {
            id: true,
            username: true,
            fullName: true,
            profile: { select: { avatarUrl: true } },
        },
    });
    if (!user) {
        throw new AppError('User not found', 404);
    }

    const [comments, commentCount, signalCount, submissionCount] = await Promise.all([
        prisma.opportunityComment.findMany({
            where: { userId: user.id, deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: limit,
            select: {
                id: true,
                text: true,
                commentType: true,
                opportunityId: true,
                createdAt: true,
                opportunity: { select: { id: true, slug: true, title: true } },
            },
        }),
        prisma.opportunityComment.count({ where: { userId: user.id, deletedAt: null } }),
        prisma.jobSignal.count({ where: { userId: user.id } }),
        prisma.jobSubmission.count({ where: { submittedById: user.id } }),
    ]);

    return {
        user: mapCommentUser(user),
        counts: {
            comments: commentCount,
            signals: signalCount,
            submissions: submissionCount,
        },
        comments,
    };
}

// ========================================
// COMMUNITY POSTS (Phase 1)
// ========================================

const COMMUNITY_POST_AUTHOR_SELECT = {
    id: true,
    fullName: true,
    username: true,
    profile: { select: { avatarUrl: true } },
} as const;

const COMMUNITY_POST_COMMENT_AUTHOR_SELECT = {
    id: true,
    fullName: true,
    username: true,
    profile: { select: { avatarUrl: true } },
} as const;

function mapCommunityPostUser(user: {
    id: string;
    fullName: string | null;
    username: string | null;
    profile: { avatarUrl: string | null } | null;
}): CommunityPostUser {
    return {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        avatarUrl: user.profile?.avatarUrl ?? null,
    };
}

export async function listCommunityPosts(options: {
    page?: number;
    limit?: number;
    category?: CommunityPostCategory;
    tag?: string;
    tags?: string[];
    search?: string;
    userId?: string | null;
}) {
    const page = options.page ?? 1;
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 50);
    const skip = (page - 1) * limit;

    const where: Prisma.CommunityPostWhereInput = {
        status: CommunityPostStatus.ACTIVE,
    };

    if (options.category) {
        where.category = options.category;
    }

    // Single tag (backward compat) OR multi-tag filter
    if (options.tags && options.tags.length > 0) {
        where.tags = { hasEvery: options.tags };
    } else if (options.tag) {
        where.tags = { has: options.tag };
    }

    // Text search on title OR body (case-insensitive via contains)
    if (options.search && options.search.trim().length > 0) {
        const term = options.search.trim().slice(0, 200);
        where.OR = [
            { title: { contains: term, mode: 'insensitive' } },
            { body: { contains: term, mode: 'insensitive' } },
        ];
    }

    const [posts, total] = await Promise.all([
        prisma.communityPost.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            include: {
                author: { select: COMMUNITY_POST_AUTHOR_SELECT },
                comments: {
                    where: { deletedAt: null },
                    orderBy: { createdAt: 'asc' },
                    take: 10,
                    include: {
                        author: { select: COMMUNITY_POST_COMMENT_AUTHOR_SELECT },
                        votes: {
                            where: { userId: options.userId ?? undefined },
                            select: { value: true },
                        },
                    },
                },
                votes: {
                    where: { userId: options.userId ?? undefined },
                    select: { value: true },
                },
            },
        }),
        prisma.communityPost.count({ where }),
    ]);

    const enrichedPosts = posts.map((post) => ({
        ...post,
        author: mapCommunityPostUser(post.author),
        myVote: post.votes[0]?.value ?? null,
        comments: post.comments.map((comment) => ({
            ...comment,
            author: mapCommunityPostUser(comment.author),
            myVote: comment.votes[0]?.value ?? null,
        })),
    }));

    return {
        posts: enrichedPosts,
        total,
        page,
        limit,
        hasMore: page * limit < total,
    };
}

export async function listTrendingTags(options: { limit?: number } = {}) {
    const limit = Math.min(Math.max(options.limit ?? 30, 1), 50);

    const posts = await prisma.communityPost.findMany({
        where: { status: CommunityPostStatus.ACTIVE, tags: { isEmpty: false } },
        select: { tags: true },
        orderBy: { createdAt: 'desc' },
        take: 500, // scan recent posts for tag frequency
    });

    const counts = new Map<string, number>();
    for (const post of posts) {
        for (const tag of post.tags) {
            counts.set(tag, (counts.get(tag) ?? 0) + 1);
        }
    }

    const trending = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([tag, count]) => ({ tag, count }));

    return { tags: trending, total: trending.length };
}

export async function getCommunityPost(id: string, userId?: string | null) {
    const post = await prisma.communityPost.findUnique({
        where: { id },
        include: {
            author: { select: COMMUNITY_POST_AUTHOR_SELECT },
            comments: {
                where: { deletedAt: null },
                orderBy: { createdAt: 'asc' },
                include: {
                    author: { select: COMMUNITY_POST_COMMENT_AUTHOR_SELECT },
                    votes: {
                        where: { userId: userId ?? undefined },
                        select: { value: true },
                    },
                },
            },
            votes: {
                where: { userId: userId ?? undefined },
                select: { value: true },
            },
        },
    });

    if (!post || post.status === CommunityPostStatus.DELETED) {
        throw new AppError('Community post not found', 404);
    }

    return {
        ...post,
        author: mapCommunityPostUser(post.author),
        myVote: post.votes[0]?.value ?? null,
        comments: post.comments.map((comment) => ({
            ...comment,
            author: mapCommunityPostUser(comment.author),
            myVote: comment.votes[0]?.value ?? null,
        })),
    };
}

export async function createCommunityPost(input: {
    authorId: string;
    title: string;
    body: string;
    category?: CommunityPostCategory;
    tags?: string[];
    isAnonymous?: boolean;
    anonId?: string;
    sourceOpportunityId?: string;
    roomId?: string | null;
}) {
    const post = await prisma.$transaction(async (tx) => {
        const created = await tx.communityPost.create({
            data: {
                authorId: input.authorId,
                title: input.title.trim(),
                body: input.body.trim(),
                category: input.category ?? CommunityPostCategory.DISCUSSION,
                tags: input.tags ?? [],
                isAnonymous: input.isAnonymous ?? false,
                anonId: input.anonId ?? null,
                sourceOpportunityId: input.sourceOpportunityId ?? null,
                roomId: input.roomId ?? null,
                status: CommunityPostStatus.ACTIVE,
            },
            select: {
                id: true, title: true, body: true, category: true,
                tags: true, isAnonymous: true, anonId: true,
                likesCount: true, commentsCount: true, status: true,
                createdAt: true, updatedAt: true, expiredAt: true,
                sourceOpportunityId: true,
                roomId: true,
                author: { select: COMMUNITY_POST_AUTHOR_SELECT },
            },
        });

        // Bump the room's post counter when the post lands in a room
        if (input.roomId) {
            await tx.room.update({
                where: { id: input.roomId },
                data: { postCount: { increment: 1 } },
            });
        }

        return created;
    });

    return {
        ...post,
        author: mapCommunityPostUser(post.author),
        myVote: null,
        comments: [],
    };
}

export async function voteCommunityPost(input: {
    postId: string;
    userId: string;
}) {
    const post = await prisma.communityPost.findUnique({
        where: { id: input.postId, status: CommunityPostStatus.ACTIVE },
        select: { id: true, authorId: true, title: true, likesCount: true },
    });
    if (!post) throw new AppError('Post not found', 404);

    const existing = await prisma.communityPostVote.findUnique({
        where: { postId_userId: { postId: input.postId, userId: input.userId } },
        select: { id: true },
    });

    return prisma.$transaction(async (tx) => {
        if (existing) {
            // Toggle off — un-mark helpful
            await tx.communityPostVote.delete({ where: { id: existing.id } });
        } else {
            await tx.communityPostVote.create({
                data: { postId: input.postId, userId: input.userId, value: 1 },
            });
        }

        const grouped = await tx.communityPostVote.groupBy({
            by: ['value'],
            where: { postId: input.postId },
            _count: { _all: true },
        });

        const helpfulCount = grouped.find((g) => g.value === 1)?._count._all ?? 0;

        await tx.communityPost.update({
            where: { id: input.postId },
            data: { likesCount: helpfulCount },
        });

        // Notify the author on the first helpful mark (not on un-mark)
        if (!existing && post.authorId !== input.userId) {
            await tx.notification.create({
                data: {
                    userId: post.authorId,
                    type: NotificationType.ROOM_HELPFUL,
                    actorId: input.userId,
                    payload: { postId: input.postId, title: post.title.slice(0, 140) },
                },
            });
        }

        return { helpfulCount, isHelpful: !existing };
    });
}

export async function addCommunityPostComment(input: {
    postId: string;
    authorId: string;
    body: string;
    parentId?: string;
    isAnonymous?: boolean;
    anonId?: string;
}) {
    const post = await prisma.communityPost.findUnique({
        where: { id: input.postId, status: CommunityPostStatus.ACTIVE },
        select: { id: true, commentsCount: true },
    });
    if (!post) throw new AppError('Post not found', 404);

    let parent: { id: string; authorId: string } | null = null;
    if (input.parentId) {
        parent = await prisma.communityPostComment.findFirst({
            where: { id: input.parentId, postId: input.postId, deletedAt: null },
            select: { id: true, authorId: true },
        });
        if (!parent) throw new AppError('Parent comment not found', 404);
    }

    const comment = await prisma.$transaction(async (tx) => {
        const created = await tx.communityPostComment.create({
            data: {
                postId: input.postId,
                authorId: input.authorId,
                body: input.body.trim(),
                parentId: parent?.id ?? null,
                isAnonymous: input.isAnonymous ?? false,
                anonId: input.anonId ?? null,
            },
            select: {
                id: true, body: true, isAnonymous: true, anonId: true,
                likesCount: true, createdAt: true, updatedAt: true,
                author: { select: COMMUNITY_POST_COMMENT_AUTHOR_SELECT },
            },
        });

        await tx.communityPost.update({
            where: { id: input.postId },
            data: { commentsCount: { increment: 1 } },
        });

        if (parent && parent.authorId !== input.authorId) {
            await tx.notification.create({
                data: {
                    userId: parent.authorId,
                    type: NotificationType.COMMENT_REPLY,
                    actorId: input.authorId,
                    commentId: created.id,
                    payload: { excerpt: input.body.slice(0, 140) },
                },
            });
        }

        return created;
    });

    return {
        ...comment,
        author: mapCommunityPostUser(comment.author),
        myVote: null,
        replies: [],
    };
}

export async function voteCommunityPostComment(input: {
    commentId: string;
    userId: string;
}) {
    const comment = await prisma.communityPostComment.findUnique({
        where: { id: input.commentId },
        select: { id: true, postId: true, authorId: true, body: true, likesCount: true },
    });
    if (!comment) throw new AppError('Comment not found', 404);

    const existing = await prisma.communityPostVote.findUnique({
        where: { commentId_userId: { commentId: input.commentId, userId: input.userId } },
        select: { id: true },
    });

    return prisma.$transaction(async (tx) => {
        if (existing) {
            // Toggle off — un-mark helpful
            await tx.communityPostVote.delete({ where: { id: existing.id } });
        } else {
            await tx.communityPostVote.create({
                data: { commentId: input.commentId, userId: input.userId, value: 1 },
            });
        }

        const grouped = await tx.communityPostVote.groupBy({
            by: ['value'],
            where: { commentId: input.commentId },
            _count: { _all: true },
        });

        const helpfulCount = grouped.find((g) => g.value === 1)?._count._all ?? 0;

        await tx.communityPostComment.update({
            where: { id: input.commentId },
            data: { likesCount: helpfulCount },
        });

        // Notify the comment author on the first helpful mark (not on un-mark)
        if (!existing && comment.authorId !== input.userId) {
            await tx.notification.create({
                data: {
                    userId: comment.authorId,
                    type: NotificationType.ROOM_HELPFUL,
                    actorId: input.userId,
                    payload: { postId: comment.postId, commentId: input.commentId, excerpt: comment.body.slice(0, 140) },
                },
            });
        }

        return { helpfulCount, isHelpful: !existing };
    });
}

export async function deleteCommunityPostComment(input: {
    commentId: string;
    userId: string;
    postId: string;
}) {
    const comment = await prisma.communityPostComment.findFirst({
        where: {
            id: input.commentId,
            postId: input.postId,
            deletedAt: null,
        },
        select: { id: true, authorId: true },
    });
    if (!comment) throw new AppError('Comment not found', 404);
    if (comment.authorId !== input.userId) {
        throw new AppError('You can only delete your own comments', 403);
    }

    await prisma.$transaction(async (tx) => {
        await tx.communityPostComment.update({
            where: { id: comment.id },
            data: { deletedAt: new Date() },
        });
        await tx.communityPost.update({
            where: { id: input.postId },
            data: { commentsCount: { decrement: 1 } },
        });
    });
}

export async function getContributorProfile(userId: string, options: { page?: number; limit?: number } = {}) {
    const page = options.page ?? 1;
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 50);
    const skip = (page - 1) * limit;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            username: true,
            trustLevel: true,
            createdAt: true,
        },
    });
    if (!user) throw new AppError('Contributor not found', 404);

    const [totalContributed, totalPublished] = await Promise.all([
        prisma.rawOpportunity.count({ where: { createdByUserId: userId } }),
        prisma.opportunity.count({
            where: {
                rawIngestions: { some: { createdByUserId: userId } },
                status: 'PUBLISHED',
                deletedAt: null,
            },
        }),
    ]);

    const opportunities = await prisma.opportunity.findMany({
        where: {
            rawIngestions: { some: { createdByUserId: userId } },
            status: 'PUBLISHED',
            deletedAt: null,
        },
        select: {
            id: true,
            slug: true,
            title: true,
            company: true,
            type: true,
            status: true,
            description: true,
            allowedDegrees: true,
            allowedCourses: true,
            allowedPassoutYears: true,
            requiredSkills: true,
            locations: true,
            workMode: true,
            salaryMin: true,
            salaryMax: true,
            salaryRange: true,
            stipend: true,
            employmentType: true,
            experienceMin: true,
            experienceMax: true,
            tags: true,
            sourceLink: true,
            applyLink: true,
            linkHealth: true,
            verificationFailures: true,
            postedAt: true,
            publishedAt: true,
            expiresAt: true,
            sharesCount: true,
            savesCount: true,
            clicksCount: true,
            commentsCount: true,
            trendingScore: true,
        },
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limit,
    });

    return {
        user: {
            ...user,
            stats: {
                totalContributed,
                totalPublished,
                approvalRate: totalContributed > 0 ? Math.round((totalPublished / totalContributed) * 100) : 0,
            },
        },
        opportunities,
        page,
        total: totalPublished,
        hasMore: skip + opportunities.length < totalPublished,
    };
}

export async function expireJobNotifyEngagedUsers(opportunityId: string) {
    const engagedUserIds = await prisma.$queryRaw<{ userId: string }[]>`
        SELECT DISTINCT "userId" FROM "Notification"
        WHERE "opportunityId" = ${opportunityId} AND "readAt" IS NULL
        UNION
        SELECT DISTINCT "userId" FROM "UserAction"
        WHERE "opportunityId" = ${opportunityId}
        UNION
        SELECT DISTINCT "userId" FROM "SavedOpportunity"
        WHERE "opportunityId" = ${opportunityId}
        UNION
        SELECT DISTINCT "userId" FROM "JobSignal"
        WHERE "opportunityId" = ${opportunityId}
    `;

    const userIds = [...new Set(engagedUserIds.map((u) => u.userId))];

    for (const userId of userIds) {
        await prisma.notification.create({
            data: {
                userId,
                type: NotificationType.EXPIRED_JOB,
                opportunityId,
                payload: { message: 'A job you engaged with has expired. Discussion is still available.' },
            },
        });
    }

    return { notifiedCount: userIds.length, opportunityId };
}

// ========================================
// PHASE 2: INTERVIEW EXPERIENCES
// ========================================

export async function listInterviewExperiences(
    opportunityId: string,
    options: { page?: number; limit?: number; userId?: string | null } = {}
) {
    const page = options.page ?? 1;
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 50);
    const skip = (page - 1) * limit;

    // Callers may pass a slug or a /jobs/<slug> URL, not only a raw id.
    const opportunity = await resolveOpportunity(opportunityId);
    const where = { opportunityId: opportunity.id, status: 'ACTIVE' as const };

    const [experiences, total] = await Promise.all([
        prisma.interviewExperience.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            include: {
                author: { select: COMMUNITY_POST_AUTHOR_SELECT },
                votes: {
                    where: { userId: options.userId ?? undefined },
                    select: { value: true },
                },
            },
        }),
        prisma.interviewExperience.count({ where }),
    ]);

    return {
        experiences: experiences.map((exp) => ({
            ...exp,
            rounds: exp.rounds as unknown as Array<{ name: string; questions: string[]; notes?: string }>,
            author: mapCommunityPostUser(exp.author),
            myVote: exp.votes[0]?.value ?? null,
        })),
        total,
        page,
        limit,
        hasMore: page * limit < total,
    };
}

export async function getInterviewExperienceSummary(opportunityId: string) {
    const opportunity = await resolveOpportunity(opportunityId);
    const where = { opportunityId: opportunity.id, status: 'ACTIVE' as const };

    const [total, byResult, byDifficulty] = await Promise.all([
        prisma.interviewExperience.count({ where }),
        prisma.interviewExperience.groupBy({
            by: ['result'],
            where,
            _count: { _all: true },
        }),
        prisma.interviewExperience.groupBy({
            by: ['difficulty'],
            where,
            _count: { _all: true },
        }),
    ]);

    const resultCounts: Record<string, number> = {};
    for (const group of byResult) {
        if (group.result) resultCounts[group.result] = group._count._all;
    }

    const difficultyCounts: Record<string, number> = {};
    for (const group of byDifficulty) {
        if (group.difficulty) difficultyCounts[group.difficulty] = group._count._all;
    }

    // Calculate average difficulty
    const diffOrder = ['EASY', 'MEDIUM', 'HARD', 'VERY_HARD'];
    let avgDifficulty: string | null = null;
    if (Object.keys(difficultyCounts).length > 0) {
        let totalWeight = 0;
        let totalCount = 0;
        for (const [diff, count] of Object.entries(difficultyCounts)) {
            const idx = diffOrder.indexOf(diff);
            if (idx >= 0) {
                totalWeight += idx * count;
                totalCount += count;
            }
        }
        if (totalCount > 0) {
            avgDifficulty = diffOrder[Math.round(totalWeight / totalCount)] ?? null;
        }
    }

    return {
        total,
        selected: resultCounts.SELECTED ?? 0,
        rejected: resultCounts.REJECTED ?? 0,
        waiting: resultCounts.WAITING ?? 0,
        avgDifficulty,
        byResult: resultCounts,
        byDifficulty: difficultyCounts,
    };
}

export async function createInterviewExperience(input: {
    authorId: string;
    opportunityId: string;
    role: string;
    batch?: number;
    rounds: Array<{ name: string; questions: string[]; notes?: string }>;
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | 'VERY_HARD';
    result?: 'SELECTED' | 'REJECTED' | 'WAITING' | 'WITHDRAWN';
    interviewDate?: string;
    overallNotes?: string;
}) {
    // Accept a raw id, a slug, or a /jobs/<slug> URL; store the canonical id so
    // interview lists keyed by either form still find the experience.
    const opp = await resolveOpportunity(input.opportunityId);

    const interviewDate = input.interviewDate ? new Date(input.interviewDate) : null;

    const experience = await prisma.interviewExperience.create({
        data: {
            opportunityId: opp.id,
            authorId: input.authorId,
            role: input.role.trim(),
            batch: input.batch ?? null,
            rounds: input.rounds as unknown as Prisma.InputJsonValue,
            difficulty: input.difficulty ?? null,
            result: input.result ?? null,
            interviewDate: interviewDate && !Number.isNaN(interviewDate.getTime()) ? interviewDate : null,
            overallNotes: input.overallNotes?.trim() || null,
            status: 'ACTIVE',
        },
        include: {
            author: { select: COMMUNITY_POST_AUTHOR_SELECT },
        },
    });

    return {
        ...experience,
        rounds: experience.rounds as unknown as Array<{ name: string; questions: string[]; notes?: string }>,
        author: mapCommunityPostUser(experience.author),
        myVote: null,
    };
}

export async function voteInterviewExperience(input: {
    experienceId: string;
    userId: string;
    value: number;
}) {
    const experience = await prisma.interviewExperience.findUnique({
        where: { id: input.experienceId, status: 'ACTIVE' },
        select: { id: true },
    });
    if (!experience) throw new AppError('Interview experience not found', 404);

    const existing = await prisma.interviewExperienceVote.findUnique({
        where: { interviewExperienceId_userId: { interviewExperienceId: input.experienceId, userId: input.userId } },
        select: { id: true, value: true },
    });

    return prisma.$transaction(async (tx) => {
        if (existing) {
            if (existing.value === input.value) {
                await tx.interviewExperienceVote.delete({ where: { id: existing.id } });
            } else {
                await tx.interviewExperienceVote.update({
                    where: { id: existing.id },
                    data: { value: input.value },
                });
            }
        } else {
            await tx.interviewExperienceVote.create({
                data: { interviewExperienceId: input.experienceId, userId: input.userId, value: input.value },
            });
        }

        const grouped = await tx.interviewExperienceVote.groupBy({
            by: ['value'],
            where: { interviewExperienceId: input.experienceId },
            _count: { _all: true },
        });

        const upvotes = grouped.find((g) => g.value === 1)?._count._all ?? 0;
        const downvotes = grouped.find((g) => g.value === -1)?._count._all ?? 0;

        await tx.interviewExperience.update({
            where: { id: input.experienceId },
            data: { upvotes, downvotes },
        });

        return { upvotes, downvotes, myVote: existing ? (existing.value === input.value ? null : input.value) : input.value };
    });
}

// ========================================
// PHASE 2: APPLICATION UPDATES
// ========================================

export async function listApplicationUpdates(
    opportunityId: string,
    options: { page?: number; limit?: number } = {}
) {
    const page = options.page ?? 1;
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 50);
    const skip = (page - 1) * limit;

    const where = { opportunityId };

    const [updates, total] = await Promise.all([
        prisma.applicationUpdate.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            include: {
                author: { select: COMMUNITY_POST_AUTHOR_SELECT },
            },
        }),
        prisma.applicationUpdate.count({ where }),
    ]);

    return {
        updates: updates.map((u) => ({
            ...u,
            author: mapCommunityPostUser(u.author),
        })),
        total,
        page,
        limit,
        hasMore: page * limit < total,
    };
}

export async function getApplicationUpdateSummary(opportunityId: string) {
    const grouped = await prisma.applicationUpdate.groupBy({
        by: ['status'],
        where: { opportunityId },
        _count: { _all: true },
    });

    const summary: Record<string, number> = {};
    for (const group of grouped) {
        summary[group.status] = group._count._all;
    }

    return {
        total: Object.values(summary).reduce((a, b) => a + b, 0),
        byStatus: summary,
    };
}

export async function createApplicationUpdate(input: {
    authorId: string;
    opportunityId: string;
    status: 'APPLIED' | 'ASSESSMENT_RECEIVED' | 'ASSESSMENT_COMPLETED' | 'INTERVIEW_SCHEDULED' | 'INTERVIEW_COMPLETED' | 'SELECTED' | 'REJECTED' | 'WAITING' | 'NO_RESPONSE';
    description?: string;
    evidenceUrl?: string;
}) {
    // Verify opportunity exists
    const opp = await prisma.opportunity.findFirst({
        where: { id: input.opportunityId, deletedAt: null },
        select: { id: true },
    });
    if (!opp) throw new AppError('Opportunity not found', 404);

    const update = await prisma.applicationUpdate.create({
        data: {
            opportunityId: input.opportunityId,
            authorId: input.authorId,
            status: input.status,
            description: input.description?.trim() || null,
            evidenceUrl: input.evidenceUrl?.trim() || null,
        },
        include: {
            author: { select: COMMUNITY_POST_AUTHOR_SELECT },
        },
    });

    return {
        ...update,
        author: mapCommunityPostUser(update.author),
    };
}

// ========================================
// PHASE 3: ROOMS (Persistent Communities)
// ========================================

export async function listRooms(options: {
    page?: number;
    limit?: number;
    type?: string;
    search?: string;
    sort?: 'popular' | 'newest';
    userId?: string | null;
}) {
    const page = options.page ?? 1;
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 50);
    const skip = (page - 1) * limit;

    const where: Prisma.RoomWhereInput = { status: 'ACTIVE', isPublic: true };

    if (options.type) {
        where.type = options.type as Prisma.EnumRoomTypeFilter['equals'];
    }
    if (options.search && options.search.trim().length > 0) {
        const term = options.search.trim().slice(0, 100);
        where.OR = [
            { name: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
        ];
    }

    const orderBy = options.sort === 'newest'
        ? { createdAt: 'desc' as const }
        : { memberCount: 'desc' as const };

    const [rooms, total] = await Promise.all([
        prisma.room.findMany({
            where,
            orderBy,
            skip,
            take: limit,
            include: {
                createdBy: { select: COMMUNITY_POST_AUTHOR_SELECT },
                ...(options.userId ? {
                    members: {
                        where: { userId: options.userId },
                        select: { role: true },
                        take: 1,
                    },
                } : {}),
            },
        }),
        prisma.room.count({ where }),
    ]);

    // "Active this week" — one aggregate query over the listed rooms
    const roomIds = rooms.map((room) => room.id);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activeRoomIds = new Set<string>();
    if (roomIds.length > 0) {
        const [recentPosts, recentComments] = await Promise.all([
            prisma.communityPost.groupBy({
                by: ['roomId'],
                where: { roomId: { in: roomIds }, createdAt: { gte: sevenDaysAgo }, status: 'ACTIVE' },
                _count: { _all: true },
            }),
            prisma.communityPostComment.groupBy({
                by: ['postId'],
                where: { createdAt: { gte: sevenDaysAgo }, deletedAt: null, post: { roomId: { in: roomIds } } },
                _count: { _all: true },
            }),
        ]);
        for (const row of recentPosts) if (row.roomId) activeRoomIds.add(row.roomId);
        if (recentComments.length > 0) {
            const commentPostIds = recentComments.map((row) => row.postId);
            const postsOfComments = await prisma.communityPost.findMany({
                where: { id: { in: commentPostIds }, roomId: { in: roomIds } },
                select: { roomId: true },
                distinct: ['roomId'],
            });
            for (const row of postsOfComments) if (row.roomId) activeRoomIds.add(row.roomId);
        }
    }

    return {
        rooms: rooms.map((room) => ({
            ...room,
            createdBy: room.createdBy ? mapCommunityPostUser(room.createdBy) : null,
            isMember: options.userId ? (room as any).members?.length > 0 : false,
            memberRole: options.userId ? ((room as any).members?.[0]?.role ?? null) : null,
            lastActiveThisWeek: activeRoomIds.has(room.id),
        })),
        total,
        page,
        limit,
        hasMore: page * limit < total,
    };
}

export async function getRoom(slug: string, userId?: string | null) {
    const room = await prisma.room.findUnique({
        where: { slug, status: 'ACTIVE' },
        include: {
            createdBy: { select: COMMUNITY_POST_AUTHOR_SELECT },
            ...(userId ? {
                members: {
                    where: { userId },
                    select: { role: true },
                    take: 1,
                },
            } : {}),
        },
    });
    if (!room) throw new AppError('Room not found', 404);

    // Get recent posts
    const recentPosts = await prisma.communityPost.findMany({
        where: { roomId: room.id, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
            author: { select: COMMUNITY_POST_AUTHOR_SELECT },
            votes: {
                where: { userId: userId ?? undefined },
                select: { value: true },
            },
        },
    });

    // Get recent members
    const members = await prisma.roomMember.findMany({
        where: { roomId: room.id },
        orderBy: { joinedAt: 'desc' },
        take: 20,
        include: {
            user: { select: COMMUNITY_POST_AUTHOR_SELECT },
        },
    });

    // "Active this week" — members who posted or commented in the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const memberIds = members.map((m) => m.userId);
    const activeThisWeekUserIds = new Set<string>();
    if (memberIds.length > 0) {
        const [activePosters, activeCommenters] = await Promise.all([
            prisma.communityPost.findMany({
                where: { roomId: room.id, authorId: { in: memberIds }, createdAt: { gte: sevenDaysAgo }, status: 'ACTIVE' },
                select: { authorId: true },
                distinct: ['authorId'],
            }),
            prisma.communityPostComment.findMany({
                where: { authorId: { in: memberIds }, createdAt: { gte: sevenDaysAgo }, deletedAt: null, post: { roomId: room.id } },
                select: { authorId: true },
                distinct: ['authorId'],
            }),
        ]);
        for (const row of activePosters) activeThisWeekUserIds.add(row.authorId);
        for (const row of activeCommenters) activeThisWeekUserIds.add(row.authorId);
    }

    return {
        room: {
            ...room,
            createdBy: room.createdBy ? mapCommunityPostUser(room.createdBy) : null,
            isMember: userId ? (room as any).members?.length > 0 : false,
            memberRole: userId ? ((room as any).members?.[0]?.role ?? null) : null,
            lastActiveThisWeek: activeThisWeekUserIds.size > 0,
        },
        recentPosts: recentPosts.map((post) => ({
            ...post,
            author: mapCommunityPostUser(post.author),
            myVote: post.votes[0]?.value ?? null,
        })),
        members: members.map((m) => ({
            user: mapCommunityPostUser(m.user),
            role: m.role,
            joinedAt: m.joinedAt.toISOString(),
            activeThisWeek: activeThisWeekUserIds.has(m.userId),
        })),
        activeThisWeekUserIds: Array.from(activeThisWeekUserIds),
    };
}

export async function createRoom(input: {
    createdByUserId: string;
    name: string;
    description?: string;
    icon?: string;
    type?: string;
}) {
    const slug = slugify(input.name);
    if (!slug) throw new AppError('Invalid room name', 400);

    const existing = await prisma.room.findUnique({ where: { slug }, select: { id: true } });
    if (existing) throw new AppError('A room with this name already exists', 409);

    const room = await prisma.$transaction(async (tx) => {
        const created = await tx.room.create({
            data: {
                slug,
                name: input.name.trim(),
                description: input.description?.trim() || null,
                icon: input.icon || null,
                type: (input.type as any) ?? 'CUSTOM',
                createdByUserId: input.createdByUserId,
                memberCount: 1,
            },
            include: {
                createdBy: { select: COMMUNITY_POST_AUTHOR_SELECT },
            },
        });

        // Auto-join the creator as admin
        await tx.roomMember.create({
            data: {
                roomId: created.id,
                userId: input.createdByUserId,
                role: 'ADMIN',
            },
        });

        return created;
    });

    return {
        ...room,
        createdBy: room.createdBy ? mapCommunityPostUser(room.createdBy) : null,
        isMember: true,
        memberRole: 'ADMIN',
    };
}

export async function joinRoom(input: { slug: string; userId: string }) {
    const room = await prisma.room.findUnique({
        where: { slug: input.slug, status: 'ACTIVE' },
        select: { id: true },
    });
    if (!room) throw new AppError('Room not found', 404);

    const existing = await prisma.roomMember.findUnique({
        where: { roomId_userId: { roomId: room.id, userId: input.userId } },
        select: { id: true },
    });
    if (existing) return { joined: true, message: 'Already a member' };

    await prisma.$transaction(async (tx) => {
        await tx.roomMember.create({
            data: { roomId: room.id, userId: input.userId },
        });
        await tx.room.update({
            where: { id: room.id },
            data: { memberCount: { increment: 1 } },
        });
    });

    return { joined: true };
}

export async function leaveRoom(input: { slug: string; userId: string }) {
    const room = await prisma.room.findUnique({
        where: { slug: input.slug, status: 'ACTIVE' },
        select: { id: true },
    });
    if (!room) throw new AppError('Room not found', 404);

    const existing = await prisma.roomMember.findUnique({
        where: { roomId_userId: { roomId: room.id, userId: input.userId } },
        select: { id: true, role: true },
    });
    if (!existing) return { left: true, message: 'Not a member' };
    if (existing.role === 'ADMIN') throw new AppError('Admins cannot leave their own room', 400);

    await prisma.$transaction(async (tx) => {
        await tx.roomMember.delete({ where: { id: existing.id } });
        await tx.room.update({
            where: { id: room.id },
            data: { memberCount: { decrement: 1 } },
        });
    });

    return { left: true };
}

export async function listRoomPosts(slug: string, options: { page?: number; limit?: number; userId?: string | null } = {}) {
    const room = await prisma.room.findUnique({ where: { slug, status: 'ACTIVE' }, select: { id: true } });
    if (!room) throw new AppError('Room not found', 404);

    const page = options.page ?? 1;
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 50);
    const skip = (page - 1) * limit;

    const where = { roomId: room.id, status: 'ACTIVE' as const };

    const [posts, total] = await Promise.all([
        prisma.communityPost.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            include: {
                author: { select: COMMUNITY_POST_AUTHOR_SELECT },
                votes: {
                    where: { userId: options.userId ?? undefined },
                    select: { value: true },
                },
            },
        }),
        prisma.communityPost.count({ where }),
    ]);

    return {
        posts: posts.map((post) => ({
            ...post,
            author: mapCommunityPostUser(post.author),
            myVote: post.votes[0]?.value ?? null,
        })),
        total,
        page,
        limit,
        hasMore: page * limit < total,
    };
}
