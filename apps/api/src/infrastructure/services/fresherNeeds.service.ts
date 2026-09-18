import prisma from '../database/prisma';
import { AppError } from '../../middleware/errorHandler';
import {
    CommunityPostStatus,
    OpportunityStatus,
    OpportunityType,
    ReferralRequestStatus,
} from '@fresherflow/database';
import type { Prisma } from '@prisma/client';
import type {
    SalaryReportItem,
    SalaryReportListResult,
    SalaryReportType,
    SavedSearch,
    SavedSearchFilters,
} from '@fresherflow/types';

type PostUser = {
    id: string;
    fullName: string | null;
    username: string | null;
    avatarUrl: string | null;
};

const postUserSelect = {
    id: true,
    fullName: true,
    username: true,
    profile: { select: { avatarUrl: true } },
} satisfies Prisma.UserSelect;

const toPostUser = (user: {
    id: string;
    fullName: string | null;
    username: string | null;
    profile: { avatarUrl: string | null } | null;
}): PostUser => ({
    id: user.id,
    fullName: user.fullName,
    username: user.username,
    avatarUrl: user.profile?.avatarUrl ?? null,
});

// ============================================================================
// WALK-INS TODAY
// ============================================================================

const walkInHubSelect = {
    id: true,
    slug: true,
    title: true,
    company: true,
    companyLogoUrl: true,
    locations: true,
    salaryRange: true,
    applyLink: true,
    allowedPassoutYears: true,
    postedAt: true,
    expiresAt: true,
    walkInDetails: {
        select: {
            dates: true,
            dateRange: true,
            timeRange: true,
            venueAddress: true,
            venueLink: true,
            city: true,
            clusterName: true,
            reportingTime: true,
            requiredDocuments: true,
            landmark: true,
        },
    },
} satisfies Prisma.OpportunitySelect;

type WalkInHubRow = Prisma.OpportunityGetPayload<{ select: typeof walkInHubSelect }>;

function toWalkInTodayItem(o: WalkInHubRow) {
    const w = o.walkInDetails;
    return {
        id: o.id,
        slug: o.slug,
        title: o.title,
        company: o.company,
        companyLogoUrl: o.companyLogoUrl,
        locations: o.locations,
        salaryRange: o.salaryRange,
        applyLink: o.applyLink,
        allowedPassoutYears: o.allowedPassoutYears,
        postedAt: o.postedAt.toISOString(),
        expiresAt: o.expiresAt?.toISOString() ?? null,
        walkIn: w
            ? {
                  dates: w.dates.map((d: Date) => d.toISOString()),
                  dateRange: w.dateRange,
                  timeRange: w.timeRange,
                  venueAddress: w.venueAddress,
                  venueLink: w.venueLink,
                  city: w.city,
                  clusterName: w.clusterName,
                  reportingTime: w.reportingTime,
                  requiredDocuments: w.requiredDocuments,
                  landmark: w.landmark,
              }
            : null,
    };
}

/** Split a walk-in into drive-date buckets: today, tomorrow, or later. */
function bucketForDrive(dates: Date[]): 'today' | 'tomorrow' | 'upcoming' | 'undated' {
    if (dates.length === 0) return 'undated';
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayEnd = new Date(startOfToday);
    todayEnd.setDate(todayEnd.getDate() + 1);
    const tomorrowEnd = new Date(todayEnd);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

    // Drive runs today if any of its dates falls in today's window
    if (dates.some((d) => d >= startOfToday && d < todayEnd)) return 'today';
    // Drive runs tomorrow if any date falls in tomorrow's window
    if (dates.some((d) => d >= todayEnd && d < tomorrowEnd)) return 'tomorrow';
    // Otherwise upcoming (any future date) — undated rows fall through
    if (dates.some((d) => d >= todayEnd)) return 'upcoming';
    return 'undated';
}

