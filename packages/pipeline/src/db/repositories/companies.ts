import { pool } from '../pool.js';
import { parseJobUrl } from '@fresherflow/parser';
import { DiscoveredJobEntry, RunStats } from '../../core/state.js';

function toAtsProviderEnum(source: string): string {
    const s = (source || '').toUpperCase().trim();
    if (s.includes('GREENHOUSE')) return 'GREENHOUSE';
    if (s.includes('LEVER')) return 'LEVER';
    if (s.includes('WORKDAY')) return 'WORKDAY';
    if (s.includes('ASHBY')) return 'ASHBY';
    if (s.includes('SMARTRECRUITERS')) return 'SMARTRECRUITERS';
    if (s.includes('ORACLE')) return 'ORACLE';
    if (s.includes('ICIMS')) return 'ICIMS';
    if (s.includes('SUCCESSFACTORS')) return 'SUCCESSFACTORS';
    if (s.includes('RECRUITEE')) return 'RECRUITEE';
    if (s.includes('WORKABLE')) return 'WORKABLE';
    if (s.includes('DARWINBOX')) return 'DARWINBOX';
    if (s.includes('KEKA')) return 'KEKA';
    if (s.includes('FRESHTEAM')) return 'FRESHTEAM';
    if (s.includes('ZOHORECRUIT')) return 'ZOHORECRUIT';
    if (s.includes('GREYTHR')) return 'GREYTHR';
    if (s.includes('PEOPLESTRONG')) return 'PEOPLESTRONG';
    if (s.includes('HRONE')) return 'HRONE';
    if (s.includes('TURBOHIRE')) return 'TURBOHIRE';
    if (s.includes('OORWIN')) return 'OORWIN';
    if (s.includes('ZIMYO')) return 'ZIMYO';
    if (s.includes('ZWAYAM')) return 'ZWAYAM';
    if (s.includes('ISMARTRECRUIT')) return 'ISMARTRECRUIT';
    if (s.includes('HREASILY')) return 'HREASILY';
    if (s.includes('BAMBOOHR')) return 'BAMBOOHR';
    if (s.includes('BREEZYHR')) return 'BREEZYHR';

    return 'CUSTOM';
}

function slugify(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'company';
}

function capitalize(text: string): string {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
}

// In-memory cache for speed during pipeline execution
const boardTokenToCompanyIdMap = new Map<string, string>();
const slugToCompanyIdMap = new Map<string, string>();
const nameToCompanyIdMap = new Map<string, string>();

/**
 * Resolves or creates a company entry in Supabase for each discovered job,
 * upserts ATS mapping to company_ats, attaches company_id to the job entry,
 * and updates run statistics.
 */
