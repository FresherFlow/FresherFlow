/**
 * Admin Opportunities Router
 *
 * Thin registration file — no business logic here.
 * Each handler module is self-contained.
 *
 * Route map:
 *   GET    /                    → list.ts   (list + search)
 *   GET    /summary             → list.ts   (aggregate counts)
 *   GET    /export              → export.ts (CSV download)
 *   POST   /parse               → parse.ts  (text → structured fields)
 *   POST   /                    → create.ts (create published)
 *   POST   /ingest-draft        → create.ts (create draft)
 *   POST   /bulk                → bulk.ts   (bulk actions)
 *   GET    /:id                 → list.ts   (get single)
 *   PUT    /:id                 → create.ts (update)
 *   POST   /:id/expire          → lifecycle.ts
 *   POST   /:id/restore         → lifecycle.ts
 *   DELETE /:id                 → lifecycle.ts
 *   GET    /:id/events          → events.ts
 *   POST   /:id/events          → events.ts
 *   PATCH  /:id/events/:eventId → events.ts
 *   DELETE /:id/events/:eventId → events.ts
 */
import express, { Router } from 'express';
import { requireAdmin } from '../../../middleware/auth';

import listRouter     from './list';
import createRouter   from './create';
import bulkRouter     from './bulk';
import lifecycleRouter from './lifecycle';
import exportRouter   from './export';
import parseRouter    from './parse';
import eventsRouter   from './events';

const router: Router = express.Router();

// Auth guard applies to all sub-routes
router.use(requireAdmin);

// Fixed-path routes registered before /:id to avoid shadowing
router.use('/', exportRouter);   // GET /export
router.use('/', parseRouter);    // POST /parse
router.use('/', bulkRouter);     // POST /bulk
router.use('/', listRouter);     // GET /, GET /summary, GET /:id
router.use('/', createRouter);   // POST /, POST /ingest-draft, PUT /:id
router.use('/', lifecycleRouter); // POST /:id/expire, POST /:id/restore, DELETE /:id

// Nested event routes with mergeParams so they inherit :id
router.use('/:id/events', eventsRouter);

export default router;
