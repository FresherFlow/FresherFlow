/**
 * Walk-in browse contract and ranking, shared by the internal MCP route and the
 * rate-limited public route. No Express types live here.
 */
import { z } from 'zod';
import type { WalkinDriveSummary } from '@fresherflow/types';
import { rankWalkins, type WalkinProfileInput } from '@fresherflow/utils';
import { prisma } from '@fresherflow/database';
import { liveDriveOpportunityWhere, liveOpportunityWhere } from '../../utils/liveWhere';
import { LISTING_INCLUDE } from './listingWrite';

const hasBothOrNeither = <T extends { latitude?: number; longitude?: number }>(value: T): boolean =>
    (value.latitude === undefined) === (value.longitude === undefined);

export const walkinsQuerySchema = z.object({
    city: z.string().trim().min(1).max(80).optional(),
    q: z.string().trim().min(1).max(100).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    radiusKm: z.number().min(0.5).max(500).optional(),
    withinDays: z.number().int().min(1).max(90).optional(),
    skills: z.string().trim().max(200).optional(),
    page: z.number().int().min(1).max(50).default(1),
    limit: z.number().int().min(1).max(50).default(20),
}).refine(hasBothOrNeither, {
    message: 'latitude and longitude must be supplied together',
    path: ['latitude'],
});

export type WalkinsQuery = z.infer<typeof walkinsQuerySchema>;
export type BrowseWalkinsInput = Omit<WalkinsQuery, 'page' | 'limit'> & {
    page?: number;
    limit?: number;
    profile?: WalkinProfileInput;
};

export interface WalkinBrowseResult {
    walkins: WalkinDriveSummary[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}

interface BrowseDeps {
    findMany: (args: {
        where: Record<string, unknown>;
        include: typeof LISTING_INCLUDE;
        skip: number;
        take: number;
        orderBy: Record<string, string>;
    }) => Promise<Array<Record<string, any>>>;
    count?: (args: { where: Record<string, unknown> }) => Promise<number>;
}

function toSummary(row: Record<string, any>, ranked: ReturnType<typeof rankWalkins>[number]): WalkinDriveSummary {
    const drive = row.driveDetails ?? {};
    const dates = (drive.dates ?? []).map((value: unknown) =>
        value instanceof Date ? value.toISOString() : String(value),
    );
    return {
        id: String(row.id),
        slug: String(row.slug),
        title: String(row.title),
        company: String(row.company),
        locations: Array.isArray(row.locations) ? row.locations.map(String) : [],
        recruitmentMethod: row.recruitmentMethod ? String(row.recruitmentMethod) : null,
        dates,
        dateRange: drive.dateRange ?? null,
        timeRange: drive.timeRange ?? null,
        reportingTime: drive.reportingTime ?? null,
        venueAddress: drive.venueAddress ?? null,
        venueLink: drive.venueLink ?? null,
        city: drive.city ?? null,
        landmark: drive.landmark ?? null,
        clusterName: drive.clusterName ?? drive.techCluster ?? null,
        latitude: drive.latitude ?? null,
        longitude: drive.longitude ?? null,
        transitInfo: drive.transitInfo ?? null,
        requiredDocuments: Array.isArray(drive.requiredDocuments) ? drive.requiredDocuments.map(String) : [],
        contactPerson: drive.contactPerson ?? null,
        contactPhone: drive.contactPhone ?? null,
        selectionProcess: drive.selectionProcess ?? null,
        distanceKm: ranked.distanceKm,
        score: ranked.score,
        matchReasons: ranked.matchReasons,
        url: `/drives/walk-in/${row.slug}`,
    };
}

/** Pure ranking + projection. Used by browseWalkins and by its tests. */
export function selectWalkins(
    rows: Array<Record<string, any>>,
    signal: { city?: string; latitude?: number; longitude?: number; radiusKm?: number },
    profile?: WalkinProfileInput,
): WalkinDriveSummary[] {
    const candidates = rows.map((row) => {
        const drive = row.driveDetails ?? {};
        return {
            source: row,
            latitude: drive.latitude ?? null,
            longitude: drive.longitude ?? null,
            city: drive.city ?? null,
            dates: drive.dates ?? [],
            allowedDegrees: row.allowedDegrees ?? null,
            allowedPassoutYears: row.allowedPassoutYears ?? null,
            requiredSkills: row.requiredSkills ?? null,
        };
    });
    const ranked = rankWalkins(
        candidates,
        signal,
        profile,
    );
    // rankWalkins returns a new array of spread candidates; keep the original
    // row alongside the ranking result for projection.
    const byId = new Map(rows.map((row) => [String(row.id), row]));
    return ranked.map((item) => {
        const row = byId.get(String((item as { source?: { id?: string } }).source?.id)) ?? item.source;
        return toSummary(row, item);
    });
}

export async function browseWalkins(
    input: BrowseWalkinsInput,
    deps?: BrowseDeps,
): Promise<WalkinBrowseResult> {
    if (!hasBothOrNeither(input)) {
        return { walkins: [], total: 0, page: input.page ?? 1, limit: input.limit ?? 20, hasMore: false };
    }

    const now = new Date();
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;
    const where: Record<string, unknown> = {
        recruitmentMethod: 'WALK_IN',
    };
    if (input.city) where.driveCity = input.city;
    if (input.withinDays) {
        const until = new Date(now.getTime() + input.withinDays * 86400000);
        where.nextDriveAt = { gte: now, lte: until };
    } else {
        where.nextDriveAt = { gte: now };
    }
    if (input.q) {
        where.OR = [
            { title: { contains: input.q, mode: 'insensitive' } },
            { company: { contains: input.q, mode: 'insensitive' } },
        ];
    }
    if (input.skills) {
        const skills = input.skills.split(',').map((s) => s.trim()).filter(Boolean);
        if (skills.length > 0) where.requiredSkills = { hasSome: skills };
    }
    if (input.latitude !== undefined && input.longitude !== undefined) {
        // Bounding box first; the exact great-circle check is in rankWalkins.
        const radius = input.radiusKm ?? 10;
        const latDelta = radius / 111.32;
        const lngDelta = radius / (111.32 * Math.max(0.01, Math.cos((input.latitude * Math.PI) / 180)));
        where.driveDetails = {
            latitude: { gte: input.latitude - latDelta, lte: input.latitude + latDelta },
            longitude: { gte: input.longitude - lngDelta, lte: input.longitude + lngDelta },
        };
    }

    const finalWhere = { AND: [liveOpportunityWhere(now), liveDriveOpportunityWhere(now), where] };
    const findMany = deps?.findMany ?? ((args: Parameters<BrowseDeps['findMany']>[0]) =>
        prisma.opportunity.findMany(args) as Promise<Array<Record<string, any>>>);
    const rows = await findMany({
        where: finalWhere,
        include: LISTING_INCLUDE,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { nextDriveAt: 'asc' },
    });

    const total = deps
        ? (deps.count ? await deps.count({ where: finalWhere }) : rows.length)
        : await prisma.opportunity.count({ where: finalWhere } as never);

    return {
        walkins: selectWalkins(rows, input, input.profile),
        total,
        page,
        limit,
        hasMore: page * limit < total,
    };
}
