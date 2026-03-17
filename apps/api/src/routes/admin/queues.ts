import { Router } from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { getQueue, QUEUE_NAMES } from '@fresherflow/queue';
import { requireAdmin } from '../../middleware/auth';

const router = Router();
const serverAdapter = new ExpressAdapter();
let isBullBoardInitialized = false;

function ensureBullBoardInitialized() {
  if (isBullBoardInitialized) {
    return;
  }

  serverAdapter.setBasePath('/api/admin/queues/ui');
  const queues = Object.values(QUEUE_NAMES).map((name) => new BullMQAdapter(getQueue(name)));

  createBullBoard({
    queues,
    serverAdapter,
  });

  isBullBoardInitialized = true;
}

/**
 * BullBoard Dashboard Route
 * Accessible at /api/admin/queues/ui
 */
router.use('/ui', requireAdmin, (req, res, next) => {
  ensureBullBoardInitialized();
  return serverAdapter.getRouter()(req, res, next);
});

export default router;
