import { Router } from 'express';
import { getStats, getSummaryStats } from '../lib/stats.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json(getStats());
});

router.get('/summary', async (_req, res) => {
  try {
    const summary = await getSummaryStats();
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

export default router;
