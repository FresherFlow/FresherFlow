import express, { NextFunction, Request, Response, Router } from 'express';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * HTTP tests for the app-side per-route cost sink.
 *
 * This surface replaces the Vercel metric that Hobby stops retaining after 12
 * hours, so it is the only month-long attribution the project will have. Two
 * things matter more than the happy path:
 *
 *  - only the service key may write or read it, and a rejection must not reach
 *    Redis at all (an unauthenticated write would let anyone poison the burn
 *    ranking that the next incident is diagnosed from);
 *  - samples are aggregated per UTC day, not stored one per request, because
 *    the document is rewritten on every batch.
 */

const SECRET = 'test-internal-secret';

process.env.INTERNAL_API_SECRET = SECRET;
// Rate limiting must not need a live Redis; the in-memory fallback is fine and
// this file stays well under the 60/min budget.
process.env.REDIS_ENABLED = 'false';

const store = new Map<string, string>();
const get = vi.fn(async (key: string) => store.get(key) ?? null);
const setex = vi.fn(async (key: string, _ttl: number, value: string) => {
    store.set(key, value);
    return 'OK';
});

vi.mock('@fresherflow/database', () => ({
    redis: { get, setex },
    // Imported transitively by the auth middleware. This surface never reaches
    // a database, so an empty client is enough to satisfy the module graph.
    prisma: {},
}));

const RETENTION_SECONDS = 35 * 24 * 60 * 60;

function utcDay(timestamp: number): string {
    return new Date(timestamp).toISOString().slice(0, 10);
}

function documentFor(day: string): Record<string, { n: number; ms: number; cpu: number }> {
    const raw = store.get(`route_metrics:${day}`);
    return raw ? JSON.parse(raw) : {};
}

let app: express.Application;

const withKey = (): Record<string, string> => ({ 'x-api-key': SECRET });

beforeAll(async () => {
    const routeMetrics = await import('../routes/internal/routeMetrics');

    app = express();
    app.use(express.json());
    app.use('/api/internal/route-metrics', routeMetrics.default as Router);
    app.use((err: Error & { statusCode?: number }, _req: Request, res: Response, _next: NextFunction) => {
        res.status(err.statusCode || 500).json({
            error: { message: err.message, statusCode: err.statusCode || 500 },
        });
    });
});

beforeEach(() => {
    store.clear();
    get.mockClear();
    setex.mockClear();
});

describe('POST /api/internal/route-metrics: ingest', () => {
    it('aggregates a batch into one document per UTC day and returns 202', async () => {
        const at = Date.parse('2026-11-25T10:00:00.000Z');

        const res = await request(app)
            .post('/api/internal/route-metrics')
            .set(withKey())
            .send({
                samples: [
                    { route: '/jobs/[slug]', status: '200', ms: 120, cpuMs: 40, at },
                    { route: '/jobs/[slug]', status: '200', ms: 80, cpuMs: 20, at: at + 60_000 },
                    { route: '/companies/[slug]', status: '404', ms: 30, cpuMs: 5, at },
                ],
            });

        expect(res.status).toBe(202);
        expect(res.body).toEqual({ accepted: 3 });

        // One read-modify-write for the day, not one per sample.
        expect(setex).toHaveBeenCalledTimes(1);
        expect(setex).toHaveBeenCalledWith(
            'route_metrics:2026-11-25',
            RETENTION_SECONDS,
            expect.any(String),
        );

        const document = documentFor('2026-11-25');
        expect(document['/jobs/[slug]|200']).toEqual({ n: 2, ms: 200, cpu: 60 });
        expect(document['/companies/[slug]|404']).toEqual({ n: 1, ms: 30, cpu: 5 });
    });

    it('splits a batch that spans midnight into one document per day', async () => {
        const late = Date.parse('2026-11-25T23:59:00.000Z');
        const early = Date.parse('2026-11-26T00:01:00.000Z');

        const res = await request(app)
            .post('/api/internal/route-metrics')
            .set(withKey())
            .send({
                samples: [
                    { route: '/jobs', status: '200', ms: 10, cpuMs: 2, at: late },
                    { route: '/jobs', status: '200', ms: 20, cpuMs: 3, at: early },
                ],
            });

        expect(res.status).toBe(202);
        expect(setex).toHaveBeenCalledTimes(2);
        expect(documentFor('2026-11-25')['/jobs|200']).toEqual({ n: 1, ms: 10, cpu: 2 });
        expect(documentFor('2026-11-26')['/jobs|200']).toEqual({ n: 1, ms: 20, cpu: 3 });
    });

    it('adds to the existing day document instead of replacing it', async () => {
        const at = Date.parse('2026-11-25T10:00:00.000Z');
        store.set(
            'route_metrics:2026-11-25',
            JSON.stringify({ '/jobs|200': { n: 4, ms: 400, cpu: 100 } }),
        );

        const res = await request(app)
            .post('/api/internal/route-metrics')
            .set(withKey())
            .send({ samples: [{ route: '/jobs', status: '200', ms: 100, cpuMs: 25, at }] });

        expect(res.status).toBe(202);
        expect(documentFor('2026-11-25')['/jobs|200']).toEqual({ n: 5, ms: 500, cpu: 125 });
    });

    it('rejects an empty batch with 400 and writes nothing', async () => {
        const res = await request(app).post('/api/internal/route-metrics').set(withKey()).send({ samples: [] });

        expect(res.status).toBe(400);
        expect(setex).not.toHaveBeenCalled();
    });

    it('rejects a malformed sample with 400 and writes nothing', async () => {
        const res = await request(app)
            .post('/api/internal/route-metrics')
            .set(withKey())
            .send({
                samples: [
                    { route: '/jobs', status: '200', ms: 10, cpuMs: 2, at: Date.now() },
                    // Negative CPU is not a measurement; accepting it would
                    // silently subtract from the burn ranking.
                    { route: '/jobs', status: '200', ms: 10, cpuMs: -5, at: Date.now() },
                ],
            });

        expect(res.status).toBe(400);
        expect(setex).not.toHaveBeenCalled();
    });

    it('rejects a batch larger than the 200-sample cap', async () => {
        const samples = Array.from({ length: 201 }, () => ({
            route: '/jobs',
            status: '200',
            ms: 1,
            cpuMs: 1,
            at: Date.now(),
        }));

        const res = await request(app).post('/api/internal/route-metrics').set(withKey()).send({ samples });

        expect(res.status).toBe(400);
        expect(setex).not.toHaveBeenCalled();
    });
});

