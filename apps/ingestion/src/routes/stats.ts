import { Router } from 'express';
import { getStats } from '../lib/stats.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(getStats());
});

export default router;
