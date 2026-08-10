import { Router, Request, Response } from 'express';
import { loadDefaultTargets } from '../lib/targets.js';
import { runTarget } from '../lib/runner.js';
import { redis } from '@fresherflow/redis';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { searchTerm, companySlug } = req.body;

  if (!companySlug) {
    res.status(400).json({ error: 'companySlug is required' });
    return;
  }

  const cacheKey = `search:${companySlug}:${searchTerm || ''}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      res.json(JSON.parse(cached));
      return;
    }
  } catch (err) {
    console.error('Redis cache error:', err);
  }

  const targets = await loadDefaultTargets();
  const target = targets.find(t => t.slug === companySlug);

  if (!target) {
    res.status(404).json({ error: `Target for companySlug '${companySlug}' not found` });
    return;
  }

  try {
    const result = await runTarget({ ...target, dryRun: true });
    
    let jobs = result.jobs || [];

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      jobs = jobs.filter(job => 
        (job.title && job.title.toLowerCase().includes(lowerSearch)) ||
        (job.description && job.description.toLowerCase().includes(lowerSearch))
      );
    }

    const responseData = { ...result, jobs };

    try {
      await redis.setex(cacheKey, 3600, JSON.stringify(responseData));
    } catch (err) {
      console.error('Redis cache error:', err);
    }

    res.json(responseData);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search' });
  }
});

export default router;