export async function listWalkInsToday(params: { city?: string; batch?: number; limit?: number }) {
    const limit = Math.min(params.limit ?? 100, 200);
    const now = new Date();

    const where: Prisma.OpportunityWhereInput = {
        type: OpportunityType.WALKIN,
        status: OpportunityStatus.PUBLISHED,
        deletedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        ...(params.city ? { OR: [{ walkInDetails: { city: { equals: params.city, mode: 'insensitive' } } }, { locations: { has: params.city } }] } : {}),
        ...(params.batch ? { allowedPassoutYears: { has: params.batch } } : {}),
    };

    const rows = await prisma.opportunity.findMany({
        where,
        orderBy: { postedAt: 'desc' },
        take: limit,
        select: walkInHubSelect,
    });

    const items = rows.map(toWalkInTodayItem);
    const today: typeof items = [];
    const tomorrow: typeof items = [];
    const upcoming: typeof items = [];
    const undated: typeof items = [];

    for (const item of items) {
        const dates = (item.walkIn?.dates ?? []).map((d) => new Date(d));
        switch (bucketForDrive(dates)) {
            case 'today':
                today.push(item);
                break;
            case 'tomorrow':
                tomorrow.push(item);
                break;
            case 'upcoming':
                upcoming.push(item);
                break;
            default:
                undated.push(item);
        }
    }

    return {
        today,
        tomorrow,
        upcoming,
        undated,
        total: items.length,
        updatedAt: now.toISOString(),
    };
}

// ============================================================================
// SAVED SEARCHES
// ============================================================================

export async function listSavedSearches(userId: string): Promise<SavedSearch[]> {
    const searches = await prisma.savedSearch.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
    });

    // Compute new match counts since last notification
    const withCounts = await Promise.all(
        searches.map(async (search) => {
            const filters = search.filters as SavedSearchFilters;
            let newMatchCount = 0;
            try {
                newMatchCount = await countMatchesForFilters(filters, search.lastNotifiedAt ?? search.createdAt);
            } catch {
                newMatchCount = 0;
            }
            return {
                id: search.id,
                userId: search.userId,
                name: search.name,
                filters,
                alertEnabled: search.alertEnabled,
                lastMatchedAt: search.lastMatchedAt?.toISOString() ?? null,
                lastNotifiedAt: search.lastNotifiedAt?.toISOString() ?? null,
                createdAt: search.createdAt.toISOString(),
                updatedAt: search.updatedAt.toISOString(),
                newMatchCount,
            } satisfies SavedSearch;
        })
    );

    return withCounts;
}

export async function createSavedSearch(
    userId: string,
    input: { name: string; filters: SavedSearchFilters; alertEnabled?: boolean }
): Promise<SavedSearch> {
    const search = await prisma.savedSearch.create({
        data: {
            userId,
            name: input.name,
            filters: input.filters as unknown as Prisma.InputJsonValue,
            alertEnabled: input.alertEnabled ?? true,
        },
    });

    return {
        id: search.id,
        userId: search.userId,
        name: search.name,
        filters: search.filters as SavedSearchFilters,
        alertEnabled: search.alertEnabled,
        lastMatchedAt: null,
        lastNotifiedAt: null,
        createdAt: search.createdAt.toISOString(),
        updatedAt: search.updatedAt.toISOString(),
        newMatchCount: 0,
    };
}

export async function updateSavedSearch(
    userId: string,
    searchId: string,
    input: { name?: string; alertEnabled?: boolean }
): Promise<SavedSearch> {
    const existing = await prisma.savedSearch.findFirst({ where: { id: searchId, userId } });
    if (!existing) throw new AppError('Saved search not found', 404);

    const search = await prisma.savedSearch.update({
        where: { id: searchId },
        data: {
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.alertEnabled !== undefined ? { alertEnabled: input.alertEnabled } : {}),
        },
    });

    return {
        id: search.id,
        userId: search.userId,
        name: search.name,
        filters: search.filters as SavedSearchFilters,
        alertEnabled: search.alertEnabled,
        lastMatchedAt: search.lastMatchedAt?.toISOString() ?? null,
        lastNotifiedAt: search.lastNotifiedAt?.toISOString() ?? null,
        createdAt: search.createdAt.toISOString(),
        updatedAt: search.updatedAt.toISOString(),
    };
}

