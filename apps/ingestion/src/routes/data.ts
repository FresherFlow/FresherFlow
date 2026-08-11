import { Router, Request, Response } from 'express';
import { pool } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/jobs/processed', async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, limit = 50 } = req.query;
    let q = 'SELECT id, discovered_job_id as "discoveredId", title, company, company_website as "companyWebsite", company_logo_url as "companyLogoUrl", description, type, locations, structured_locations as "structuredLocations", required_skills as "requiredSkills", allowed_degrees as "allowedDegrees", allowed_courses as "allowedCourses", allowed_specializations as "allowedSpecializations", allowed_passout_years as "allowedPassoutYears", work_mode as "workMode", experience_min as "experienceMin", experience_max as "experienceMax", salary_range as "salaryRange", salary_period as "salaryPeriod", employment_type as "employmentType", job_function as "jobFunction", apply_link as "applyLink", status, created_at as "createdAt", updated_at as "updatedAt" FROM processed_jobs';
    const params: any[] = [];
    if (status && status !== 'ALL') {
      q += ' WHERE status = $1';
      params.push(status);
    }
    q += ` ORDER BY created_at DESC LIMIT ${parseInt(String(limit), 10)}`;
    const result = await pool.query(q, params);
    res.json({ jobs: result.rows });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.get('/jobs', async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, limit = 50 } = req.query;
    let q =
      'SELECT id, company, title, location, apply_link, status, ats_type, fresher_score, created_at FROM discovered_jobs';
    const params: any[] = [];
    if (status && status !== 'ALL') {
      q += ' WHERE status = $1';
      params.push(status);
    }
    q += ` ORDER BY created_at DESC LIMIT ${parseInt(String(limit), 10)}`;
    const result = await pool.query(q, params);
    res.json({ jobs: result.rows });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.get('/runs', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query('SELECT id, started_at as "startedAt", completed_at as "completedAt", duration_ms as "durationMs", total_found as "totalFound", accepted, review_required as "reviewRequired", duplicates, failed, status FROM discovery_runs ORDER BY started_at DESC LIMIT 20');
    res.json({ runs: result.rows });
  } catch (error) {
    res.json({ runs: [] });
  }
});

router.get('/stats/db', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'PENDING_REVIEW' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'PUBLISHED' THEN 1 END) as published
      FROM processed_jobs
    `);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.patch('/jobs/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    await pool.query('UPDATE discovered_jobs SET status = $1 WHERE id = $2', [
      status,
      req.params.id,
    ]);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.delete('/jobs', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids, type } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'Missing or invalid ids' });
      return;
    }
    
    const table = type === 'processed' ? 'processed_jobs' : 'discovered_jobs';
    
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    await pool.query(`DELETE FROM ${table} WHERE id IN (${placeholders})`, ids);
    
    res.json({ ok: true, deleted: ids.length });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

export default router;
