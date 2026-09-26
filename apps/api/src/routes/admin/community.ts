import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../infrastructure/database/prisma';
import { requirePermission, requireStaff } from '../../middleware/auth';
import { adminRateLimit } from '../../middleware/adminRateLimit';
import { withAdminAudit, validateReason } from '../../middleware/adminAudit';
import { AppError } from '../../middleware/errorHandler';
import {
    listCommunityModerationQueue,
    setInterviewExperienceStatus,
    deleteApplicationUpdate,
    setCommunityPostStatus,
} from '../../application/community/moderation';

const router = Router();

// Mounted as /api/admin/community behind a domain gate in index.ts; enforce
// staff auth here like routes/admin/opportunities/index.ts does: admins and
// moderators (via the normal login) pass requireStaff, then the
// least-privilege community.moderate gate applies router-wide (after
// requireStaff sets req.adminId/req.userId). SUPER_ADMIN holders keep access
// via the seed backfill.
router.use(requireStaff, requirePermission('community.moderate'));

/**
 * Admin community moderation — V1 checklist F.
 *
 * Covers what the opportunity lifecycle routes do not: CommunityPost,
 * CommunityPostComment, OpportunityComment (admin override beyond the
 * author-only public delete), InterviewExperience, and ApplicationUpdate.
 *
 * Removals are soft (status change / deletedAt) except ApplicationUpdate,
 * which has no status/deletedAt column — there removal is a hard delete.
 * Every mutation is rate-limited and audit-logged, mirroring
 * routes/admin/opportunities/lifecycle.ts. Thin handlers delegate to
 * application/community/moderation.ts; only ops with no application helper
 * (post hard-remove, comment soft-deletes) touch Prisma directly.
 */

const moderationQueueQuerySchema = z.object({
    kind: z.enum(['interview', 'update', 'hiring-post']).optional().default('interview'),
    status: z.enum(['ACTIVE', 'ARCHIVED', 'DELETED']).optional().default('ACTIVE'),
    page: z.coerce.number().int().min(1).max(1000).optional().default(1),
    limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

/**
 * GET /api/admin/community/moderation-queue?kind=interview&status=ACTIVE
 * Triage for contributions with no PENDING_REVIEW gate (interviews, hiring
 * updates, HIRING_UPDATE posts go live immediately). Newest first.
 */
router.get(
    '/moderation-queue',
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            // NOTE: validate() middleware only parses req.body, so the query
            // string is validated inline here (400 on malformed input).
            const parsed = moderationQueueQuerySchema.safeParse(req.query);
            if (!parsed.success) {
                const messages = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
                throw new AppError(messages.join(', '), 400);
            }
            const { kind, status, page, limit } = parsed.data;
            const result = await listCommunityModerationQueue({ kind, status, page, limit });
            res.setHeader('Cache-Control', 'private, no-store');
            return res.json({ success: true, ...result });
        } catch (error) {
            next(error);
        }
    },
);

/** DELETE /api/admin/community/posts/:id — remove inappropriate post (soft). */
router.delete(
    '/posts/:id',
    adminRateLimit,
    validateReason,
    withAdminAudit('DELETE'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = String(req.params.id);
            const existing = await prisma.communityPost.findUnique({
                where: { id },
                select: { id: true },
            });
            if (!existing) throw new AppError('Community post not found', 404);
            // DELETED has no application helper (setCommunityPostStatus caps at
            // ARCHIVED); single-table write needs no transaction.
            const post = await prisma.communityPost.update({
                where: { id },
                data: { status: 'DELETED' },
                select: { id: true, status: true },
            });
            return res.json({ success: true, post, message: 'Community post removed (soft delete)' });
        } catch (error) {
            next(error);
        }
    },
);

/** POST /api/admin/community/posts/:id/spam — flag post as spam (ARCHIVED). */
router.post(
    '/posts/:id/spam',
    adminRateLimit,
    validateReason,
    withAdminAudit('SPAM'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const post = await setCommunityPostStatus(String(req.params.id), 'ARCHIVED');
            return res.json({ success: true, post, message: 'Community post flagged as spam and archived' });
        } catch (error) {
            next(error);
        }
    },
);

/** POST /api/admin/community/posts/:id/restore — undo a removal. */
router.post(
    '/posts/:id/restore',
    adminRateLimit,
    withAdminAudit('UPDATE'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const post = await setCommunityPostStatus(String(req.params.id), 'ACTIVE');
            return res.json({ success: true, post, message: 'Community post restored' });
        } catch (error) {
            next(error);
        }
    },
);

