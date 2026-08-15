import { Router, Request, Response } from 'express';
import { pool } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit';
import { parseJobTextLite } from '@fresherflow/parser';
import { PLUGIN_REGISTRY } from '@fresherflow/plugins';

const stripHtml = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const router = Router();
const searchLimiter = rateLimit({ windowMs: 60_000, max: 60, standardHeaders: true, legacyHeaders: false });
router.use(searchLimiter);

router.get('/jobs/processed', async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, limit = 50 } = req.query;
    let q = 'SELECT id, discovered_job_id as "discoveredId", title, company, company_website as "companyWebsite", company_logo_url as "companyLogoUrl", description, type, locations, structured_locations as "structuredLocations", required_skills as "requiredSkills", allowed_degrees as "allowedDegrees", allowed_courses as "allowedCourses", allowed_specializations as "allowedSpecializations", allowed_passout_years as "allowedPassoutYears", work_mode as "workMode", experience_min as "experienceMin", experience_max as "experienceMax", salary_range as "salaryRange", salary_period as "salaryPeriod", employment_type as "employmentType", job_function as "jobFunction", apply_link as "applyLink", source_url as "sourceUrl", incentives, selection_process as "selectionProcess", notes_highlights as "notesHighlights", application_details as "applicationDetails", walk_in_details as "walkInDetails", status, created_at as "createdAt", updated_at as "updatedAt" FROM processed_jobs';
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

router.post('/jobs/processed/push-batch', async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'Missing or invalid ids' });
      return;
    }
    // Only fetch, do not update yet!
    const q = 'SELECT id, discovered_job_id as "discoveredId", title, company, company_website as "companyWebsite", company_logo_url as "companyLogoUrl", description, type, locations, structured_locations as "structuredLocations", required_skills as "requiredSkills", allowed_degrees as "allowedDegrees", allowed_courses as "allowedCourses", allowed_specializations as "allowedSpecializations", allowed_passout_years as "allowedPassoutYears", work_mode as "workMode", experience_min as "experienceMin", experience_max as "experienceMax", salary_range as "salaryRange", salary_period as "salaryPeriod", employment_type as "employmentType", job_function as "jobFunction", apply_link as "applyLink", source_url as "sourceUrl", incentives, selection_process as "selectionProcess", notes_highlights as "notesHighlights", application_details as "applicationDetails", walk_in_details as "walkInDetails", status, created_at as "createdAt", updated_at as "updatedAt" FROM processed_jobs WHERE id = ANY($1)';
    const result = await pool.query(q, [ids]);
    res.json({ jobs: result.rows });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/jobs/processed/mark-published', async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'Missing or invalid ids' });
      return;
    }
    
    await pool.query("UPDATE processed_jobs SET status = 'PUBLISHED' WHERE id = ANY($1)", [ids]);
    res.json({ ok: true, updated: ids.length });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/jobs/processed/mark-rejected', async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'Missing or invalid ids' });
      return;
    }
    
    await pool.query("UPDATE processed_jobs SET status = 'REJECTED' WHERE id = ANY($1)", [ids]);
    res.json({ ok: true, updated: ids.length });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/push', async (_req: Request, res: Response): Promise<void> => {
  try {
    const q = 'SELECT id, discovered_job_id as "discoveredId", title, company, company_website as "companyWebsite", company_logo_url as "companyLogoUrl", description, type, locations, structured_locations as "structuredLocations", required_skills as "requiredSkills", allowed_degrees as "allowedDegrees", allowed_courses as "allowedCourses", allowed_specializations as "allowedSpecializations", allowed_passout_years as "allowedPassoutYears", work_mode as "workMode", experience_min as "experienceMin", experience_max as "experienceMax", salary_range as "salaryRange", salary_period as "salaryPeriod", employment_type as "employmentType", job_function as "jobFunction", apply_link as "applyLink", source_url as "sourceUrl", incentives, selection_process as "selectionProcess", notes_highlights as "notesHighlights", application_details as "applicationDetails", walk_in_details as "walkInDetails", status, created_at as "createdAt", updated_at as "updatedAt" FROM processed_jobs WHERE status = \'PUBLISHED\' ORDER BY created_at DESC LIMIT 500';
    const result = await pool.query(q);
    res.json({ jobs: result.rows });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});


