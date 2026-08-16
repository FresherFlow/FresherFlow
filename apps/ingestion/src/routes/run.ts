import { Router, Request, Response } from 'express';
import { runTarget, type RunTarget } from '../lib/runner.js';
import { loadDefaultTargets } from '../lib/targets.js';
import { requireAuth } from '../middleware/auth.js';
import { getQueue, QUEUE_NAMES } from '@fresherflow/queue';
import { parseJobUrl } from '../lib/url-parser.js';

const router = Router();

// Public endpoint for listing targets
router.get('/targets', async (_req: Request, res: Response): Promise<void> => {
  const targets = await loadDefaultTargets();
  res.json({ targets });
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

  const queue = getQueue(QUEUE_NAMES.scraper);
  const jobIds = [];
  
  for (const t of targets) {
    const job = await queue.add('run-target', t);
    jobIds.push(job.id);
  }

  res.json({ jobIds });
});

router.post('/links', async (req: Request, res: Response): Promise<void> => {
  const { urls } = req.body;
  if (!Array.isArray(urls) || urls.length === 0) {
    res.status(400).json({ error: 'Body must contain an array of urls' });
    return;
  }
  
  const queue = getQueue(QUEUE_NAMES.scraper);
  const jobIds = [];
  const invalidUrls = [];
  
  for (const urlStr of urls) {
    const parsed = parseJobUrl(urlStr);
    if (!parsed) {
      invalidUrls.push(urlStr);
      continue;
    }
    
    const target: RunTarget = {
      ats: parsed.ats as any,
      slug: parsed.slug,
      company: parsed.slug,
      specificUrl: parsed.url,
      resultsWanted: 1, // Only need one if we are filtering for a specific link
    };
    
    const job = await queue.add('run-target', target);
    jobIds.push(job.id);
  }

  res.json({ jobIds, invalidUrls });
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

  const queue = getQueue(QUEUE_NAMES.scraper);
  const jobIds = [];

  for (const t of targetList) {
    const job = await queue.add('run-target', t);
    jobIds.push(job.id);
  }

  res.json({ totalTargets: targetList.length, jobIds });
});

router.get('/status/:jobId', async (req: Request, res: Response): Promise<void> => {
  const queue = getQueue(QUEUE_NAMES.scraper);
  const jobId = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
  const job = await queue.getJob(jobId);
  
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }
  
  const state = await job.getState();
  res.json({
    id: job.id,
    state,
    result: job.returnvalue,
    failedReason: job.failedReason
  });
});

export default router;
