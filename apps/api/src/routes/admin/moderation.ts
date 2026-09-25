import { Router, Request, Response, NextFunction } from 'express';
import prisma, {
    JobSubmissionStatus as DbJobSubmissionStatus,
    CommunityPostStatus as DbCommunityPostStatus,
    ResourceItemStatus as DbResourceItemStatus,
    ReportStatus as DbReportStatus,
} from '../../infrastructure/database/prisma';
import { requireModerator, requireStaff } from '../../middleware/auth';

const router = Router();

// Mounted as /api/admin/moderation behind a domain gate in index.ts.
// requireStaff authenticates admins and moderators (via the normal login,
// suspended accounts get 403); requireModerator then restricts to admins and
// MODERATOR AccessRole holders. Plain users get 403. No-store: counts are live.
router.use(requireStaff, requireModerator);

/**
 * GET /api/admin/moderation/overview
 * Single queue-count snapshot for the moderator area navigation (V1 checklist
 * sections 5 and 6): pending job submissions, live-but-triageable community
 * contributions, pending resources, and open reports. Read-only; per-queue
 * listing and per-item actions stay on their existing endpoints (job
 * submissions, community moderation-queue, resources, reports) so this router
 * adds no duplicate CRUD.
 */
router.get('/overview', async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const [jobs, interviews, updates, hiringPosts, resources, reports] = await Promise.all([
            prisma.jobSubmission.count({ where: { status: DbJobSubmissionStatus.PENDING_REVIEW } }),
            prisma.interviewExperience.count({ where: { status: DbCommunityPostStatus.ACTIVE } }),
            // ApplicationUpdate has no status column: every row is live.
            prisma.applicationUpdate.count(),
            prisma.communityPost.count({
                where: { category: 'HIRING_UPDATE', status: DbCommunityPostStatus.ACTIVE },
            }),
            prisma.resourceCollection.count({ where: { status: DbResourceItemStatus.PENDING_REVIEW } }),
            prisma.report.count({ where: { status: DbReportStatus.OPEN } }),
        ]);

        res.setHeader('Cache-Control', 'private, no-store');
        return res.json({
            success: true,
            queues: { jobs, interviews, updates, hiringPosts, resources, reports },
        });
    } catch (error) {
        next(error);
    }
});

export default router;
