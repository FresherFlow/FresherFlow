import { Router, Request, Response, NextFunction } from "express";
import { AppError } from "../../middleware/errorHandler";
import { PipelineService } from "../../infrastructure/services/organization/pipeline.service";
import pipelineRoutes, { stageRoutes } from "./pipelines";
import applicationRoutes from "./applications";

/**
 * ATS / hiring pipeline router, mounted by src/index.ts at `/api/pipeline`.
 *
 * This aggregator deliberately does NOT include the pre-existing
 * `./expireJobs` router — src/index.ts already mounts that one at the same
 * prefix, and re-mounting it here would register its handlers twice.
 *
 * The org pipeline router is mounted under both
 * `/organizations/:organizationId` and `/organizations/:organizationId/pipelines`.
 * Both spellings appear in clients already, and one shared handler set keeps the
 * authorization rules from drifting between them.
 *
 * WHY two `use` calls instead of one array: Express 5 dropped array support for
 * `router.use()`, and an array here silently mounts nothing — every org route
 * 404s. Registering the prefixes separately is the supported form.
 *
 * WHY each mount is followed by a param re-bind: in Express 5 a `use` mount
 * consumes its own path params, and `req.params` is rebuilt for the sub-router
 * from what is left of the URL. Mounted at `/organizations/:organizationId`,
 * the sub-router therefore sees an empty `req.params` and
 * `parseOrThrow(orgParamsSchema, req.params)` fails with a 400 before the
 * authorization check ever runs. Re-attaching the captured value makes the org
 * id explicit for both mount shapes, which is what `orgParamsSchema` expects.
 */
const router = Router();

/**
 * GET /api/pipeline/default
 * The platform template pipeline, readable without auth: it is the same shape
 * every org starts from, it holds no tenant data, and the public opportunity
 * pages render it. 404 when the platform has not seeded one yet.
 */
router.get(
  "/default",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const template = await PipelineService.getPlatformTemplate();
      if (!template) throw new AppError("Default pipeline not found", 404);
      return res.json({ success: true, data: template });
    } catch (error) {
      return next(error);
    }
  },
);

router.use("/organizations/:organizationId/pipelines", pipelineRoutes);
router.use("/organizations/:organizationId", pipelineRoutes);

// Stage routes are addressed by pipeline/stage id alone; the owning organization
// is resolved from the row, not from the path.
router.use(stageRoutes);
router.use(applicationRoutes);

export default router;
