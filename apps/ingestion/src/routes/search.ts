import { Router, Request, Response } from 'express';
import { searchJobs, listScrapers, type SearchInput } from '../lib/search-service.js';
import { redis } from '@fresherflow/database';
import rateLimit from 'express-rate-limit';

const router = Router();
const searchLimiter = rateLimit({ windowMs: 60_000, max: 60, standardHeaders: true, legacyHeaders: false });
router.use(searchLimiter);

/**
 * POST /search
 *
 * Concurrent fan-out search across all registered scrapers.
 * Mirrors ever-jobs POST /api/jobs/search.
 *
 * Body:
 *   searchTerm  — keyword to search for (e.g. "software engineer")
 *   location    — location filter (e.g. "Bangalore")
 *   hoursOld    — only return jobs posted within N hours
 *   companySlug — if provided, searches specific company on ATS scrapers
 *   siteType    — array of site keys to search (e.g. ["greenhouse", "indeed"])
 *   resultsWanted — max results per scraper (default 50)
 *
 * Routing rules:
 *   - siteType provided  → run only those scrapers
 *   - companySlug only   → ATS scrapers (they need a slug)
 *   - neither            → board scrapers (keyword search)
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { searchTerm, location, hoursOld, companySlug, siteType, resultsWanted } = req.body;

  if (!searchTerm && !companySlug) {
    res.status(400).json({ error: 'Either searchTerm or companySlug is required' });
    return;
  }

  // Build cache key from search params
  const cacheKey = `search:${JSON.stringify({ searchTerm, location, hoursOld, companySlug, siteType })}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      res.json(JSON.parse(cached));
      return;
    }
  } catch (err) {
    // Redis unavailable — continue without cache
  }

  const input: SearchInput = {
    searchTerm,
    location,
    hoursOld: hoursOld ? Number(hoursOld) : undefined,
    companySlug,
    siteType,
    resultsWanted: resultsWanted ? Number(resultsWanted) : undefined,
  };

  try {
    const result = await searchJobs(input);

    const responseData = {
      count: result.jobs.length,
      jobs: result.jobs,
      rawCount: result.rawCount,
      siteBreakdown: result.siteBreakdown,
      errors: result.errors.length > 0 ? result.errors : undefined,
      durationMs: result.durationMs,
    };

    // Cache for 1 hour
    try {
      await redis.setex(cacheKey, 3600, JSON.stringify(responseData));
    } catch (err) {
      // Redis unavailable — continue without caching
    }

    res.json(responseData);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

/**
 * POST /search/walkins
 *
 * Dedicated walk-in drive discovery & geocoding endpoint for Map UI.
 * Body:
 *   city          — target city (default: "Hyderabad")
 *   hoursOld      — cutoff in hours (optional)
 *   resultsWanted — max results per query (default 10)
 */
router.post('/walkins', async (req: Request, res: Response): Promise<void> => {
  const { city, hoursOld, resultsWanted } = req.body || {};

  try {
    const { searchWalkinDrives } = await import('../lib/walkin-service.js');
    const result = await searchWalkinDrives({
      city: city || 'Hyderabad',
      hoursOld: hoursOld ? Number(hoursOld) : undefined,
      resultsWanted: resultsWanted ? Number(resultsWanted) : 10,
    });

    res.json(result);
  } catch (error: any) {
    console.error('[Ingestion] Walkin search error:', error);
    res.status(500).json({ error: 'Walk-in search failed', message: error.message });
  }
});

/**
 * GET /search/scrapers
 *
 * List all available scrapers and their categories.
 */
router.get('/scrapers', (_req: Request, res: Response) => {
  res.json(listScrapers());
});

export default router;

