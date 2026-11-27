import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { browseWalkins, selectWalkins, walkinsQuerySchema } from '../application/opportunity/browseWalkins';

const row = (overrides: Record<string, unknown> = {}) => ({
    id: 'id-1',
    slug: 'drive-1',
    title: 'Graduate Engineer',
    company: 'Acme',
    locations: ['Hyderabad'],
    recruitmentMethod: 'WALK_IN',
    driveDetails: {
        dates: [new Date(Date.now() + 86400000)],
        dateRange: null,
        timeRange: '10:00 AM - 1:00 PM',
        reportingTime: '09:30 AM',
        venueAddress: 'HITEC City, Hyderabad',
        venueLink: null,
        city: 'Hyderabad',
        landmark: null,
        clusterName: null,
        latitude: 17.4474,
        longitude: 78.3762,
        transitInfo: null,
        requiredDocuments: ['Resume'],
        contactPerson: null,
        contactPhone: null,
        selectionProcess: null,
    },
    ...overrides,
});

describe('browseWalkins', () => {
    it('rejects half-specified coordinates', () => {
        expect(walkinsQuerySchema.safeParse({ latitude: 17.4 }).success).toBe(false);
        expect(walkinsQuerySchema.safeParse({ longitude: 78.4 }).success).toBe(false);
        expect(walkinsQuerySchema.safeParse({ latitude: 17.4, longitude: 78.4 }).success).toBe(true);
    });

    it('filters city by driveCity, not only locations', async () => {
        let capturedWhere: Record<string, unknown> = {};
        await browseWalkins(
            { city: 'Hyderabad' },
            {
                findMany: async (args: { where: Record<string, unknown> }) => {
                    capturedWhere = args.where;
                    return [];
                },
            },
        );
        const clauses = capturedWhere.AND as Array<Record<string, unknown>>;
        expect(clauses.some((clause) => clause.driveCity === 'Hyderabad')).toBe(true);
    });

    it('ranks a co-located drive above a city-fallback drive', () => {
        const ranked = selectWalkins(
            [row({ id: 'fallback', driveDetails: { ...row().driveDetails, latitude: null, longitude: null } }), row({ id: 'exact' })],
            { city: 'Hyderabad', latitude: 17.4475, longitude: 78.3763 },
        );
        expect(ranked.map((r) => r.id)).toEqual(['exact', 'fallback']);
        expect(ranked[1].distanceKm).toBeNull();
    });

    it('public walkins route is rate limited', () => {
        const source = readFileSync(resolve(__dirname, '../routes/public/walkins.ts'), 'utf8');
        expect(source).toContain('createRateLimiter');
    });

    it('internal walkins route is mounted behind mcpSurfaceAuth', () => {
        const source = readFileSync(resolve(__dirname, '../index.ts'), 'utf8');
        expect(source).toContain("'/api/internal/mcp'");
        expect(source).toContain('mcpSurfaceAuth');
        expect(source).toContain('internalMcpWalkinsRoutes');
    });

    it('desktop walk-in date filter offers next30Days', () => {
        const source = readFileSync(
            resolve(__dirname, '../../../../apps/web/src/features/jobs/components/JobFilterBar.tsx'),
            'utf8',
        );
        expect(source).toContain("value: 'next30Days'");
    });
});
