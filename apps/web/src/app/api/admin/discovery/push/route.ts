import { NextResponse, NextRequest } from 'next/server';
import { withRateLimit } from '@/lib/api/rateLimit';
import { serverApiClient } from '@/lib/api/server-client';
import {
  hasIngestionDb,
  queryRows,
  execute,
  ingestionDbError,
  PROCESSED_JOB_COLUMNS
} from '@/lib/server/ingestion/db';

export const dynamic = 'force-dynamic';

// Rows come from the legacy ingestion database (`processed_jobs`), NOT the
// main Prisma database. `type` / `walkInDetails` below mirror the pipeline's
// legacy columns (see `packages/pipeline` normalizer); they are mapped onto
// the new Opportunity taxonomy in `toBackendPayload` before leaving this app.
// Writes go through the backend API (`serverApiClient`) — this app must never
// import Prisma (see `apps/web/AGENTS.md` boundaries).
interface ProcessedJob {
  id?: string;
  discoveredId?: string;
  title: string;
  company: string;
  companyWebsite?: string;
  companyLogoUrl?: string;
  description?: string;
  type?: string;
  locations?: string[];
  structuredLocations?: unknown;
  requiredSkills?: string[];
  allowedDegrees?: string[];
  allowedCourses?: string[];
  allowedSpecializations?: string[];
  allowedPassoutYears?: number[];
  workMode?: string;
  experienceMin?: number;
  experienceMax?: number;
  salaryRange?: string;
  salaryPeriod?: string;
  employmentType?: string;
  jobFunction?: string;
  applyLink: string;
  sourceUrl?: string;
  sourceLink?: string;
  status?: string;
  incentives?: string;
  selectionProcess?: string;
  notesHighlights?: string;
  applicationDetails?: unknown;
  walkInDetails?: unknown;
}

type LegacyJobType = 'JOB' | 'INTERNSHIP' | 'WALKIN' | 'GOVERNMENT';

const VALID_TYPES = new Set<string>(['JOB', 'INTERNSHIP', 'WALKIN', 'GOVERNMENT']);
const VALID_DEGREES = new Set(['TENTH', 'INTER', 'DIPLOMA', 'DEGREE', 'PG']);
const VALID_WORK_MODES = new Set(['ONSITE', 'HYBRID', 'REMOTE']);

const DEGREE_MAP: Record<string, string> = {
  'B.TECH': 'DEGREE', 'BE': 'DEGREE', 'BTECH': 'DEGREE', 'B.E': 'DEGREE',
  'UG': 'DEGREE', 'GRADUATE': 'DEGREE', 'ANY DEGREE': 'DEGREE', 'BACHELOR': 'DEGREE',
  'B.SC': 'DEGREE', 'BSC': 'DEGREE', 'BCA': 'DEGREE', 'BBA': 'DEGREE',
  'B.COM': 'DEGREE', 'BCOM': 'DEGREE', 'BA': 'DEGREE', 'B.A': 'DEGREE',
  'MBA': 'PG', 'M.TECH': 'PG', 'MTECH': 'PG', 'M.E': 'PG', 'ME': 'PG',
  'MASTERS': 'PG', 'M.SC': 'PG', 'MSC': 'PG', 'MCA': 'PG', 'M.COM': 'PG',
  'POST GRADUATE': 'PG', 'POSTGRADUATE': 'PG',
  'POLYTECHNIC': 'DIPLOMA',
  '12TH': 'INTER', 'HSC': 'INTER', 'PUC': 'INTER', 'PLUS TWO': 'INTER',
  '10TH': 'TENTH', 'SSC': 'TENTH', 'MATRICULATION': 'TENTH',
};