export async function deleteSavedSearch(userId: string, searchId: string): Promise<void> {
    const existing = await prisma.savedSearch.findFirst({ where: { id: searchId, userId } });
    if (!existing) throw new AppError('Saved search not found', 404);
    await prisma.savedSearch.delete({ where: { id: searchId } });
}

/**
 * Count published opportunities matching the saved filters posted after `since`.
 * Mirrors the feed route's where-clause for the core filter dimensions.
 */
async function countMatchesForFilters(filters: SavedSearchFilters, since: Date): Promise<number> {
    const andConditions: Prisma.OpportunityWhereInput[] = [];

    if (filters.type) andConditions.push({ type: filters.type as OpportunityType });
    else if (filters.feedType === 'walkins') andConditions.push({ type: OpportunityType.WALKIN });
    else if (filters.feedType === 'internships') andConditions.push({ type: OpportunityType.INTERNSHIP });

    if (filters.feedType === 'remote') andConditions.push({ workMode: 'REMOTE' });
    if (filters.feedType === '2026') andConditions.push({ allowedPassoutYears: { has: 2026 } });

    if (filters.city) andConditions.push({ locations: { has: filters.city } });
    if (filters.tag) andConditions.push({ tags: { has: filters.tag } });
    if (filters.company) andConditions.push({ company: { equals: filters.company, mode: 'insensitive' } });
    if (filters.batch) andConditions.push({ allowedPassoutYears: { has: filters.batch } });
    if (filters.minSalary != null) {
        andConditions.push({ OR: [{ salaryMin: { gte: filters.minSalary } }, { salaryMax: { gte: filters.minSalary } }] });
    }
    if (filters.maxSalary != null) andConditions.push({ salaryMin: { lte: filters.maxSalary } });
    if (filters.closingSoon) {
        andConditions.push({ expiresAt: { lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) } });
    }

    return prisma.opportunity.count({
        where: {
            status: OpportunityStatus.PUBLISHED,
            deletedAt: null,
            postedAt: { gte: since },
            AND: andConditions,
        },
    });
}

// ============================================================================
// REFERRAL REQUEST BOARD
// ============================================================================

export async function listReferralRequests(params: {
    page: number;
    limit: number;
    company?: string;
    status?: ReferralRequestStatus;
    currentUserId?: string;
}) {
    const { page, limit, company, status, currentUserId } = params;

    const where: Prisma.ReferralRequestWhereInput = {
        ...(company ? { company: { equals: company, mode: 'insensitive' } } : {}),
        ...(status ? { status } : {}),
    };

    const [total, requests] = await Promise.all([
        prisma.referralRequest.count({ where }),
        prisma.referralRequest.findMany({
            where,
            orderBy: [{ status: 'asc' }, { createdAt: 'desc' }], // OPEN first
            skip: (page - 1) * limit,
            take: limit,
            include: {
                author: { select: postUserSelect },
                responses: {
                    orderBy: { createdAt: 'desc' },
                    include: { responder: { select: postUserSelect } },
                },
            },
        }),
    ]);

    return {
        requests: requests.map((r) => ({
            id: r.id,
            authorId: r.authorId,
            company: r.company,
            role: r.role,
            batch: r.batch,
            city: r.city,
            note: r.note,
            status: r.status,
            responseCount: r.responseCount,
            createdAt: r.createdAt.toISOString(),
            author: toPostUser(r.author),
            responses: r.responses.map((resp) => ({
                id: resp.id,
                message: resp.message,
                contactHandle: resp.contactHandle,
                createdAt: resp.createdAt.toISOString(),
                responder: toPostUser(resp.responder),
            })),
        })),
        total,
        page,
        limit,
        hasMore: page * limit < total,
    };
}