describe('GET /api/internal/route-metrics: read', () => {
    it('ranks routes by total CPU and sums the window totals', async () => {
        const today = utcDay(Date.now());
        const yesterday = utcDay(Date.now() - 24 * 60 * 60 * 1000);

        store.set(
            `route_metrics:${today}`,
            JSON.stringify({
                '/jobs/[slug]|200': { n: 2, ms: 200, cpu: 100 },
                '/companies|200': { n: 1, ms: 10, cpu: 5 },
            }),
        );
        store.set(
            `route_metrics:${yesterday}`,
            JSON.stringify({ '/govt|200': { n: 1, ms: 50, cpu: 300 } }),
        );

        const res = await request(app).get('/api/internal/route-metrics?days=2').set(withKey());

        expect(res.status).toBe(200);
        expect(res.body.days).toBe(2);
        expect(res.body.totals).toEqual({ invocations: 4, cpuMs: 405 });

        const rows = res.body.rows as Array<Record<string, unknown>>;
        expect(rows.map((row) => row.route)).toEqual(['/govt', '/jobs/[slug]', '/companies']);
        expect(rows[0]).toEqual({
            day: yesterday,
            route: '/govt',
            status: '200',
            count: 1,
            totalMs: 50,
            totalCpuMs: 300,
            avgMs: 50,
            avgCpuMs: 300,
        });
        // Averages are derived per route/status, not per window.
        expect(rows[1].avgCpuMs).toBe(50);
    });

    it('returns an empty ranking, not an error, when nothing has been recorded', async () => {
        const res = await request(app).get('/api/internal/route-metrics').set(withKey());

        expect(res.status).toBe(200);
        expect(res.body.days).toBe(7);
        expect(res.body.rows).toEqual([]);
        expect(res.body.totals).toEqual({ invocations: 0, cpuMs: 0 });
    });

    it('clamps the requested window to 1..35 days', async () => {
        const wide = await request(app).get('/api/internal/route-metrics?days=999').set(withKey());
        expect(wide.status).toBe(200);
        expect(wide.body.days).toBe(35);

        const narrow = await request(app).get('/api/internal/route-metrics?days=0').set(withKey());
        expect(narrow.status).toBe(200);
        expect(narrow.body.days).toBe(1);

        const nonsense = await request(app).get('/api/internal/route-metrics?days=abc').set(withKey());
        expect(nonsense.status).toBe(200);
        expect(nonsense.body.days).toBe(7);
    });

    it('survives an unreadable day document instead of failing the whole read', async () => {
        store.set(`route_metrics:${utcDay(Date.now())}`, '{not json');

        const res = await request(app).get('/api/internal/route-metrics?days=1').set(withKey());

        expect(res.status).toBe(200);
        expect(res.body.rows).toEqual([]);
    });
});

describe('service-key rejection', () => {
    const sample = { route: '/jobs', status: '200', ms: 1, cpuMs: 1, at: Date.now() };

    it('rejects an ingest with no key and does not touch Redis', async () => {
        const res = await request(app).post('/api/internal/route-metrics').send({ samples: [sample] });

        expect(res.status).toBe(401);
        expect(get).not.toHaveBeenCalled();
        expect(setex).not.toHaveBeenCalled();
    });

    it('rejects an ingest with a wrong key of the same length', async () => {
        const sameLength = SECRET.replace(/^t/, 'x');

        const res = await request(app)
            .post('/api/internal/route-metrics')
            .set({ 'x-api-key': sameLength })
            .send({ samples: [sample] });

        expect(res.status).toBe(401);
        expect(setex).not.toHaveBeenCalled();
    });

    it('rejects an ingest with a wrong key of a different length', async () => {
        const res = await request(app)
            .post('/api/internal/route-metrics')
            .set({ 'x-api-key': `${SECRET}-extra` })
            .send({ samples: [sample] });

        expect(res.status).toBe(401);
        expect(setex).not.toHaveBeenCalled();
    });

    it('rejects a read with no key', async () => {
        const res = await request(app).get('/api/internal/route-metrics?days=7');

        expect(res.status).toBe(401);
        expect(get).not.toHaveBeenCalled();
    });

    it('answers 503 when the server has no secret configured', async () => {
        delete process.env.INTERNAL_API_SECRET;

        try {
            const res = await request(app)
                .post('/api/internal/route-metrics')
                .set({ 'x-api-key': SECRET })
                .send({ samples: [sample] });

            // Misconfiguration, not a bad credential: 503 is retryable and
            // must not read as "your key is wrong".
            expect(res.status).toBe(503);
            expect(setex).not.toHaveBeenCalled();
        } finally {
            process.env.INTERNAL_API_SECRET = SECRET;
        }
    });
});
