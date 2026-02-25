import prisma from '../lib/prisma';
import { IngestionRunStatus, IngestionSourceType, OpportunityStatus, OpportunityType, RawOpportunityStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { normalizeSkillList } from '@fresherflow/constants';
import logger from '../utils/logger';
import { generateSlug } from '../utils/slugify';

type Candidate = {
    sourceExternalId?: string;
    type: OpportunityType;
    title: string;
    company: string;
    description?: string;
    applyLink?: string;
    locations: string[];
    workMode?: 'ONSITE' | 'HYBRID' | 'REMOTE';
    experienceMin?: number;
    experienceMax?: number;
    allowedPassoutYears?: number[];
    requiredSkills?: string[];
    raw: unknown;
};

type SourceConfig = {
    sourceType: IngestionSourceType;
    endpoint: string;
    defaultType: OpportunityType;
    name: string;
};


const FRESHER_SCORE_MIN = Number(process.env.INGESTION_FRESHER_SCORE_MIN || 35);
const FRESHER_SCORE_HIGH_CONFIDENCE = Number(process.env.INGESTION_HIGH_CONFIDENCE_SCORE || 55);

function toOpportunityType(input: unknown, fallback: OpportunityType = OpportunityType.JOB): OpportunityType {
    const raw = String(input || '').trim().toUpperCase();
    if (raw === 'INTERNSHIP') return OpportunityType.INTERNSHIP;
    if (raw === 'WALKIN' || raw === 'WALK-IN' || raw === 'WALK_IN') return OpportunityType.WALKIN;
    if (raw === 'JOB') return OpportunityType.JOB;
    return fallback;
}

function toStringArray(input: unknown): string[] {
    if (!input) return [];
    if (Array.isArray(input)) return input.map((value) => String(value).trim()).filter(Boolean);
    return String(input)
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
}

function toNumber(input: unknown): number | undefined {
    if (typeof input === 'number' && Number.isFinite(input)) return input;
    if (typeof input === 'string' && input.trim().length > 0) {
        const parsed = Number(input.trim());
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
}

function stripHtml(input: string): string {
    return input
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/\s+/g, ' ')
        .trim();
}

function extractWorkMode(content: string): Candidate['workMode'] {
    const text = content.toLowerCase();
    if (text.includes('remote')) return 'REMOTE';
    if (text.includes('hybrid')) return 'HYBRID';
    if (text.includes('onsite') || text.includes('on-site') || text.includes('on site')) return 'ONSITE';
    return undefined;
}

function computeFresherScore(candidate: Candidate): { score: number; flags: string[] } {
    const title = candidate.title.toLowerCase();
    const description = (candidate.description || '').toLowerCase();
    const content = `${title} ${description}`;

    let score = 0;
    const flags: string[] = [];

    const positiveKeywords = ['fresher', 'entry level', 'graduate', 'trainee', 'intern', 'campus', 'off-campus', 'off campus'];
    const negativeKeywords = ['senior', 'lead', 'manager', 'architect', 'principal'];

    if ((candidate.experienceMax ?? 99) <= 1) {
        score += 35;
        flags.push('exp_max_le_1');
    }

    if ((candidate.experienceMin ?? 0) >= 2) {
        score -= 35;
        flags.push('exp_min_ge_2');
    }

    if (positiveKeywords.some((keyword) => content.includes(keyword))) {
        score += 20;
        flags.push('fresher_keyword');
    }

    if (candidate.allowedPassoutYears && candidate.allowedPassoutYears.length > 0) {
        score += 15;
        flags.push('passout_year_present');
    }

    if (negativeKeywords.some((keyword) => content.includes(keyword))) {
        score -= 40;
        flags.push('senior_keyword');
    }

    if (candidate.type === OpportunityType.INTERNSHIP) {
        score += 10;
        flags.push('internship_type');
    }

    return { score, flags };
}

function parseExperienceRange(input: unknown): { min?: number; max?: number } {
    const text = String(input || '').toLowerCase();
    if (!text) return {};
    if (text.includes('fresher') || text.includes('entry level')) return { min: 0, max: 0 };
    const numbers = text.match(/\d+(\.\d+)?/g)?.map((value) => Number(value)) || [];
    if (numbers.length === 0) return {};
    if (numbers.length === 1) return { min: numbers[0], max: numbers[0] };
    return { min: numbers[0], max: numbers[1] };
}

function normalizeGfgJobItem(item: Record<string, unknown>, fallbackType: OpportunityType): Candidate | null {
    const designation = item.designation as Record<string, unknown> | undefined;
    const organization = item.organization as Record<string, unknown> | undefined;

    const title = String(designation?.text || item.role || item.title || '').trim();
    const company = String(organization?.name || item.company || '').trim();
    if (!title || !company) return null;

    const baseDescription = stripHtml(String(organization?.about || item.description || '')).trim();
    const summaryParts = [
        String(item.salary || '').trim() ? `Salary: ${String(item.salary).trim()}` : '',
        String(item.employment_type || '').trim() ? `Employment: ${String(item.employment_type).trim()}` : '',
        String(item.last_apply_date_display || '').trim() ? `Apply by: ${String(item.last_apply_date_display).trim()}` : '',
    ].filter(Boolean);
    const description = [baseDescription, ...summaryParts].filter(Boolean).join('\n').trim() || undefined;
    const experience = parseExperienceRange(item.experience);
    const experienceLevel = String(item.experience_level || '').toLowerCase();
    if (experience.min === undefined && experience.max === undefined && experienceLevel === 'fresher') {
        experience.min = 0;
        experience.max = 0;
    }
    const locationType = String(item.location_type || '').toUpperCase();
    const sourceListingLink = String(item.slug || '').trim()
        ? `https://www.geeksforgeeks.org/jobs/${String(item.slug).trim()}/`
        : undefined;
    const externalApplyLink = String(item.apply_link || '').trim() || undefined;
    const applyLink = externalApplyLink || sourceListingLink;

    return {
        sourceExternalId: String(item.job_id || '').trim() || undefined,
        type: toOpportunityType(item.job_category, fallbackType),
        title,
        company,
        description,
        applyLink,
        locations: toStringArray(item.location),
        workMode: locationType === 'REMOTE' || locationType === 'HYBRID' || locationType === 'ONSITE'
            ? (locationType as Candidate['workMode'])
            : undefined,
        experienceMin: experience.min,
        experienceMax: experience.max,
        allowedPassoutYears: [],
        requiredSkills: [],
        raw: item,
    };
}

function normalizeJsonFeedItem(item: Record<string, unknown>, fallbackType: OpportunityType): Candidate | null {
    if (item.job_id && item.organization && item.designation) {
        return normalizeGfgJobItem(item, fallbackType);
    }

    const title = String(item.title || '').trim();
    const company = String(item.company || '').trim();
    if (!title || !company) return null;

    const applyLink = String(item.applyLink || item.apply_url || item.url || '').trim() || undefined;
    const type = toOpportunityType(item.type || item.category, fallbackType);

    return {
        sourceExternalId: String(item.id || item.externalId || '').trim() || undefined,
        type,
        title,
        company,
        description: String(item.description || '').trim() || undefined,
        applyLink,
        locations: toStringArray(item.locations || item.location),
        workMode: (() => {
            const mode = String(item.workMode || item.work_mode || '').toUpperCase();
            if (mode === 'REMOTE' || mode === 'HYBRID' || mode === 'ONSITE') return mode as 'REMOTE' | 'HYBRID' | 'ONSITE';
            return undefined;
        })(),
        experienceMin: toNumber(item.experienceMin ?? item.experience_min),
        experienceMax: toNumber(item.experienceMax ?? item.experience_max),
        allowedPassoutYears: Array.isArray(item.allowedPassoutYears)
            ? item.allowedPassoutYears.map((value) => Number(value)).filter((value) => Number.isFinite(value))
            : [],
        requiredSkills: normalizeSkillList(toStringArray(item.requiredSkills || item.skills)),
        raw: item,
    };
}

function normalizeWorkdayItem(item: Record<string, unknown>, source: SourceConfig): Candidate | null {
    const title = String(item.title || item.jobTitle || item.jobPostingTitle || '').trim();
    if (!title) return null;

    const company =
        String(item.company || item.hiringOrganization || item.companyName || '').trim()
        || source.name;

    const externalPath = String(item.externalPath || item.externalUrl || item.url || '').trim();
    const applyLink = externalPath.startsWith('http')
        ? externalPath
        : externalPath
            ? new URL(externalPath, source.endpoint).toString()
            : undefined;

    const locations = toStringArray(
        item.locationsText
            || item.locations
            || item.primaryLocation
            || item.location
    );

    const descriptionParts = [
        item.description,
        item.jobDescription,
        item.shortDescription,
        item.bulletFields,
        item.additionalLocations
    ].filter(Boolean);
    const description = descriptionParts
        .map((value) => (typeof value === 'string' ? value : JSON.stringify(value)))
        .join('\n')
        .trim() || undefined;

    const contentForSignals = `${title} ${description || ''}`;
    const lower = contentForSignals.toLowerCase();
    const inferredType =
        lower.includes('intern') ? OpportunityType.INTERNSHIP : source.defaultType;

    return {
        sourceExternalId: String(item.id || item.jobReqId || item.bulletFieldId || '').trim() || undefined,
        type: inferredType,
        title,
        company,
        description,
        applyLink,
        locations,
        workMode: extractWorkMode(contentForSignals),
        experienceMin: toNumber(item.experienceMin ?? item.minExperience),
        experienceMax: toNumber(item.experienceMax ?? item.maxExperience),
        allowedPassoutYears: [],
        requiredSkills: normalizeSkillList(toStringArray(item.skills || item.keySkills)),
        raw: item,
    };
}

function parseWorkdayPayload(payload: unknown, source: SourceConfig): Candidate[] {
    const maybeObject = payload as Record<string, unknown>;
    const list = Array.isArray(payload)
        ? payload
        : Array.isArray(maybeObject?.jobPostings)
            ? maybeObject.jobPostings
            : Array.isArray(maybeObject?.jobRequisitions)
                ? maybeObject.jobRequisitions
                : Array.isArray(maybeObject?.postings)
                    ? maybeObject.postings
                    : Array.isArray(maybeObject?.jobs)
                        ? maybeObject.jobs
                        : [];

    return (list as unknown[])
        .map((item: unknown) => normalizeWorkdayItem(item as Record<string, unknown>, source))
        .filter((item: Candidate | null): item is Candidate => Boolean(item));
}

async function fetchCandidates(source: SourceConfig): Promise<Candidate[]> {
    const response = await fetch(source.endpoint, {
        headers: {
            'User-Agent': 'FresherFlow-IngestionBot/1.0 (+https://fresherflow.in)',
            Accept: 'application/json,text/plain,*/*'
        }
    });

    if (!response.ok) {
        throw new Error(`Source responded ${response.status}`);
    }

    const payload = await response.json();

    if (source.sourceType === IngestionSourceType.WORKDAY) {
        return parseWorkdayPayload(payload, source);
    }

    if (source.sourceType !== IngestionSourceType.JSON_FEED && source.sourceType !== IngestionSourceType.CUSTOM) {
        throw new Error(`Source type ${source.sourceType} parser is not implemented yet`);
    }

    const jsonPayload = payload as Record<string, unknown>;
    const list = Array.isArray(payload)
        ? payload
        : Array.isArray(jsonPayload?.jobs)
            ? jsonPayload.jobs
            : Array.isArray(jsonPayload?.data)
                ? jsonPayload.data
                : Array.isArray(jsonPayload?.results)
                    ? jsonPayload.results
                : [];

    return (list as unknown[])
        .map((item: unknown) => normalizeJsonFeedItem(item as Record<string, unknown>, source.defaultType))
        .filter((item: Candidate | null): item is Candidate => Boolean(item));
}

async function ensureDraftFromCandidate(candidate: Candidate, sourceName: string, score: number): Promise<'created' | 'deduped' | 'rejected'> {
    if (!candidate.applyLink && candidate.type !== OpportunityType.WALKIN) {
        return 'rejected';
    }

    if (candidate.applyLink) {
        const existing = await prisma.opportunity.findFirst({
            where: {
                deletedAt: null,
                applyLink: candidate.applyLink,
            },
            select: { id: true }
        });

        if (existing) return 'deduped';
    }

    const fallbackAdminId = process.env.INGESTION_DEFAULT_ADMIN_ID;
    if (!fallbackAdminId) {
        throw new Error('INGESTION_DEFAULT_ADMIN_ID is required to create drafts');
    }

    const draftId = randomUUID();

    await prisma.opportunity.create({
        data: {
            id: draftId,
            slug: generateSlug(candidate.title, candidate.company, draftId),
            type: candidate.type,
            title: candidate.title,
            company: candidate.company,
            description: candidate.description,
            locations: candidate.locations.length > 0 ? candidate.locations : ['India'],
            workMode: candidate.workMode,
            applyLink: candidate.applyLink,
            experienceMin: candidate.experienceMin,
            experienceMax: candidate.experienceMax,
            allowedDegrees: ['DEGREE'],
            allowedCourses: [],
            allowedSpecializations: [],
            allowedPassoutYears: candidate.allowedPassoutYears || [],
            requiredSkills: normalizeSkillList(candidate.requiredSkills || []),
            status: OpportunityStatus.DRAFT,
            postedByUserId: fallbackAdminId,
            notesHighlights: `[AUTO-INGEST:${sourceName}] fresherScore=${score}`
        }
    });

    return 'created';
}

export async function runIngestionForSource(sourceId: string) {
    const source = await prisma.ingestionSource.findUnique({ where: { id: sourceId } });
    if (!source || !source.enabled) {
        return { sourceId, skipped: true, reason: 'source_not_found_or_disabled' };
    }

    const run = await prisma.ingestionRun.create({
        data: {
            sourceId: source.id,
            status: IngestionRunStatus.RUNNING,
        }
    });

    let fetchedCount = 0;
    let draftCreatedCount = 0;
    let dedupedCount = 0;
    let rejectedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    try {
        const candidates = await fetchCandidates(source);
        fetchedCount = candidates.length;

        for (const candidate of candidates) {
            const scoring = computeFresherScore(candidate);

            let status: RawOpportunityStatus = RawOpportunityStatus.FETCHED;
            let mappedOpportunityId: string | null = null;
            let errorMessage: string | null = null;

            try {
                if (scoring.score < FRESHER_SCORE_MIN) {
                    rejectedCount += 1;
                    status = RawOpportunityStatus.REJECTED;
                } else {
                    const result = await ensureDraftFromCandidate(candidate, source.name, scoring.score);
                    if (result === 'created') {
                        draftCreatedCount += 1;
                        status = RawOpportunityStatus.DRAFT_CREATED;
                    } else if (result === 'deduped') {
                        dedupedCount += 1;
                        status = RawOpportunityStatus.DEDUPED;
                    } else {
                        rejectedCount += 1;
                        status = RawOpportunityStatus.REJECTED;
                    }
                }
            } catch (error) {
                errorCount += 1;
                status = RawOpportunityStatus.ERROR;
                errorMessage = error instanceof Error ? error.message : 'unknown_error';
                errors.push(errorMessage);
            }

            if (status === RawOpportunityStatus.DRAFT_CREATED && candidate.applyLink) {
                const created = await prisma.opportunity.findFirst({
                    where: { applyLink: candidate.applyLink },
                    orderBy: { postedAt: 'desc' },
                    select: { id: true }
                });
                mappedOpportunityId = created?.id || null;
            }

            await prisma.rawOpportunity.create({
                data: {
                    sourceId: source.id,
                    ingestionRunId: run.id,
                    sourceExternalId: candidate.sourceExternalId,
                    status,
                    rawPayload: candidate.raw as any,
                    title: candidate.title,
                    company: candidate.company,
                    applyLink: candidate.applyLink,
                    suggestedType: candidate.type,
                    fresherScore: scoring.score,
                    reasonFlags: scoring.flags,
                    mappedOpportunityId,
                    errorMessage,
                }
            });
        }

        const finalStatus = errorCount > 0 ? IngestionRunStatus.PARTIAL : IngestionRunStatus.SUCCESS;

        await prisma.ingestionRun.update({
            where: { id: run.id },
            data: {
                status: finalStatus,
                endedAt: new Date(),
                fetchedCount,
                draftCreatedCount,
                dedupedCount,
                rejectedCount,
                errorCount,
                errorSummary: errors.slice(0, 5).join(' | ') || null,
            }
        });

        await prisma.ingestionSource.update({
            where: { id: source.id },
            data: {
                lastRunAt: new Date(),
                lastSuccessAt: new Date()
            }
        });

        logger.info('Ingestion run completed', {
            sourceId: source.id,
            runId: run.id,
            fetchedCount,
            draftCreatedCount,
            dedupedCount,
            rejectedCount,
            errorCount,
            highConfidenceThreshold: FRESHER_SCORE_HIGH_CONFIDENCE
        });

        return { sourceId: source.id, runId: run.id, fetchedCount, draftCreatedCount, dedupedCount, rejectedCount, errorCount };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown_ingestion_error';
        await prisma.ingestionRun.update({
            where: { id: run.id },
            data: {
                status: IngestionRunStatus.FAILED,
                endedAt: new Date(),
                fetchedCount,
                draftCreatedCount,
                dedupedCount,
                rejectedCount,
                errorCount: errorCount + 1,
                errorSummary: message,
            }
        });

        await prisma.ingestionSource.update({
            where: { id: source.id },
            data: { lastRunAt: new Date() }
        });

        logger.error('Ingestion run failed', { sourceId: source.id, runId: run.id, error: message });
        throw error;
    }
}

export async function runIngestionCycle() {
    const sources = await prisma.ingestionSource.findMany({ where: { enabled: true } });

    const now = Date.now();
    const runnable = sources.filter((source) => {
        if (!source.lastRunAt) return true;
        const elapsedMs = now - new Date(source.lastRunAt).getTime();
        return elapsedMs >= source.runFrequencyMinutes * 60 * 1000;
    });

    const results = [] as Array<Record<string, unknown>>;

    for (const source of runnable) {
        try {
            const result = await runIngestionForSource(source.id);
            results.push({ ...result, ok: true });
        } catch (error) {
            results.push({
                sourceId: source.id,
                ok: false,
                error: error instanceof Error ? error.message : 'unknown_error'
            });
        }
    }

    return {
        scannedSources: sources.length,
        runnableSources: runnable.length,
        results
    };
}