export async function createReferralRequest(
    authorId: string,
    input: { company: string; role?: string; batch?: number; city?: string; note?: string }
) {
    // Rate-ish guard: max 5 OPEN requests per user
    const openCount = await prisma.referralRequest.count({
        where: { authorId, status: ReferralRequestStatus.OPEN },
    });
    if (openCount >= 5) {
        throw new AppError('You already have 5 open referral requests. Close one before adding another.', 429);
    }

    return prisma.referralRequest.create({
        data: {
            authorId,
            company: input.company,
            role: input.role,
            batch: input.batch,
            city: input.city,
            note: input.note,
        },
        include: { author: { select: postUserSelect } },
    });
}

export async function closeReferralRequest(
    userId: string,
    requestId: string,
    status: ReferralRequestStatus
) {
    const request = await prisma.referralRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new AppError('Referral request not found', 404);
    if (request.authorId !== userId) throw new AppError('Only the request author can update it', 403);

    return prisma.referralRequest.update({
        where: { id: requestId },
        data: { status },
    });
}

export async function respondToReferralRequest(
    responderId: string,
    requestId: string,
    input: { message?: string; contactHandle?: string }
) {
    const request = await prisma.referralRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new AppError('Referral request not found', 404);
    if (request.authorId === responderId) {
        throw new AppError('You cannot respond to your own request', 400);
    }
    if (request.status !== ReferralRequestStatus.OPEN) {
        throw new AppError('This request is no longer open', 400);
    }

    const [response] = await prisma.$transaction([
        prisma.referralResponse.upsert({
            where: { requestId_responderId: { requestId, responderId } },
            create: { requestId, responderId, message: input.message, contactHandle: input.contactHandle },
            update: { message: input.message, contactHandle: input.contactHandle },
        }),
        prisma.referralRequest.update({
            where: { id: requestId },
            data: { responseCount: { increment: 1 } },
        }),
        prisma.notification.create({
            data: {
                userId: request.authorId,
                type: 'COMMENT_REPLY' as never, // Reuse reply type until a dedicated type exists
                actorId: responderId,
                payload: {
                    kind: 'REFERRAL_RESPONSE',
                    requestId,
                    company: request.company,
                },
            },
        }),
    ]);

    return response;
}

export async function deleteReferralResponse(responderId: string, requestId: string) {
    const response = await prisma.referralResponse.findUnique({
        where: { requestId_responderId: { requestId, responderId } },
    });
    if (!response) throw new AppError('Response not found', 404);

    await prisma.$transaction([
        prisma.referralResponse.delete({ where: { id: response.id } }),
        prisma.referralRequest.update({
            where: { id: requestId },
            data: { responseCount: { decrement: 1 } },
        }),
    ]);
}

// ============================================================================
// SALARY REPORTS (Offer transparency)
// ============================================================================

const salaryReportInclude = {
    author: { select: postUserSelect },
    opportunity: { select: { id: true, slug: true, title: true } },
} satisfies Prisma.SalaryReportInclude;

function toSalaryReportItem(
    report: Prisma.SalaryReportGetPayload<{ include: typeof salaryReportInclude }>,
    markedHelpful?: boolean
): SalaryReportItem {
    return {
        id: report.id,
        opportunityId: report.opportunityId,
        company: report.company,
        role: report.role,
        batch: report.batch,
        city: report.city,
        reportType: report.reportType as SalaryReportType,
        ctcFixed: report.ctcFixed,
        ctcVariable: report.ctcVariable,
        ctcTotal: report.ctcTotal,
        inHandMonthly: report.inHandMonthly,
        joinBonus: report.joinBonus,
        bondMonths: report.bondMonths,
        notes: report.notes,
        helpfulCount: report.helpfulCount,
        createdAt: report.createdAt.toISOString(),
        author: toPostUser(report.author),
        opportunity: report.opportunity ?? null,
        markedHelpful,
    };
}