export async function resolveAndAttachCompanies(
    jobs: DiscoveredJobEntry[],
    stats: RunStats
): Promise<DiscoveredJobEntry[]> {
    const hasDb = Boolean(
        process.env.DATABASE_URL ||
        process.env.INGESTION_DATABASE_URL
    );

    if (!hasDb || jobs.length === 0) {
        return jobs;
    }

    console.log(`\n--- Resolving company registry for ${jobs.length} jobs ---`);

    for (const job of jobs) {
        try {
            const parsed = parseJobUrl(job.applyLink);
            const providerStr = parsed ? parsed.adapter : (job.source || job.sourceType || 'CUSTOM');
            const boardId = parsed ? parsed.company : null;
            const providerEnum = toAtsProviderEnum(providerStr);

            // Determine candidate company name
            let rawName = (job.company || '').trim();
            if (!rawName || /^company$/i.test(rawName) || /^unknown$/i.test(rawName)) {
                if (boardId) {
                    rawName = capitalize(boardId);
                } else {
                    try {
                        const host = new URL(job.applyLink).hostname.replace(/^www\./i, '');
                        rawName = capitalize(host.split('.')[0]);
                    } catch {
                        rawName = 'Unknown Company';
                    }
                }
            }

            const slug = slugify(rawName);
            const cacheKeyBoard = boardId ? `${providerEnum}:${boardId}` : null;
            const cacheKeyName = rawName.toLowerCase();

            let companyId: string | null = null;
            let isNew = false;

            // 1. Check in-memory cache first
            if (cacheKeyBoard && boardTokenToCompanyIdMap.has(cacheKeyBoard)) {
                companyId = boardTokenToCompanyIdMap.get(cacheKeyBoard)!;
            } else if (slugToCompanyIdMap.has(slug)) {
                companyId = slugToCompanyIdMap.get(slug)!;
            } else if (nameToCompanyIdMap.has(cacheKeyName)) {
                companyId = nameToCompanyIdMap.get(cacheKeyName)!;
            }

            // 2. Lookup in Supabase company_ats by board_token if available
            if (!companyId && boardId) {
                const { rows: atsData } = await pool.query(
                    'SELECT company_id FROM public.company_ats WHERE provider = $1 AND board_token = $2 LIMIT 1',
                    [providerEnum, boardId]
                );

                if (atsData.length > 0) {
                    companyId = atsData[0].company_id;
                }
            }

            // 3. Lookup in Supabase companies table by slug or name if not found in company_ats
            if (!companyId) {
                const { rows: companyData } = await pool.query(
                    'SELECT id FROM public.companies WHERE slug = $1 OR name ILIKE $2 LIMIT 1',
                    [slug, rawName]
                );

                if (companyData.length > 0) {
                    companyId = companyData[0].id;
                }
            }

            // 4. Create new company row in companies table if still not found
            if (!companyId) {
                try {
                    const { rows: newCompany } = await pool.query(
                        `INSERT INTO public.companies (name, slug, verification_status, active) 
                         VALUES ($1, $2, 'UNVERIFIED', true) RETURNING id`,
                        [rawName, slug]
                    );

                    if (newCompany.length > 0) {
                        companyId = newCompany[0].id;
                        isNew = true;
                    }
                } catch (createError) {
                    // Fallback: If insert failed due to duplicate slug, re-fetch
                    const { rows: fallbackCompany } = await pool.query(
                        'SELECT id FROM public.companies WHERE slug = $1 LIMIT 1',
                        [slug]
                    );

                    if (fallbackCompany.length > 0) {
                        companyId = fallbackCompany[0].id;
                    }
                }
            }

            // 5. If company resolved/created, update company_ats and caches
            if (companyId) {
                // Populate caches
                if (cacheKeyBoard) boardTokenToCompanyIdMap.set(cacheKeyBoard, companyId);
                slugToCompanyIdMap.set(slug, companyId);
                nameToCompanyIdMap.set(cacheKeyName, companyId);

                // Upsert company_ats row
                try {
                    await pool.query(
                        `INSERT INTO public.company_ats (company_id, provider, board_token, career_url, enabled, last_sync, health, failure_count)
                         VALUES ($1, $2, $3, $4, true, NOW(), 'HEALTHY', 0)
                         ON CONFLICT (company_id, provider) DO UPDATE SET
                         board_token = EXCLUDED.board_token,
                         career_url = EXCLUDED.career_url,
                         last_sync = EXCLUDED.last_sync,
                         health = 'HEALTHY'`,
                         [companyId, providerEnum, boardId || null, job.applyLink]
                    );
                } catch {
                    // Ignore ATS mapping upsert non-critical errors
                }

                // Upsert company_statistics row
                try {
                    await pool.query(
                        `INSERT INTO public.company_statistics (company_id, total_jobs, avg_jobs_per_month, last_hiring_date, freshers_score, updated_at)
                         VALUES ($1, 1, 1.0, NOW(), $2, NOW())
                         ON CONFLICT (company_id) DO UPDATE SET
                         total_jobs = public.company_statistics.total_jobs + 1,
                         last_hiring_date = NOW(),
                         freshers_score = COALESCE(EXCLUDED.freshers_score, public.company_statistics.freshers_score),
                         updated_at = NOW()`,
                         [companyId, (job as any).fresherScore || (job as any).fresher_score || 80]
                    );
                } catch {
                    // Ignore statistics upsert non-critical errors
                }

                // Attach company_id to job
                job.companyId = companyId;
                (job as any).company_id = companyId;

                // Bookkeeping stats
                stats.company_resolved++;
                if (isNew) {
                    stats.company_new++;
                } else {
                    stats.company_matched++;
                }
                stats.company_ats_yield[providerEnum] = (stats.company_ats_yield[providerEnum] || 0) + 1;
            } else {
                stats.company_unresolved++;
            }
        } catch (err) {
            stats.company_unresolved++;
            console.warn(`[Company Registry] Failed to resolve company for ${job.applyLink}:`, (err as Error).message);
        }
    }

    console.log(`[Company Registry] Resolved ${stats.company_resolved} jobs (${stats.company_new} new companies, ${stats.company_matched} matched existing, ${stats.company_unresolved} unresolved).`);

    return jobs;
}
