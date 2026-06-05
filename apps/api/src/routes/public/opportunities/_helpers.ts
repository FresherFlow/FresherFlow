import { Request } from 'express';
import { OpportunityType } from '@fresherflow/types';
import { verifyAccessToken } from '@fresherflow/auth';
import { createRateLimiter } from '../../../middleware/rateLimit';

export type PublicSiteMode = 'private' | 'govt';

function parsePositiveIntEnv(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export const GUEST_FEED_LIMIT = parsePositiveIntEnv(process.env.GUEST_FEED_LIMIT, 200);
export const MAX_FEED_LIMIT = parsePositiveIntEnv(process.env.PUBLIC_FEED_MAX_LIMIT, 200);
export const MAX_FEED_PAGE = parsePositiveIntEnv(process.env.PUBLIC_FEED_MAX_PAGE, 50);
export const GUEST_FEED_CACHE_TTL_SECONDS = parsePositiveIntEnv(process.env.PUBLIC_FEED_CACHE_TTL_SECONDS, 21600);
export const GUEST_DETAIL_CACHE_TTL_SECONDS = parsePositiveIntEnv(process.env.PUBLIC_DETAIL_CACHE_TTL_SECONDS, 21600);
export const GUEST_FEED_CACHE_CONTROL = 'public, max-age=300, s-maxage=21600, stale-while-revalidate=86400';
export const GUEST_DETAIL_CACHE_CONTROL = 'public, max-age=300, s-maxage=21600, stale-while-revalidate=86400';
export const MAX_DETAIL_ID_LENGTH = 200;
export const MAX_SALARY_FILTER = 100000000;
export const ALLOWED_SORT_KEYS = new Set(['', 'freshness_v2']);

const BOT_UA_REGEX = /(bot|crawler|spider|scraper|curl|wget|python-requests|axios|headless|preview|slurp|facebookexternalhit|whatsapp|telegrambot|linkedinbot|discordbot)/i;

export function isLikelyBotTraffic(req: Request): boolean {
    const ua = String(req.headers['user-agent'] || '').toLowerCase();
    if (!ua) return true;
    if (BOT_UA_REGEX.test(ua)) return true;

    const acceptLanguage = String(req.headers['accept-language'] || '').trim();
    const secFetchMode = String(req.headers['sec-fetch-mode'] || '').trim().toLowerCase();
    return !acceptLanguage && secFetchMode !== 'navigate';
}

export const publicFeedLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 80,
    message: 'Too many feed requests. Please try again in a minute.',
    keyPrefix: 'opportunities_public',
});

export const publicFeedBotLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 25,
    message: 'Too many automated feed requests. Please slow down.',
    keyPrefix: 'opportunities_public_bot',
});

export const publicDetailLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 120,
    message: 'Too many detail requests. Please try again in a minute.',
    keyPrefix: 'opportunity_detail',
});

export const publicDetailBotLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 35,
    message: 'Too many automated detail requests. Please slow down.',
    keyPrefix: 'opportunity_detail_bot',
});

export function tryResolveUserIdFromCookie(req: Request): string | null {
    // If the optionalAuth/requireAuth middleware has already resolved a user (token or anon), use it.
    if (req.userId) return req.userId;

    const token = req.cookies?.accessToken;
    if (!token) return null;
    try {
        return verifyAccessToken(token);
    } catch {
        return null;
    }
}

export function buildGuestOpportunitySelect() {
    return {
        id: true,
        slug: true,
        type: true,
        title: true,
        company: true,
        companyWebsite: true,
        locations: true,
        workMode: true,
        salaryMin: true,
        salaryMax: true,
        salaryRange: true,
        salaryPeriod: true,
        employmentType: true,
        tags: true,
        requiredSkills: true,
        allowedDegrees: true,
        allowedCourses: true,
        allowedSpecializations: true,
        allowedPassoutYears: true,
        experienceMin: true,
        experienceMax: true,
        applyLink: true,
        sourceLink: true,
        expiresAt: true,
        postedAt: true,
        linkHealth: true,
        sharesCount: true,
        savesCount: true,
        clicksCount: true,
        trendingScore: true,
        events: {
            orderBy: { eventDate: 'asc' as const },
            select: {
                id: true,
                eventType: true,
                eventDate: true,
                title: true,
                sourceLink: true,
            }
        },
        user: {
            select: {
                username: true,
                fullName: true,
            }
        }
    } as const;
}

