import { Router, Request, Response } from 'express';
import { runTarget, type RunTarget } from '../lib/runner.js';
import { loadDefaultTargets, DEFAULT_INGESTION_TARGETS } from '../lib/targets.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Public endpoint for listing targets
router.get('/targets', async (_req: Request, res: Response): Promise<void> => {
  const targets = await loadDefaultTargets();
  res.json(targets);
});

router.use(requireAuth);

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const target: RunTarget = req.body;
  if (!target || !target.ats || !target.slug || !target.company) {
    res.status(400).json({ error: 'Missing required fields: ats, slug, company' });
    return;
  }
  const result = await runTarget(target);
  res.json(result);
});

router.post('/batch', async (req: Request, res: Response): Promise<void> => {
  const targets: RunTarget[] = req.body;
  if (!Array.isArray(targets) || targets.length === 0) {
    res.status(400).json({ error: 'Body must be an array of targets' });
    return;
  }
  if (targets.length > 50) {
    res.status(400).json({ error: 'Max 50 targets allowed per batch' });
    return;
  }

  const results = [];
  // Concurrency 5
  for (let i = 0; i < targets.length; i += 5) {
    const batch = targets.slice(i, i + 5);
    const resBatch = await Promise.all(batch.map(t => runTarget(t)));
    results.push(...resBatch);
  }

  res.json(results);
});

router.post('/all', async (req: Request, res: Response): Promise<void> => {
  const { targets, filter, hoursOld, resultsWanted, dryRun } = req.body || {};
  let inputTargets: RunTarget[] = Array.isArray(targets) && targets.length > 0 ? targets : await loadDefaultTargets();

  const targetList: RunTarget[] = inputTargets.map((t: any) => ({
    ...t,
    filter: t.filter !== undefined ? t.filter : (filter !== undefined ? filter : true),
    hoursOld: t.hoursOld ?? hoursOld,
    resultsWanted: t.resultsWanted ?? resultsWanted,
    dryRun: t.dryRun ?? dryRun
  }));

  const results = [];
  const CONCURRENCY = 5;
  for (let i = 0; i < targetList.length; i += CONCURRENCY) {
    const batch = targetList.slice(i, i + CONCURRENCY);
    const resBatch = await Promise.all(batch.map(t => runTarget(t)));
    results.push(...resBatch);
  }

  const summary = {
    totalTargets: results.length,
    success: results.filter(r => r.status === 'OK').length,
    failed: results.filter(r => r.status === 'ERROR').length,
    timedOut: results.filter(r => r.status === 'TIMEOUT').length,
    totalJobsFetched: results.reduce((acc, r) => acc + r.total, 0),
    totalJobsSaved: results.reduce((acc, r) => acc + r.saved, 0),
    results
  };

  res.json(summary);
});

export default router;