router.get('/jobs', async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, limit = 50 } = req.query;
    let q =
      'SELECT id, company, title, location, apply_link, status, source_type as ats_type, fresher_score, created_at FROM discovered_jobs';
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
    
    await pool.query(`DELETE FROM ${table} WHERE id = ANY($1::uuid[])`, [ids]);
    
    res.json({ ok: true, deleted: ids.length });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.get('/jobs/sweep-feed', async (_req: Request, res: Response): Promise<void> => {
  try {
    // Fetch non-terminal discovered jobs
    const discoveredResult = await pool.query(`
      SELECT id, title, company, apply_link as "applyLink", source_url as "sourceLink", created_at as "publishedAt", 'discovered' as type 
      FROM discovered_jobs 
      WHERE status NOT IN ('EXPIRED', 'REJECTED', 'FAILED') OR status IS NULL
    `);
    
    // Fetch non-terminal processed jobs
    const processedResult = await pool.query(`
      SELECT id, title, company, apply_link as "applyLink", source_url as "sourceLink", created_at as "publishedAt", 'processed' as type 
      FROM processed_jobs 
      WHERE status NOT IN ('EXPIRED', 'REJECTED') OR status IS NULL
    `);
    
    res.json({
      opportunities: [...discoveredResult.rows, ...processedResult.rows]
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/jobs/expire', async (req: Request, res: Response): Promise<void> => {
  try {
    const { discoveredIds = [], processedIds = [] } = req.body;
    
    let expiredCount = 0;
    
    if (discoveredIds.length > 0) {
      const res1 = await pool.query(
        "UPDATE discovered_jobs SET status = 'EXPIRED' WHERE id = ANY($1::uuid[])", 
        [discoveredIds]
      );
      expiredCount += res1.rowCount ?? 0;
    }
    
    if (processedIds.length > 0) {
      const res2 = await pool.query(
        "UPDATE processed_jobs SET status = 'EXPIRED' WHERE id = ANY($1::uuid[])", 
        [processedIds]
      );
      expiredCount += res2.rowCount ?? 0;
    }
    
    res.json({ ok: true, expired: expiredCount });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/jobs/process-sync', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'Missing or invalid ids' });
      return;
    }

    let successCount = 0;

    const { rows: jobs } = await pool.query(
      `SELECT id, apply_link, source, source_type, company, title, description, location, status 
       FROM discovered_jobs 
       WHERE id = ANY($1::uuid[])`,
      [ids]
    );

    for (const job of jobs) {
      try {
        const applyLink = job.apply_link;
        if (!applyLink) continue;

        let urlObj: URL;
        try {
          urlObj = new URL(applyLink);
        } catch {
          continue;
        }

        const host = urlObj.hostname.toLowerCase();
        let providerKey = '';
        if (job.source) {
            providerKey = job.source.toLowerCase().replace(/^ats_/, '');
        }

        if (!providerKey) {
            if (host === 'lever.co' || host.endsWith('.lever.co')) providerKey = 'lever';
            else if (host === 'greenhouse.io' || host.endsWith('.greenhouse.io')) providerKey = 'greenhouse';
            else if (host === 'ashbyhq.com' || host.endsWith('.ashbyhq.com')) providerKey = 'ashby';
            else if (host === 'smartrecruiters.com' || host.endsWith('.smartrecruiters.com')) providerKey = 'smartrecruiters';
            else if (host === 'myworkdayjobs.com' || host.endsWith('.myworkdayjobs.com')) providerKey = 'workday';
            else if (host === 'oraclecloud.com' || host.endsWith('.oraclecloud.com')) providerKey = 'oracle';
            else if (host === 'icims.com' || host.endsWith('.icims.com')) providerKey = 'icims';
            else if (host.match(/successfactors\.[a-z]+$/) || host === 'sapsf.com' || host.endsWith('.sapsf.com')) providerKey = 'successfactors';
            else if (host === 'darwinbox.in' || host.endsWith('.darwinbox.in')) providerKey = 'darwinbox';
        }

        let parsedJob: any = null;
        let rawDescription = job.description || '';

        if (providerKey && (PLUGIN_REGISTRY as any)[providerKey]) {
            const plugin = (PLUGIN_REGISTRY as any)[providerKey];
            if (typeof plugin.fetchJobDetails === 'function') {
                const dummyJob = {
                    applyLink,
                    title: job.title || '',
                    company: job.company || '',
                    source: job.source || '',
                    descriptionSource: 'API' as const,
                    sourceType: 'ATS' as const
                };

                const result = await plugin.fetchJobDetails(dummyJob);
                if (result) {
                    if (typeof result === 'string') {
                        rawDescription = stripHtml(result);
                        parsedJob = parseJobTextLite(rawDescription);
                    } else {
                        const textToParse = result.text || (result.html ? stripHtml(result.html) : '');
                        rawDescription = textToParse;
                        parsedJob = parseJobTextLite(textToParse);
                        if (result.title) parsedJob.title = result.title;
                        if (result.company) parsedJob.company = result.company;
                        if (result.locations?.length) parsedJob.locations = result.locations;
                    }
                }
            }
        }
        
        if (!parsedJob && job.description) {
           parsedJob = parseJobTextLite(job.description);
        }

        if (parsedJob) {
             const finalTitle = parsedJob.title || job.title || 'Untitled';
             const finalCompanyRaw = parsedJob.company || job.company || 'Unknown Company';
             const finalCompany = finalCompanyRaw.split('\n')[0].trim();

             const payload = {
                type: parsedJob.type || 'JOB',
                title: finalTitle,
                company: finalCompany,
                company_id: null,
                company_website: null,
                company_logo_url: null,
                description: rawDescription || null,
                allowed_degrees: parsedJob.allowedDegrees || [],
                allowed_courses: parsedJob.allowedCourses || [],
                allowed_specializations: parsedJob.allowedSpecializations || [],
                allowed_passout_years: (parsedJob.allowedPassoutYears || []).map(String),
                required_skills: parsedJob.skills || parsedJob.requiredSkills || [],
                locations: parsedJob.locations?.length ? parsedJob.locations : (job.location ? [job.location] : []),
                structured_locations: parsedJob.structuredLocations ? JSON.stringify(parsedJob.structuredLocations) : null,
                work_mode: parsedJob.workMode || null,
                experience_min: parsedJob.experienceMin !== undefined ? parsedJob.experienceMin : null,
                experience_max: parsedJob.experienceMax !== undefined ? parsedJob.experienceMax : null,
                salary_range: parsedJob.salaryRange || null,
                salary_amount: parsedJob.salaryAmount || null,
                salary_period: parsedJob.salaryPeriod || null,
                employment_type: parsedJob.employmentType || null,
                job_function: parsedJob.jobFunction || null,
                incentives: parsedJob.incentives || null,
                selection_process: parsedJob.selectionProcess || null,
                notes_highlights: parsedJob.notesHighlights || null,
                apply_link: applyLink,
                source_url: job.source_url || applyLink,
                custom_slug: parsedJob.customSlug || null,
                application_details: parsedJob.applicationDetails ? JSON.stringify(parsedJob.applicationDetails) : null,
                walk_in_details: parsedJob.walkInDetails ? JSON.stringify(parsedJob.walkInDetails) : null,
                status: 'PENDING_REVIEW'
            };

            const existingRes = await pool.query(
                `SELECT id FROM processed_jobs WHERE apply_link = $1 LIMIT 1`,
                [applyLink]
            );

            if (existingRes.rows.length > 0) {
                 await pool.query(
                    `UPDATE processed_jobs SET
                        type = $1, title = $2, company = $3, company_id = $4, company_website = $5,
                        company_logo_url = $6, description = $7, allowed_degrees = $8, allowed_courses = $9,
                        allowed_specializations = $10, allowed_passout_years = $11, required_skills = $12,
                        locations = $13, structured_locations = $14, work_mode = $15,
                        experience_min = $16, experience_max = $17, salary_range = $18,
                        salary_amount = $19, salary_period = $20, employment_type = $21,
                        job_function = $22, incentives = $23, selection_process = $24,
                        notes_highlights = $25, source_url = $26, custom_slug = $27,
                        application_details = $28, walk_in_details = $29, status = $30, updated_at = NOW()
                    WHERE apply_link = $31`,
                    [
                        payload.type, payload.title, payload.company, payload.company_id, payload.company_website,
                        payload.company_logo_url, payload.description, payload.allowed_degrees, payload.allowed_courses,
                        payload.allowed_specializations, payload.allowed_passout_years, payload.required_skills,
                        payload.locations, payload.structured_locations, payload.work_mode,
                        payload.experience_min, payload.experience_max, payload.salary_range,
                        payload.salary_amount, payload.salary_period, payload.employment_type,
                        payload.job_function, payload.incentives, payload.selection_process,
                        payload.notes_highlights, payload.source_url, payload.custom_slug,
                        payload.application_details, payload.walk_in_details, payload.status,
                        applyLink
                    ]
                );
            } else {
                 await pool.query(
                    `INSERT INTO processed_jobs (
                        discovered_job_id, type, title, company, company_id, company_website, company_logo_url, description,
                        allowed_degrees, allowed_courses, allowed_specializations, allowed_passout_years,
                        required_skills, locations, structured_locations, work_mode,
                        experience_min, experience_max, salary_range, salary_amount,
                        salary_period, employment_type, job_function, incentives,
                        selection_process, notes_highlights, apply_link, source_url,
                        custom_slug, application_details, walk_in_details, status,
                        created_at, updated_at
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
                        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
                        $31, $32, NOW(), NOW()
                    )`,
                    [
                        job.id, payload.type, payload.title, payload.company, payload.company_id, payload.company_website, payload.company_logo_url, payload.description,
                        payload.allowed_degrees, payload.allowed_courses, payload.allowed_specializations, payload.allowed_passout_years,
                        payload.required_skills, payload.locations, payload.structured_locations, payload.work_mode,
                        payload.experience_min, payload.experience_max, payload.salary_range, payload.salary_amount,
                        payload.salary_period, payload.employment_type, payload.job_function, payload.incentives,
                        payload.selection_process, payload.notes_highlights, payload.apply_link, payload.source_url,
                        payload.custom_slug, payload.application_details, payload.walk_in_details, payload.status
                    ]
                );
            }

            await pool.query(
                `UPDATE discovered_jobs SET status = 'PROCESSED', updated_at = NOW() WHERE id = $1`,
                [job.id]
            );

            successCount++;
        }
      } catch (e: any) {
         console.error('Error processing job sync:', e);
         res.status(500).json({ error: e.message, detail: e.detail, hint: e.hint });
         return;
      }
    }

    res.json({ ok: true, processed: successCount });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