export function buildPublicOpportunitySelect(userId?: string) {
    return {
        id: true,
        slug: true,
        type: true,
        title: true,
        company: true,
        companyWebsite: true,
        description: true,
        allowedDegrees: true,
        allowedCourses: true,
        allowedSpecializations: true,
        allowedPassoutYears: true,
        passoutYearMin: true,
        passoutYearMax: true,
        allowedAvailability: true,
        requiredSkills: true,
        locations: true,
        experienceMin: true,
        experienceMax: true,
        workMode: true,
        salaryMin: true,
        salaryMax: true,
        salaryRange: true,
        salaryPeriod: true,
        incentives: true,
        jobFunction: true,
        selectionProcess: true,
        notesHighlights: true,
        stipend: true,
        employmentType: true,
        tags: true,
        applyLink: true,
        sourceLink: true,
        expiresAt: true,
        postedAt: true,
        linkHealth: true,
        verificationFailures: true,
        lastVerifiedAt: true,
        lastVerified: true,
        clicksCount: true,
        events: {
            orderBy: { eventDate: 'asc' as const },
            select: {
                id: true,
                opportunityId: true,
                eventType: true,
                eventDate: true,
                title: true,
                notes: true,
                sourceLink: true,
                createdAt: true,
                updatedAt: true,
            }
        },
        walkInDetails: {
            select: {
                dates: true,
                dateRange: true,
                timeRange: true,
                venueAddress: true,
                venueLink: true,
                reportingTime: true,
                requiredDocuments: true,
                contactPerson: true,
                contactPhone: true,
            },
        },
        governmentJobDetails: {
            select: {
                id: true,
                recruitingBody: true,
                advertisementNumber: true,
                governmentLevel: true,
                vacancyNature: true,
                applicationMode: true,
                applicationStatus: true,
                vacancyCount: true,
                vacancyBreakdown: true,
                categoryVacancies: true,
                applicationFee: true,
                feeBreakdown: true,
                ageMin: true,
                ageMax: true,
                ageRelaxationRules: true,
                qualificationDetails: true,
                physicalStandards: true,
                selectionStages: true,
                examPattern: true,
                examStages: true,
                importantDates: true,
                importantInstructions: true,
                basicPay: true,
                payLevel: true,
                allowances: true,
                examCenters: true,
                notificationPdfUrl: true,
                officialNotificationUrl: true,
                admitCardUrl: true,
                resultUrl: true,
                answerKeyUrl: true,
                syllabusUrl: true,
                previousPapersUrl: true,
                extraMetadata: true,
                officialSourceVerified: true,
                extractionConfidence: true,
            },
        },
        ...(userId
            ? {
                actions: {
                    where: { userId },
                    select: {
                        actionType: true,
                        updatedAt: true,
                    },
                },
                savedBy: {
                    where: { userId },
                    select: { id: true },
                    take: 1,
                },
            }
            : {}),
        rawIngestions: {
            where: { createdByUserId: { not: null } },
            orderBy: { createdAt: 'asc' },
            take: 1,
            select: {
                createdBy: {
                    select: {
                        id: true,
                        username: true,
                        trustLevel: true,
                    }
                }
            }
        },
        user: {
            select: {
                username: true,
                fullName: true,
            }
        }
    } as const;
}

export function normalizeSafeQueryString(value: unknown, maxLen = 80) {
    return String(value || '').trim().slice(0, maxLen);
}

export function parseStrictPositiveInt(value: unknown): number | null {
    const raw = String(value ?? '').trim();
    if (!/^\d+$/.test(raw)) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
}

export function isSupportedDetailId(value: string) {
    if (!value || value.length > MAX_DETAIL_ID_LENGTH) return false;
    return /^[a-zA-Z0-9\-_.:/%]+$/.test(value);
}

export function getFreshnessScore(
    opportunity: { postedAt?: Date | string; expiresAt?: Date | string | null; actions?: Array<{ actionType: string }> },
    daySeed: number
) {
    const now = Date.now();
    const postedAt = opportunity.postedAt ? new Date(opportunity.postedAt).getTime() : now;
    const ageHours = Math.max(0, (now - postedAt) / (1000 * 60 * 60));
    const recencyScore = Math.max(0, 100 - ageHours);

    const hasViewed = (opportunity.actions || []).some((a) => a.actionType === 'VIEWED');
    const unseenScore = hasViewed ? 0 : 40;

    const expiryScore = (() => {
        if (!opportunity.expiresAt) return 8;
        const hrs = (new Date(opportunity.expiresAt).getTime() - now) / (1000 * 60 * 60);
        if (hrs <= 0) return -30;
        if (hrs <= 24) return 26;
        if (hrs <= 72) return 18;
        if (hrs <= 168) return 10;
        return 4;
    })();

    const stableNoise = (daySeed % 17) * 0.37;
    return recencyScore + unseenScore + expiryScore + stableNoise;
}

export function normalizeTypeParam(raw?: string) {
    if (!raw) return undefined;
    const value = raw.toLowerCase();
    if (value === 'job' || value === 'jobs') return 'JOB';
    if (value === 'internship' || value === 'internships') return 'INTERNSHIP';
    if (value === 'walk-in' || value === 'walkin' || value === 'walkins' || value === 'walk-ins') return 'WALKIN';
    return raw.toUpperCase();
}

export function parseOpportunityType(raw?: string): OpportunityType | undefined {
    const normalized = normalizeTypeParam(raw);
    if (!normalized) return undefined;
    if (normalized === OpportunityType.JOB) return OpportunityType.JOB;
    if (normalized === OpportunityType.INTERNSHIP) return OpportunityType.INTERNSHIP;
    if (normalized === OpportunityType.WALKIN) return OpportunityType.WALKIN;
    return undefined;
}

export function parseSiteMode(raw?: unknown): PublicSiteMode {
    const value = Array.isArray(raw) ? raw[0] : raw;
    return String(value || '').toLowerCase() === 'govt' ? 'govt' : 'private';
}
