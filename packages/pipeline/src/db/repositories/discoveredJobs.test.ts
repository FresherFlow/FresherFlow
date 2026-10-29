import { describe, expect, it, vi, beforeEach } from 'vitest';

const { query } = vi.hoisted(() => ({ query: vi.fn() }));

// The repository talks to Postgres through a raw pg Pool. Mock it so the
// test asserts the SQL contract instead of needing a live database.
vi.mock('../pool.js', () => ({
    pool: { query },
    hasDb: true,
}));

import { fetchUnprocessedFromSupabase, upsertJobs } from './discoveredJobs.js';

const WALK_IN_COLUMNS = [
    'venue_address',
    'cluster_name',
    'latitude',
    'longitude',
    'walkin_date',
    'walkin_time',
    'reporting_time',
    'contact_person',
    'contact_phone',
    'required_docs',
];

describe('discovered_jobs walk-in round trip', () => {
    beforeEach(() => {
        query.mockReset();
    });

    it('writes the walk-in columns when a drive is upserted', async () => {
        query.mockResolvedValue({ rows: [{ id: 'row-1' }], rowCount: 1 });

        await upsertJobs(
            [
                {
                    sourceType: 'AGGREGATOR',
                    source: 'job4freshers',
                    title: 'Walk-in Drive',
                    company: 'Acme',
                    applyLink: 'https://job4freshers.co.in/acme-walk-in/',
                    venueAddress: 'Building 1, Gachibowli, Hyderabad',
                    walkinDate: '2026-10-25',
                    walkinTime: '10:00 AM - 1:00 PM',
                    reportingTime: '9:30 AM',
                    contactPerson: 'HR Desk',
                    contactPhone: '+919000000000',
                    requiredDocs: '["Resume"]',
                    clusterName: 'Gachibowli',
                    latitude: 17.44,
                    longitude: 78.37,
                },
            ],
            'run-1'
        );

        expect(query).toHaveBeenCalled();
        const [sql, params] = query.mock.calls[0];
        for (const column of WALK_IN_COLUMNS) {
            expect(sql).toContain(column);
        }
        expect(params).toContain('Building 1, Gachibowli, Hyderabad');
        expect(params).toContain('2026-10-25');
    });

    it('reads the walk-in columns back, so a drive does not lose its venue', async () => {
        query.mockResolvedValue({
            rows: [
                {
                    id: 'row-1',
                    apply_link: 'https://job4freshers.co.in/acme-walk-in/',
                    company: 'Acme',
                    title: 'Walk-in Drive',
                    status: 'PENDING',
                    venue_address: 'Building 1, Gachibowli, Hyderabad',
                    walkin_date: '2026-10-25',
                    walkin_time: '10:00 AM - 1:00 PM',
                    reporting_time: '9:30 AM',
                    contact_person: 'HR Desk',
                    contact_phone: '+919000000000',
                    required_docs: '["Resume"]',
                    cluster_name: 'Gachibowli',
                    latitude: 17.44,
                    longitude: 78.37,
                },
            ],
            rowCount: 1,
        });

        const rows = await fetchUnprocessedFromSupabase(10);

        const [sql] = query.mock.calls[0];
        for (const column of WALK_IN_COLUMNS) {
            expect(sql).toContain(column);
        }

        expect(rows).toHaveLength(1);
        expect(rows[0].venue_address).toBe('Building 1, Gachibowli, Hyderabad');
        expect(rows[0].walkin_date).toBe('2026-10-25');
        expect(rows[0].reporting_time).toBe('9:30 AM');
        expect(rows[0].required_docs).toBe('["Resume"]');
        expect(rows[0].cluster_name).toBe('Gachibowli');
        expect(rows[0].latitude).toBe(17.44);
        expect(rows[0].longitude).toBe(78.37);
    });
});
