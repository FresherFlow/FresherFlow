import { NextResponse } from 'next/server';
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
  status?: string;
}

async function handlePush() {
  try {
    let res = await fetch(`${INGESTION_URL}/data/jobs/processed?status=PUBLISHED&limit=500`, {
      headers: { 'Cache-Control': 'no-store' },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      res = await fetch(`${INGESTION_URL}/data/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
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

    const VALID_TYPES = new Set(['JOB', 'INTERNSHIP', 'WALKIN', 'GOVERNMENT']);
    const VALID_DEGREES = new Set(['TENTH', 'INTER', 'DIPLOMA', 'DEGREE', 'PG']);
    const VALID_WORK_MODES = new Set(['ONSITE', 'HYBRID', 'REMOTE']);

    for (const job of jobs) {
      try {
        if (!job.applyLink || !job.title || !job.company) {
          failed++;
          continue;
        }

        const oppType =
          job.type && VALID_TYPES.has(job.type.toUpperCase())
            ? (job.type.toUpperCase() as 'JOB' | 'INTERNSHIP' | 'WALKIN' | 'GOVERNMENT')
            : 'JOB';

        const degrees = (job.allowedDegrees || [])
          .map((d) => String(d).toUpperCase())
          .filter((d) => VALID_DEGREES.has(d)) as any[];

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
              { sourceLink: job.applyLink },
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
              sourceLink: job.applyLink,
              status: 'PUBLISHED',
            },
          });
        } else {
          const slug = generateSlug(job.title, job.company, job.id);
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
              sourceLink: job.applyLink,
              status: 'PUBLISHED',
              postedByUserId: adminId,
            },
          });
        }

        pushed++;
      } catch (err) {
        console.error('[Push API Error] Failed job:', job.id || job.applyLink, err);
        failed++;
      }
    }

    return NextResponse.json({ pushed, failed, total: jobs.length });
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

export async function GET() {
  return handlePush();
}

export async function POST() {
  return handlePush();
}