export async function listSalaryReports(params: {
    page: number;
    limit: number;
    company?: string;
    role?: string;
    city?: string;
    batch?: number;
    currentUserId?: string;
}): Promise<SalaryReportListResult> {
    const { page, limit, company, role, city, batch, currentUserId } = params;

    const where: Prisma.SalaryReportWhereInput = {
        status: CommunityPostStatus.ACTIVE,
        ...(company ? { company: { equals: company, mode: 'insensitive' } } : {}),
        ...(role ? { role: { contains: role, mode: 'insensitive' } } : {}),
        ...(city ? { city: { equals: city, mode: 'insensitive' } } : {}),
        ...(batch ? { batch } : {}),
    };

    const [total, reports] = await Promise.all([
        prisma.salaryReport.count({ where }),
        prisma.salaryReport.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                ...salaryReportInclude,
                ...(currentUserId
                    ? { helpfulMarks: { where: { userId: currentUserId }, select: { userId: true } } }
                    : {}),
            },
        }),
    ]);

    const items = reports.map((r) => {
        const helpfulMarks = (r as unknown as { helpfulMarks?: Array<{ userId: string }> }).helpfulMarks ?? [];
        return toSalaryReportItem(
            r,
            currentUserId ? helpfulMarks.length > 0 : undefined
        );
    });

    const withTotals = reports.map((r) => r.ctcTotal).filter((v): v is number => v != null);
    const withInHand = reports.map((r) => r.inHandMonthly).filter((v): v is number => v != null);
    const withBond = reports.map((r) => r.bondMonths).filter((v): v is number => v != null);

    return {
        reports: items,
        total,
        page,
        limit,
        hasMore: page * limit < total,
        stats: {
            count: withTotals.length,
            avgTotal: withTotals.length ? Math.round(withTotals.reduce((a, b) => a + b, 0) / withTotals.length) : null,
            minTotal: withTotals.length ? Math.min(...withTotals) : null,
            maxTotal: withTotals.length ? Math.max(...withTotals) : null,
            avgInHand: withInHand.length ? Math.round(withInHand.reduce((a, b) => a + b, 0) / withInHand.length) : null,
            avgBond: withBond.length ? Math.round(withBond.reduce((a, b) => a + b, 0) / withBond.length) : null,
        },
    };
}

export async function createSalaryReport(
    authorId: string,
    input: {
        opportunityId?: string;
        company: string;
        role: string;
        batch?: number;
        city?: string;
        reportType?: 'OFFER' | 'CURRENT_CTC';
        ctcFixed?: number;
        ctcVariable?: number;
        ctcTotal?: number;
        inHandMonthly?: number;
        joinBonus?: number;
        bondMonths?: number;
        notes?: string;
    }
) {
    return prisma.salaryReport.create({
        data: {
            authorId,
            opportunityId: input.opportunityId,
            company: input.company,
            role: input.role,
            batch: input.batch,
            city: input.city,
            reportType: input.reportType ?? 'OFFER',
            ctcFixed: input.ctcFixed,
            ctcVariable: input.ctcVariable,
            ctcTotal: input.ctcTotal,
            inHandMonthly: input.inHandMonthly,
            joinBonus: input.joinBonus,
            bondMonths: input.bondMonths,
            notes: input.notes,
        },
        include: salaryReportInclude,
    });
}

export async function markSalaryReportHelpful(userId: string, reportId: string) {
    const report = await prisma.salaryReport.findUnique({ where: { id: reportId } });
    if (!report) throw new AppError('Salary report not found', 404);

    const existing = await prisma.salaryReportHelpful.findUnique({
        where: { salaryReportId_userId: { salaryReportId: reportId, userId } },
    });

    if (existing) {
        await prisma.$transaction([
            prisma.salaryReportHelpful.delete({ where: { id: existing.id } }),
            prisma.salaryReport.update({ where: { id: reportId }, data: { helpfulCount: { decrement: 1 } } }),
        ]);
        return { marked: false, helpfulCount: Math.max(0, report.helpfulCount - 1) };
    }

    await prisma.$transaction([
        prisma.salaryReportHelpful.create({ data: { salaryReportId: reportId, userId } }),
        prisma.salaryReport.update({ where: { id: reportId }, data: { helpfulCount: { increment: 1 } } }),
    ]);
    return { marked: true, helpfulCount: report.helpfulCount + 1 };
}

