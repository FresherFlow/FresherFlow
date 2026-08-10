import { Router, Request, Response } from 'express';
import { loadDefaultTargets } from '../lib/targets.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const targets = await loadDefaultTargets();
    res.json({
      status: 'ok',
      total: targets.length,
      targets
    });
  } catch (error) {
    console.error('Failed to load targets:', error);
    res.status(500).json({ status: 'error', error: String(error) });
  }
});

export default router;
