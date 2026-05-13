import { Router } from 'express';
import feedRouter from './feed';
import detailRouter from './detail';
import searchRouter from './search';
import eventsRouter from './events';
import { optionalAuth } from '../../../middleware/auth';

import ingestRouter from './ingest';
import submitRouter from './submit';
import shareRouter from './share';
import clicksRouter from './clicks';
import similarRouter from './similar';
import commentsRouter from './comments';
import syncRouter from './sync';

const router: Router = Router();

// Order matters: specific routes MUST come before parameter routes (like /:id)
router.use('/sync', syncRouter);

router.use('/', optionalAuth, shareRouter);
router.use('/', optionalAuth, ingestRouter);
router.use('/', optionalAuth, submitRouter);
router.use('/', optionalAuth, searchRouter);
router.use('/', optionalAuth, similarRouter);
router.use('/', optionalAuth, feedRouter);
router.use('/', eventsRouter);
router.use('/', optionalAuth, commentsRouter);
router.use('/', detailRouter);
router.use('/', optionalAuth, clicksRouter);

export default router;