/** Keep only http(s) URLs; the backend admin schema rejects anything else. */
function cleanUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Map a legacy ingestion row onto the backend admin opportunity contract.
 *
 * New-taxonomy mapping (old single `type` split into dimensions):
 * - JOB        → category 'job' (EMPLOYMENT)
 * - INTERNSHIP → category 'job' + employmentTypes INTERNSHIP
 * - WALKIN     → category 'walk-in' (recruitmentMethod WALK_IN via the
 *                backend's resolveOpportunityDimensions) + driveDetails
 *                (renamed from walkInDetails)
 * - GOVERNMENT → category 'job'. The backend admin create API has no sector
 *                input, so sector=GOVERNMENT cannot be set from here — flagged
 *                for the API owner. Previously stored as type=GOVERNMENT.
 */
function toBackendPayload(job: ProcessedJob) {
  const legacyType: LegacyJobType =
    job.type && VALID_TYPES.has(job.type.toUpperCase())
      ? (job.type.toUpperCase() as LegacyJobType)
      : 'JOB';

  const degrees = (job.allowedDegrees || [])
    .map((d) => {
      const upper = String(d).toUpperCase().trim();
      return DEGREE_MAP[upper] || (VALID_DEGREES.has(upper) ? upper : null);
    })
    .filter((d): d is string => d !== null);

  const workMode =
    job.workMode && VALID_WORK_MODES.has(job.workMode.toUpperCase())
      ? job.workMode.toUpperCase()
      : null;

  const salaryPeriod =
    job.salaryPeriod && job.salaryPeriod.toUpperCase() === 'MONTHLY'
      ? 'MONTHLY'
      : 'YEARLY';

  const passoutYears = (job.allowedPassoutYears || [])
    .map((y: unknown) => parseInt(String(y), 10))
    .filter((y: number) => !isNaN(y));

  const expMin =
    typeof job.experienceMin === 'number'
      ? job.experienceMin
      : parseFloat(String(job.experienceMin || 0)) || 0;
  const expMax =
    typeof job.experienceMax === 'number'
      ? job.experienceMax
      : parseFloat(String(job.experienceMax || 0)) || 0;

  // Backend category alias: only 'job' | 'internship' | 'walk-in' are accepted.
  const category =
    legacyType === 'WALKIN' ? 'walk-in' : legacyType === 'INTERNSHIP' ? 'internship' : 'job';

  // Backend employmentTypes is a free string, split on [,/|] server-side.
  const employmentTypeParts = [
    ...(legacyType === 'INTERNSHIP' ? ['INTERNSHIP'] : []),
    ...(job.employmentType && job.employmentType.trim() ? [job.employmentType.trim()] : []),
  ];
  const employmentTypes = employmentTypeParts.length > 0 ? employmentTypeParts.join(',') : undefined;

  // Backend driveDetails replaces the legacy walkInDetails relation and
  // accepts the same venue/reporting-time aliases, so the legacy payload
  // passes through (dropping anything the schema does not recognise).
  const walkIn = (job.walkInDetails ?? {}) as Record<string, unknown>;
  const driveDetails =
    legacyType === 'WALKIN' && walkIn && typeof walkIn === 'object'
      ? {
          dates: Array.isArray(walkIn.dates) ? walkIn.dates : undefined,
          date: typeof walkIn.date === 'string' ? walkIn.date : undefined,
          dateRange: typeof walkIn.dateRange === 'string' ? walkIn.dateRange : undefined,
          timeRange: typeof walkIn.timeRange === 'string' ? walkIn.timeRange : undefined,
          venueAddress: typeof walkIn.venueAddress === 'string' ? walkIn.venueAddress : undefined,
          venue: typeof walkIn.venue === 'string' ? walkIn.venue : undefined,
          venueLink: typeof walkIn.venueLink === 'string' ? walkIn.venueLink : undefined,
          reportingTime: typeof walkIn.reportingTime === 'string' ? walkIn.reportingTime : undefined,
          requiredDocuments: Array.isArray(walkIn.requiredDocuments) ? walkIn.requiredDocuments : undefined,
          contactPerson: typeof walkIn.contactPerson === 'string' ? walkIn.contactPerson : undefined,
          contactPhone: typeof walkIn.contactPhone === 'string' ? walkIn.contactPhone : undefined,
        }
      : undefined;

  // Backend requires description >= 10 chars when present; null stays null.
  // Legacy rows often have '' — closest passing equivalent to the old write.
  const description =
    job.description && job.description.trim().length >= 10 ? job.description : null;

  const applyLink = cleanUrl(job.applyLink);
  const sourceLink =
    cleanUrl(job.sourceUrl) || cleanUrl(job.sourceLink) || applyLink;

  return {
    legacyType,
    applyLink,
    payload: {
      title: job.title,
      company: job.company,
      companyWebsite: cleanUrl(job.companyWebsite),
      companyLogoUrl: cleanUrl(job.companyLogoUrl),
      description,
      category,
      allowedDegrees: degrees,
      allowedCourses: job.allowedCourses || [],
      allowedSpecializations: job.allowedSpecializations || [],
      allowedPassoutYears: passoutYears,
      requiredSkills: job.requiredSkills || [],
      locations: job.locations || [],
      experienceMin: expMin,
      experienceMax: expMax,
      workMode,
      salaryRange: job.salaryRange || null,
      salaryPeriod,
      ...(employmentTypes ? { employmentTypes } : {}),
      jobFunction: job.jobFunction || null,
      applyLink,
      sourceLink,
      incentives: job.incentives || null,
      selectionProcess: job.selectionProcess || null,
      notesHighlights: job.notesHighlights || null,
      applicationDetails: (job.applicationDetails as Record<string, unknown> | null) ?? null,
      ...(driveDetails ? { driveDetails } : {}),
      status: 'PUBLISHED',
    },
  };
}

async function resolveDuplicateId(applyLink: string): Promise<string | null> {
  try {
    const result = await serverApiClient<{
      opportunities?: { id: string; applyLink?: string | null; sourceLink?: string | null }[];
    }>(`/api/admin/opportunities?q=${encodeURIComponent(applyLink)}&limit=10`);
    const match = (result.opportunities || []).find(
      (o) => o.applyLink === applyLink || o.sourceLink === applyLink
    );
    return match?.id ?? null;
  } catch {
    return null;
  }
}

async function handlePush(req?: NextRequest) {
  if (!hasIngestionDb) return ingestionDbError();

  try {
    let ids: string[] | undefined;
    if (req && req.method === 'POST') {
      try {
        const body = await req.json();
        if (body && Array.isArray(body.ids) && body.ids.length > 0) {
          ids = body.ids;
        }
      } catch {
        // Ignore JSON parse errors for empty bodies
      }
    }

    let jobs: ProcessedJob[];
    try {
      if (ids) {
        jobs = await queryRows<ProcessedJob>(
          `SELECT ${PROCESSED_JOB_COLUMNS} FROM processed_jobs WHERE id = ANY($1::uuid[])`,
          [ids]
        );
      } else {
        jobs = await queryRows<ProcessedJob>(
          `SELECT ${PROCESSED_JOB_COLUMNS} FROM processed_jobs WHERE status = 'PUBLISHED' ORDER BY created_at DESC LIMIT 500`
        );
      }
    } catch (dbErr) {
      console.error('[Push API Error] Failed to fetch jobs from ingestion database', dbErr);
      return NextResponse.json(
        { error: 'Failed to fetch jobs from ingestion database', status: 502 },
        { status: 502 }
      );
    }

    // Fail fast when the backend API is unreachable or the caller lacks admin
    // rights, instead of recording every job as failed. Auth cookies are
    // forwarded by serverApiClient, so backend permission checks apply.
    try {
      await serverApiClient('/api/admin/opportunities?limit=1');
    } catch (preflightErr) {
      console.error('[Push API Error] Backend API preflight failed', preflightErr);
      return NextResponse.json(
        { error: 'Backend API unreachable or unauthorized', status: 502 },
        { status: 502 }
      );
    }

    let pushed = 0;
    let failed = 0;
    let skipped = 0;
    const seenApplyLinks = new Set<string>();
    const successfulIds: string[] = [];
    const failedIds: string[] = [];

    for (const job of jobs) {
      try {
        if (!job.applyLink || !job.title || !job.company) {
          failed++;
          if (job.id) failedIds.push(job.id);
          continue;
        }

        if (seenApplyLinks.has(job.applyLink)) {
          skipped++;
          continue;
        }
        seenApplyLinks.add(job.applyLink);

        const { applyLink, payload } = toBackendPayload(job);
        if (!applyLink) {
          failed++;
          if (job.id) failedIds.push(job.id);
          continue;
        }

        try {
          await serverApiClient('/api/admin/opportunities', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
        } catch (createErr) {
          const message = createErr instanceof Error ? createErr.message : String(createErr);
          // Backend dedupes on applyLink/sourceLink with 409 — fall back to
          // updating the existing listing, mirroring the old upsert.
          if (/duplicate/i.test(message)) {
            const duplicateId = await resolveDuplicateId(applyLink);
            if (!duplicateId) throw createErr;
            await serverApiClient(`/api/admin/opportunities/${duplicateId}`, {
              method: 'PUT',
              body: JSON.stringify(payload),
            });
          } else {
            throw createErr;
          }
        }

        if (job.id) {
          successfulIds.push(job.id);
        }
        pushed++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[Push API Error] Failed job:', job.id || job.applyLink, msg);
        failed++;
        if (job.id) failedIds.push(job.id);
      }
    }

    if (successfulIds.length > 0) {
      try {
        await execute("UPDATE processed_jobs SET status = 'PUBLISHED' WHERE id = ANY($1::uuid[])", [successfulIds]);
      } catch (err) {
        console.error('[Push API Error] Failed to mark jobs as published in ingestion database', err);
      }
    }

    if (failedIds.length > 0) {
      try {
        await execute("UPDATE processed_jobs SET status = 'REJECTED' WHERE id = ANY($1::uuid[])", [failedIds]);
      } catch (err) {
        console.error('[Push API Error] Failed to mark jobs as rejected in ingestion database', err);
      }
    }

    return NextResponse.json({ pushed, failed, skipped, total: jobs.length, successfulIds, failedIds });
  } catch (error) {
    console.error('[Push API Error]:', error);
    return NextResponse.json(
      {
        error: 'Push process failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(handlePush, { windowMs: 60_000, max: 30, keyPrefix: 'discovery-push' });
export const POST = withRateLimit(handlePush, { windowMs: 60_000, max: 30, keyPrefix: 'discovery-push' });