// ============================================================================
// COMPANY HUB (aggregate: drives + experiences + salary + trust)
// ============================================================================

export async function getCompanyHub(companyName: string) {
    const company = companyName.trim();
    if (!company || company.length > 120) throw new AppError('Invalid company name', 400);

    const companyFilter = { equals: company, mode: 'insensitive' as const };

    const [drives, experiences, salaryReports, referralStats] = await Promise.all([
        prisma.opportunity.findMany({
            where: {
                company: companyFilter,
                status: OpportunityStatus.PUBLISHED,
                deletedAt: null,
                OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
            orderBy: { postedAt: 'desc' },
            take: 20,
            select: {
                id: true,
                slug: true,
                title: true,
                type: true,
                locations: true,
                salaryRange: true,
                salaryMin: true,
                salaryMax: true,
                allowedPassoutYears: true,
                postedAt: true,
                expiresAt: true,
                linkHealth: true,
            },
        }),
        prisma.interviewExperience.findMany({
            where: {
                status: CommunityPostStatus.ACTIVE,
                opportunity: { company: companyFilter },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: { author: { select: postUserSelect } },
        }),
        prisma.salaryReport.findMany({
            where: { status: CommunityPostStatus.ACTIVE, company: companyFilter },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: { author: { select: postUserSelect } },
        }),
        Promise.all([
            prisma.referralRequest.count({ where: { company: companyFilter, status: ReferralRequestStatus.OPEN } }),
            prisma.opportunity.count({
                where: { company: companyFilter, status: OpportunityStatus.PUBLISHED, deletedAt: null },
            }),
        ]),
    ]);

    // Trust signals
    const reportCount = await prisma.report.count({
        where: { opportunity: { company: companyFilter } },
    });

    const withResults = experiences.map((e) => e.result).filter((r): r is NonNullable<typeof r> => r != null);
    const selected = withResults.filter((r) => r === 'SELECTED').length;

    const salaryWithTotals = salaryReports.map((r) => r.ctcTotal).filter((v): v is number => v != null);

    return {
        company: company,
        drives: drives.map((d) => ({
            ...d,
            postedAt: d.postedAt.toISOString(),
            expiresAt: d.expiresAt?.toISOString() ?? null,
        })),
        driveCount: referralStats[1],
        interviewExperiences: experiences.map((e) => ({
            id: e.id,
            role: e.role,
            batch: e.batch,
            difficulty: e.difficulty,
            result: e.result,
            overallNotes: e.overallNotes,
            upvotes: e.upvotes,
            createdAt: e.createdAt.toISOString(),
            author: toPostUser(e.author),
        })),
        experienceStats: {
            total: experiences.length,
            selected,
            rejected: withResults.filter((r) => r === 'REJECTED').length,
        },
        salaryReports: salaryReports.map((r) => ({
            id: r.id,
            role: r.role,
            ctcTotal: r.ctcTotal,
            inHandMonthly: r.inHandMonthly,
            bondMonths: r.bondMonths,
            reportType: r.reportType,
            createdAt: r.createdAt.toISOString(),
            author: toPostUser(r.author),
        })),
        salaryStats: {
            count: salaryWithTotals.length,
            avgTotal: salaryWithTotals.length
                ? Math.round(salaryWithTotals.reduce((a, b) => a + b, 0) / salaryWithTotals.length)
                : null,
            minTotal: salaryWithTotals.length ? Math.min(...salaryWithTotals) : null,
            maxTotal: salaryWithTotals.length ? Math.max(...salaryWithTotals) : null,
        },
        trust: {
            openReferralRequests: referralStats[0],
            reportCount,
        },
    };
}
