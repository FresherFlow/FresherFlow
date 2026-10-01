import { describe, expect, it, vi, afterEach } from 'vitest';
import { fetchJsonWithRetry, readJsonFileSafe, safeJsonStringify } from './resilient-json.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const realFetch = globalThis.fetch;

afterEach(() => {
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
});

/** Minimal Response stand-in — the helpers only use ok/status/statusText/json(). */
function mockFetch(responses: Array<{ status: number; body?: string; throws?: boolean }>) {
    let call = 0;
    const spy = vi.fn(async () => {
        const spec = responses[Math.min(call, responses.length - 1)];
        call++;
        if (spec.throws) throw new Error('network down');
        return {
            ok: spec.status >= 200 && spec.status < 300,
            status: spec.status,
            statusText: spec.status === 404 ? 'Not Found' : 'Error',
            json: async () => {
                if (spec.body === undefined) throw new Error('Unexpected token < in JSON');
                return JSON.parse(spec.body);
            },
        } as unknown as Response;
    });
    globalThis.fetch = spy as unknown as typeof fetch;
    return spy;
}

describe('fetchJsonWithRetry', () => {
    it('returns parsed data on first success without retrying', async () => {
        const spy = mockFetch([{ status: 200, body: '{"opportunities":[{"id":"1"}]}' }]);
        const res = await fetchJsonWithRetry('https://cdn.test/feed.json', { attempts: 3, backoffMs: 1 });

        expect(res.ok).toBe(true);
        if (res.ok) expect(res.data).toEqual({ opportunities: [{ id: '1' }] });
        expect(res.attempts).toBe(1);
        expect(spy).toHaveBeenCalledTimes(1);
    });

    it('never throws on a missing JSON — the whole point of the helper', async () => {
        mockFetch([{ status: 404 }]);
        const res = await fetchJsonWithRetry('https://cdn.test/missing.json', { attempts: 3, backoffMs: 1 });

        expect(res.ok).toBe(false);
        if (!res.ok) {
            expect(res.status).toBe(404);
            expect(res.reason).toContain('404');
        }
    });

    it('fails fast on 4xx instead of burning retries on a definitive answer', async () => {
        const spy = mockFetch([{ status: 403 }]);
        const res = await fetchJsonWithRetry('https://cdn.test/denied.json', { attempts: 3, backoffMs: 1 });

        expect(res.ok).toBe(false);
        expect(spy).toHaveBeenCalledTimes(1);
    });

    it('retries a 5xx and succeeds on a later attempt', async () => {
        mockFetch([
            { status: 503 },
            { status: 200, body: '{"ok":true}' },
        ]);
        const res = await fetchJsonWithRetry('https://cdn.test/flaky.json', { attempts: 3, backoffMs: 1 });

        expect(res.ok).toBe(true);
        if (res.ok) expect(res.data).toEqual({ ok: true });
        expect(res.attempts).toBe(2);
    });

    it('retries a thrown network error', async () => {
        mockFetch([{ status: 0, throws: true }, { status: 200, body: '{"ok":1}' }]);
        const res = await fetchJsonWithRetry('https://cdn.test/net.json', { attempts: 3, backoffMs: 1 });

        expect(res.ok).toBe(true);
        expect(res.attempts).toBe(2);
    });

    it('reports failure (not a throw) after exhausting attempts on 5xx', async () => {
        const spy = mockFetch([{ status: 500 }]);
        const res = await fetchJsonWithRetry('https://cdn.test/down.json', { attempts: 3, backoffMs: 1 });

        expect(res.ok).toBe(false);
        expect(spy).toHaveBeenCalledTimes(3);
        expect(res.attempts).toBe(3);
    });

    it('treats an unparseable body as a failure rather than crashing', async () => {
        mockFetch([{ status: 200, body: undefined }]);
        const res = await fetchJsonWithRetry('https://cdn.test/html.json', { attempts: 1 });

        expect(res.ok).toBe(false);
        if (!res.ok) expect(res.reason).toContain('invalid JSON');
    });

    it('rejects a payload that parses but has the wrong shape', async () => {
        mockFetch([{ status: 200, body: '{"unexpected":true}' }]);
        const res = await fetchJsonWithRetry<unknown>('https://cdn.test/shape.json', {
            attempts: 2,
            backoffMs: 1,
            validate: (d) => Array.isArray(d),
        });

        expect(res.ok).toBe(false);
        if (!res.ok) expect(res.reason).toBe('unexpected JSON shape');
    });
});

describe('readJsonFileSafe', () => {
    it('returns null for a missing file instead of throwing', async () => {
        const missing = path.join(os.tmpdir(), `definitely-missing-${Date.now()}.json`);
        await expect(readJsonFileSafe(missing)).resolves.toBeNull();
    });

    it('returns null for malformed JSON instead of throwing', async () => {
        const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rjs-'));
        const file = path.join(dir, 'bad.json');
        await fs.writeFile(file, '{ not json', 'utf8');
        try {
            await expect(readJsonFileSafe(file)).resolves.toBeNull();
        } finally {
            await fs.rm(dir, { recursive: true, force: true });
        }
    });

    it('returns the parsed value for a valid file', async () => {
        const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rjs-'));
        const file = path.join(dir, 'good.json');
        await fs.writeFile(file, '{"a":[1,2]}', 'utf8');
        try {
            await expect(readJsonFileSafe(file)).resolves.toEqual({ a: [1, 2] });
        } finally {
            await fs.rm(dir, { recursive: true, force: true });
        }
    });
});

describe('safeJsonStringify', () => {
    it('serialises normal values unchanged', () => {
        expect(safeJsonStringify({ a: 1 })).toBe('{"a":1}');
    });

    it('survives circular references instead of throwing', () => {
        const node: Record<string, unknown> = { name: 'root' };
        node.self = node;
        expect(() => safeJsonStringify(node)).not.toThrow();
        expect(safeJsonStringify(node)).toContain('[Circular]');
    });
});