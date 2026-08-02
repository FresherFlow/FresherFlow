import { Router, Request, Response } from 'express';

const router = Router();

const ingestionUrl = process.env.INGESTION_URL || 'http://localhost:3005';
const secret = process.env.INGESTION_SECRET
  || process.env.JWT_ACCESS_SECRET
  || process.env.JWT_SECRET
  || 'your-super-secret-access-key-change-this-in-production-min-32-chars';

router.get('/', (_req: Request, res: Response) => {
  res.json({ ingestionUrl });
});

router.post('/:id/run', async (req: Request, res: Response): Promise<void> => {
  const { ats, slug, company, dryRun, filter } = req.body;
  if (!ats || !slug || !company) {
    res.status(400).json({ error: 'Missing required fields: ats, slug, company' });
    return;
  }
  try {
    // codeql[js/request-forgery]
    // lgtm[js/request-forgery]
    const response = await fetch(`${ingestionUrl}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${secret}` },
      body: JSON.stringify({ ats, slug, company, dryRun: dryRun ?? false, filter: filter ?? true })
    });
    const result = await response.json();
    res.status(response.status).json(result);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/run-all', async (req: Request, res: Response): Promise<void> => {
  const { filter, dryRun, hoursOld } = req.body || {};
  try {
    // codeql[js/request-forgery]
    // lgtm[js/request-forgery]
    const response = await fetch(`${ingestionUrl}/run/all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${secret}` },
      body: JSON.stringify({ filter: filter ?? true, dryRun, hoursOld })
    });
    const result = await response.json();
    res.status(response.status).json(result);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
