import { Router } from 'express';
import jobsRouter from './jobs';

const router: Router = Router();
router.use('/', jobsRouter);

export default router;
