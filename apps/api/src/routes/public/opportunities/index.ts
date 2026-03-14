import { Router } from 'express';
import feedRouter from './feed';
import detailRouter from './detail';
import searchRouter from './search';
import eventsRouter from './events';
import { optionalAuth } from '../../../middleware/auth';

const router: Router = Router();

// Order matters: specific routes before parameter routes
router.use('/', optionalAuth, searchRouter);
router.use('/', optionalAuth, feedRouter);
router.use('/', eventsRouter);
router.use('/', detailRouter);

export default router;