/** DELETE /api/admin/community/posts/comments/:commentId — admin override (soft). */
router.delete(
    '/posts/comments/:commentId',
    adminRateLimit,
    validateReason,
    withAdminAudit('DELETE'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const commentId = String(req.params.commentId);
            const existing = await prisma.communityPostComment.findUnique({
                where: { id: commentId },
                select: { id: true },
            });
            if (!existing) throw new AppError('Comment not found', 404);
            await prisma.communityPostComment.update({
                where: { id: commentId },
                data: { deletedAt: new Date() },
            });
            return res.json({ success: true, commentId, message: 'Community comment removed (soft delete)' });
        } catch (error) {
            next(error);
        }
    },
);

/** DELETE /api/admin/community/comments/:commentId — job-discussion admin override (soft). */
router.delete(
    '/comments/:commentId',
    adminRateLimit,
    validateReason,
    withAdminAudit('DELETE'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const commentId = String(req.params.commentId);
            const existing = await prisma.opportunityComment.findUnique({
                where: { id: commentId },
                select: { id: true },
            });
            if (!existing) throw new AppError('Comment not found', 404);
            await prisma.opportunityComment.update({
                where: { id: commentId },
                data: { deletedAt: new Date() },
            });
            return res.json({ success: true, commentId, message: 'Job comment removed (soft delete)' });
        } catch (error) {
            next(error);
        }
    },
);

/** DELETE /api/admin/community/interviews/:id — remove interview experience (soft). */
router.delete(
    '/interviews/:id',
    adminRateLimit,
    validateReason,
    withAdminAudit('DELETE'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = String(req.params.id);
            const existing = await prisma.interviewExperience.findUnique({
                where: { id },
                select: { id: true },
            });
            if (!existing) throw new AppError('Interview experience not found', 404);
            const experience = await prisma.interviewExperience.update({
                where: { id },
                data: { status: 'DELETED' },
                select: { id: true, status: true },
            });
            return res.json({ success: true, experience, message: 'Interview experience removed' });
        } catch (error) {
            next(error);
        }
    },
);

/** POST /api/admin/community/interviews/:id/spam — flag interview as spam. */
router.post(
    '/interviews/:id/spam',
    adminRateLimit,
    validateReason,
    withAdminAudit('SPAM'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const experience = await setInterviewExperienceStatus(String(req.params.id), 'ARCHIVED');
            return res.json({ success: true, experience, message: 'Interview experience flagged as spam' });
        } catch (error) {
            next(error);
        }
    },
);

/** POST /api/admin/community/interviews/:id/restore — undo a removal. */
router.post(
    '/interviews/:id/restore',
    adminRateLimit,
    withAdminAudit('UPDATE'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const experience = await setInterviewExperienceStatus(String(req.params.id), 'ACTIVE');
            return res.json({ success: true, experience, message: 'Interview experience restored' });
        } catch (error) {
            next(error);
        }
    },
);

/** DELETE /api/admin/community/salary/:id — remove salary report (soft). */
router.delete(
    '/salary/:id',
    adminRateLimit,
    validateReason,
    withAdminAudit('DELETE'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = String(req.params.id);
            const existing = await prisma.salaryReport.findUnique({
                where: { id },
                select: { id: true },
            });
            if (!existing) throw new AppError('Salary report not found', 404);
            const report = await prisma.salaryReport.update({
                where: { id },
                data: { status: 'DELETED' },
                select: { id: true, status: true },
            });
            return res.json({ success: true, report, message: 'Salary report removed' });
        } catch (error) {
            next(error);
        }
    },
);

/** POST /api/admin/community/salary/:id/restore — undo a removal. */
router.post(
    '/salary/:id/restore',
    adminRateLimit,
    withAdminAudit('UPDATE'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = String(req.params.id);
            const existing = await prisma.salaryReport.findUnique({
                where: { id },
                select: { id: true },
            });
            if (!existing) throw new AppError('Salary report not found', 404);
            const report = await prisma.salaryReport.update({
                where: { id },
                data: { status: 'ACTIVE' },
                select: { id: true, status: true },
            });
            return res.json({ success: true, report, message: 'Salary report restored' });
        } catch (error) {
            next(error);
        }
    },
);

/**
 * DELETE /api/admin/community/updates/:id — remove hiring update.
 * ApplicationUpdate has no status/deletedAt column, so removal is a hard
 * delete. This is explicit and documented, not an oversight.
 */
router.delete(
    '/updates/:id',
    adminRateLimit,
    validateReason,
    withAdminAudit('DELETE'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await deleteApplicationUpdate(String(req.params.id));
            return res.json({ success: true, ...result, message: 'Hiring update removed' });
        } catch (error) {
            next(error);
        }
    },
);

export default router;
