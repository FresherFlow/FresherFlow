import { NextResponse, NextRequest } from 'next/server';
import prisma from '@fresherflow/database';
import { generateSlug } from '@fresherflow/utils';

const INGESTION_URL =
  process.env.INGESTION_SERVICE_URL ||
  process.env.NEXT_PUBLIC_INGESTION_URL ||
  process.env.INGESTION_URL ||
  'http://localhost:3005';

export const dynamic = 'force-dynamic';

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
  structuredLocations?: any;
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
  applicationDetails?: any;
  walkInDetails?: any;
}

async function handlePush(req?: NextRequest) {
  try {
    let ids: string[] | undefined;
    if (req && req.method === 'POST') {
      try {
        const body = await req.json();
        if (body && Array.isArray(body.ids) && body.ids.length > 0) {
          ids = body.ids;
        }
      } catch (e) {
        // Ignore JSON parse errors for empty bodies
      }
    }

    let res;
    if (ids) {
      res = await fetch(`${INGESTION_URL}/data/jobs/processed/push-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
    } else {
      res = await fetch(`${INGESTION_URL}/data/jobs/processed?status=PUBLISHED&limit=500`, {
        headers: { 'Cache-Control': 'no-store' },
        next: { revalidate: 0 },
      });

      if (!res.ok) {
        res = await fetch(`${INGESTION_URL}/data/push`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch jobs from ingestion service', status: res.status },
        { status: 502 }
      );
    }

    const data = await res.json();
    const jobs: ProcessedJob[] = data.jobs || [];

    let adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      select: { id: true },
    });

    if (!adminUser) {
      adminUser = await prisma.user.findFirst({
        select: { id: true },
      });
    }

    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          email: 'admin@fresherflow.com',
          role: 'ADMIN',
          fullName: 'System Admin',
        },
        select: { id: true },
      });
    }

    const adminId = adminUser.id;
    let pushed = 0;
    let failed = 0;
    let skipped = 0;
    const seenApplyLinks = new Set<string>();
    const successfulIds: string[] = [];
    const failedIds: string[] = [];

    const VALID_TYPES = new Set(['JOB', 'INTERNSHIP', 'WALKIN', 'GOVERNMENT']);
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

        const oppType =
          job.type && VALID_TYPES.has(job.type.toUpperCase())
            ? (job.type.toUpperCase() as 'JOB' | 'INTERNSHIP' | 'WALKIN' | 'GOVERNMENT')
            : 'JOB';

        const degrees = (job.allowedDegrees || [])
          .map((d) => {
            const upper = String(d).toUpperCase().trim();
            return DEGREE_MAP[upper] || (VALID_DEGREES.has(upper) ? upper : null);
          })
          .filter((d): d is string => d !== null) as any[];

        const workMode =
          job.workMode && VALID_WORK_MODES.has(job.workMode.toUpperCase())
            ? (job.workMode.toUpperCase() as any)
            : null;

        const salaryPeriod =
          job.salaryPeriod && job.salaryPeriod.toUpperCase() === 'MONTHLY'
            ? ('MONTHLY' as any)
            : ('YEARLY' as any);

        const passoutYears = (job.allowedPassoutYears || [])
          .map((y: any) => parseInt(String(y), 10))
          .filter((y: number) => !isNaN(y));

        const expMin =
          typeof job.experienceMin === 'number'
            ? job.experienceMin
            : parseFloat(String(job.experienceMin || 0)) || 0;
        const expMax =
          typeof job.experienceMax === 'number'
            ? job.experienceMax
            : parseFloat(String(job.experienceMax || 0)) || 0;

        const existing = await prisma.opportunity.findFirst({
          where: {
            OR: [
              { applyLink: job.applyLink },
              ...(job.id ? [{ id: job.id }] : []),
            ],
          },
        });

        if (existing) {
          await prisma.opportunity.update({
            where: { id: existing.id },
            data: {
              title: job.title,
              company: job.company,
              companyWebsite: job.companyWebsite || null,
              companyLogoUrl: job.companyLogoUrl || null,
              description: job.description || '',
              type: oppType,
              allowedDegrees: degrees,
              allowedCourses: job.allowedCourses || [],
              allowedSpecializations: job.allowedSpecializations || [],
              allowedPassoutYears: passoutYears,
              requiredSkills: job.requiredSkills || [],
              locations: job.locations || [],
              structuredLocations: job.structuredLocations ?? undefined,
              experienceMin: expMin,
              experienceMax: expMax,
              workMode,
              salaryRange: job.salaryRange || null,
              salaryPeriod,
              employmentType: job.employmentType || null,
              jobFunction: job.jobFunction || null,
              applyLink: job.applyLink,
              sourceLink: job.sourceUrl || job.sourceLink || job.applyLink,
              incentives: job.incentives || null,
              selectionProcess: job.selectionProcess || null,
              notesHighlights: job.notesHighlights || null,
              applicationDetails: job.applicationDetails ?? undefined,
              walkInDetails: job.walkInDetails ?? undefined,
              status: 'PUBLISHED',
              expiresAt: null,
            },
          });
        } else {
          const baseSlug = generateSlug(job.title, job.company, job.id);
          for (let attempt = 1; attempt <= 5; attempt++) {
            const slug = attempt === 1 ? baseSlug : `${baseSlug}-${attempt}`;
            try {
              await prisma.opportunity.create({
                data: {
                  id: job.id || undefined,
                  slug,
                  title: job.title,
                  company: job.company,
                  companyWebsite: job.companyWebsite || null,
                  companyLogoUrl: job.companyLogoUrl || null,
                  description: job.description || '',
                  type: oppType,
                  allowedDegrees: degrees,
                  allowedCourses: job.allowedCourses || [],
                  allowedSpecializations: job.allowedSpecializations || [],
                  allowedPassoutYears: passoutYears,
                  requiredSkills: job.requiredSkills || [],
                  locations: job.locations || [],
                  structuredLocations: job.structuredLocations ?? undefined,
                  experienceMin: expMin,
                  experienceMax: expMax,
                  workMode,
                  salaryRange: job.salaryRange || null,
                  salaryPeriod,
                  employmentType: job.employmentType || null,
                  jobFunction: job.jobFunction || null,
                  applyLink: job.applyLink,
                  sourceLink: job.sourceUrl || job.sourceLink || job.applyLink,
                  incentives: job.incentives || null,
                  selectionProcess: job.selectionProcess || null,
                  notesHighlights: job.notesHighlights || null,
                  applicationDetails: job.applicationDetails ?? undefined,
                  walkInDetails: job.walkInDetails ?? undefined,
                  status: 'PUBLISHED',
                  expiresAt: null,
                  postedByUserId: adminId,
                },
              });
              break;
            } catch (createErr: any) {
              if (createErr?.code === 'P2002' && attempt < 5) {
                continue;
              }
              throw createErr;
            }
          }
        }

        if (job.id) {
          successfulIds.push(job.id);
        }
        pushed++;
      } catch (err: any) {
        const msg = err?.message || String(err);
        const code = err?.code || '';
        console.error('[Push API Error] Failed job:', job.id || job.applyLink, `code=${code}`, msg);
        failed++;
        if (job.id) failedIds.push(job.id);
      }
    }

    if (successfulIds.length > 0) {
      try {
        await fetch(`${INGESTION_URL}/data/jobs/processed/mark-published`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: successfulIds }),
        });
      } catch (err) {
        console.error('[Push API Error] Failed to mark jobs as published in Ingestion DB', err);
      }
    }

    if (failedIds.length > 0) {
      try {
        await fetch(`${INGESTION_URL}/data/jobs/processed/mark-rejected`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: failedIds }),
        });
      } catch (err) {
        console.error('[Push API Error] Failed to mark jobs as rejected in Ingestion DB', err);
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

export async function GET(req: NextRequest) {
  return handlePush(req);
}

export async function POST(req: NextRequest) {
  return handlePush(req);
}
