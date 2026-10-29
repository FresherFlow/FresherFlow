import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The 2026-10-15 incident: the repository-root `.env` held live production R2
 * credentials next to a LOCAL `DATABASE_URL`, so a local dev/test run published
 * its local test database straight to the production public bucket
 * (`fresherflow-cdn`). Two fake listings were served from
 * https://fresherflow.in/jobs for about a week.
 *
 * These tests pin the two barriers that make that impossible:
 *   1. `StorageService` refuses to publish unless the process is explicitly
 *      allowed to (NODE_ENV=production, kill switch off).
 *   2. `StorageService` refuses to report success when R2 is not configured.
 */

const { sendMock } = vi.hoisted(() => ({
    sendMock: vi.fn(async (_command: unknown) => ({ Contents: [] })),
}));

vi.mock('@aws-sdk/client-s3', () => {
    class Command {
        constructor(readonly input: unknown) {}
    }
    class S3Client {
        constructor(readonly config: unknown) {}
        async send(command: unknown): Promise<unknown> {
            return sendMock(command);
        }
    }
    return {
        S3Client,
        PutObjectCommand: class extends Command {},
        GetObjectCommand: class extends Command {},
        DeleteObjectCommand: class extends Command {},
        ListObjectsV2Command: class extends Command {},
    };
});

type PutInput = {
    Bucket?: string;
    Key?: string;
    ContentType?: string;
    CacheControl?: string;
};

const ENV_KEYS = [
    'NODE_ENV',
    'CDN_PUBLISH_ENABLED',
    'R2_ENDPOINT',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET_NAME',
] as const;

const savedEnv: Record<string, string | undefined> = {};

function setEnv(values: Partial<Record<(typeof ENV_KEYS)[number], string>>): void {
    for (const key of ENV_KEYS) {
        if (key in values) {
            const value = values[key];
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
    }
}

async function loadStorage() {
    // A fresh module instance per test: StorageService caches the S3 client in a
    // static field, and one test's credentials must not leak into the next.
    vi.resetModules();
    const mod = await import('../infrastructure/services/platform/storage.service');
    return mod;
}

describe('CDN publish guard', () => {
    beforeEach(() => {
        for (const key of ENV_KEYS) savedEnv[key] = process.env[key];
        vi.clearAllMocks();
        setEnv({
            NODE_ENV: 'development',
            CDN_PUBLISH_ENABLED: undefined,
            R2_ENDPOINT: 'https://account.r2.cloudflarestorage.com',
            R2_ACCESS_KEY_ID: 'key-id',
            R2_SECRET_ACCESS_KEY: 'secret',
            R2_BUCKET_NAME: 'fresherflow-cdn',
        });
    });

    afterEach(() => {
        for (const key of ENV_KEYS) {
            const value = savedEnv[key];
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
    });

    it('refuses to upload from a non-production process, even with valid credentials', async () => {
        const { StorageService, CdnPublishBlockedError } = await loadStorage();

        await expect(StorageService.uploadToR2('feeds/feed-index.json', '{}', 'application/json')).rejects.toBeInstanceOf(
            CdnPublishBlockedError
        );

        // The point of the barrier: nothing reached the bucket.
        expect(sendMock).not.toHaveBeenCalled();
    });

    it('refuses to upload when NODE_ENV is unset', async () => {
        setEnv({ NODE_ENV: undefined });
        const { StorageService, CdnPublishBlockedError } = await loadStorage();

        await expect(StorageService.uploadToR2('feeds/feed-index.json', '{}', 'application/json')).rejects.toBeInstanceOf(
            CdnPublishBlockedError
        );
        expect(sendMock).not.toHaveBeenCalled();
    });

    it('refuses to upload when the kill switch is on, even in production', async () => {
        setEnv({ NODE_ENV: 'production', CDN_PUBLISH_ENABLED: 'false' });
        const { StorageService, CdnPublishBlockedError } = await loadStorage();

        await expect(StorageService.uploadToR2('feeds/feed-index.json', '{}', 'application/json')).rejects.toBeInstanceOf(
            CdnPublishBlockedError
        );
        expect(sendMock).not.toHaveBeenCalled();
    });

    it('names the missing condition in the error message', async () => {
        const { StorageService } = await loadStorage();

        await expect(StorageService.uploadToR2('feeds/feed-index.json', '{}', 'application/json')).rejects.toThrow(
            /NODE_ENV is "development", not "production"/
        );
    });

    it('publishes in production without any extra environment variable', async () => {
        // render.yaml already sets NODE_ENV=production on the API service, so
        // production must keep working with no new configuration at all.
        setEnv({ NODE_ENV: 'production', CDN_PUBLISH_ENABLED: undefined });
        const { StorageService } = await loadStorage();

        await StorageService.uploadToR2('feeds/feed-index.json', '{}', 'application/json');

        expect(sendMock).toHaveBeenCalledTimes(1);
    });

    it('publishes in production with CDN_PUBLISH_ENABLED=true', async () => {
        setEnv({ NODE_ENV: 'production', CDN_PUBLISH_ENABLED: 'true' });
        const { StorageService } = await loadStorage();

        await StorageService.uploadToR2('feeds/feed-index.json', '{}', 'application/json');

        expect(sendMock).toHaveBeenCalledTimes(1);
    });

    it('fails loudly when R2 is not configured instead of warning and returning', async () => {
        setEnv({
            NODE_ENV: 'production',
            R2_ENDPOINT: undefined,
            R2_ACCESS_KEY_ID: undefined,
            R2_SECRET_ACCESS_KEY: undefined,
            R2_BUCKET_NAME: undefined,
        });
        const { StorageService, R2NotConfiguredError } = await loadStorage();

        // A silent "skip" here is what let a rebuild report success while the
        // live site kept serving the previous feed.
        await expect(StorageService.uploadToR2('feeds/feed-index.json', '{}', 'application/json')).rejects.toBeInstanceOf(
            R2NotConfiguredError
        );
        expect(sendMock).not.toHaveBeenCalled();
    });

    it('guards the delete path as well', async () => {
        const { StorageService, CdnPublishBlockedError } = await loadStorage();

        await expect(StorageService.deleteFromR2('companies/acme.json')).rejects.toBeInstanceOf(CdnPublishBlockedError);
        expect(sendMock).not.toHaveBeenCalled();
    });

    it('does not let an unconfigured bucket look like an empty bucket', async () => {
        setEnv({
            NODE_ENV: 'production',
            R2_ENDPOINT: undefined,
            R2_ACCESS_KEY_ID: undefined,
            R2_SECRET_ACCESS_KEY: undefined,
            R2_BUCKET_NAME: undefined,
        });
        const { StorageService } = await loadStorage();

        // "I could not enumerate" must not read as "there is nothing to collect":
        // the caller would then treat live shards as stale and delete them.
        const listed = await StorageService.listR2Keys('companies/');
        expect(listed.truncated).toBe(true);
    });
});

describe('object Cache-Control policy', () => {
    beforeEach(() => {
        for (const key of ENV_KEYS) savedEnv[key] = process.env[key];
        setEnv({
            NODE_ENV: 'production',
            CDN_PUBLISH_ENABLED: undefined,
            R2_ENDPOINT: 'https://account.r2.cloudflarestorage.com',
            R2_ACCESS_KEY_ID: 'key-id',
            R2_SECRET_ACCESS_KEY: 'secret',
            R2_BUCKET_NAME: 'fresherflow-cdn',
        });
    });

    afterEach(() => {
        for (const key of ENV_KEYS) {
            const value = savedEnv[key];
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
    });

    it('never caches the feed version — it is the cache buster', async () => {
        const { cacheControlForKey } = await loadStorage();

        expect(cacheControlForKey('meta/feed-version.json')).toBe('no-cache, no-store, must-revalidate');
    });

    it('makes version-addressed feed artifacts cacheable', async () => {
        const { cacheControlForKey } = await loadStorage();

        for (const key of [
            'feeds/bootstrap-feed.min.json',
            'feeds/feed-index.json',
            'feeds/government-feed.json',
            'feeds/expired-feed.min.json',
            'jobs/opp-1.json',
            'companies/acme.json',
            'categories/trending.json',
            'sitemaps/sitemap-data.json',
            'meta/company-slug-history.json',
        ]) {
            expect(cacheControlForKey(key)).toMatch(/^public, max-age=\d+/);
            expect(cacheControlForKey(key)).not.toMatch(/no-store/);
        }
    });

    it('keeps the window short for objects read through a constant URL', async () => {
        const { cacheControlForKey, CACHE_CONTROL } = await loadStorage();

        // mobile reads these with a plain fetch: no ?v=, so the URL never changes.
        for (const key of [
            'meta/stats.json',
            'meta/taken-usernames.min.json',
            'skills.json',
            'education.json',
            'cities.json',
            'companies.json',
            'feeds/resources-feed.json',
        ]) {
            expect(cacheControlForKey(key)).toBe(CACHE_CONTROL.SHORT);
        }
    });

    it('keeps sitemaps shortish — they change on every publish', async () => {
        const { cacheControlForKey, CACHE_CONTROL } = await loadStorage();

        expect(cacheControlForKey('sitemaps/sitemap.xml')).toBe(CACHE_CONTROL.MEDIUM);
        expect(cacheControlForKey('sitemaps/sitemap-jobs.xml')).toBe(CACHE_CONTROL.MEDIUM);
    });

    it('uploads with the policy for the key it was given', async () => {
        const { StorageService } = await loadStorage();

        await StorageService.uploadToR2('feeds/feed-index.json', '{}', 'application/json');
        await StorageService.uploadToR2('meta/feed-version.json', '{}', 'application/json');

        const first = sendMock.mock.calls[0][0] as { input: PutInput };
        const second = sendMock.mock.calls[1][0] as { input: PutInput };

        expect(first.input.Key).toBe('feeds/feed-index.json');
        expect(first.input.CacheControl).toMatch(/^public, max-age=\d+/);
        expect(second.input.Key).toBe('meta/feed-version.json');
        expect(second.input.CacheControl).toBe('no-cache, no-store, must-revalidate');
    });
});

/**
 * `edgeWorker.js` is a hand-maintained mirror of `edgeWorker.ts` — there is no
 * build step that emits it and no script that deploys it. A Worker is only as
 * good as the copy pasted into the Cloudflare dashboard, so the two editions
 * must not drift.
 */
describe('edge Worker editions', () => {
    const workerDir = path.join(process.cwd(), 'src', 'infrastructure', 'cloudflare');

    it('declares the same protection set in both editions', async () => {
        // Explicit .ts: the classic edition sits next to the module edition as
        // `edgeWorker.js`, and the bundler resolves that file first for an
        // extensionless specifier — which evaluates the classic script and
        // throws on its top-level `addEventListener` call.
        const ts = await import('../infrastructure/cloudflare/edgeWorker.ts');

        const jsSource = readFileSync(path.join(workerDir, 'edgeWorker.js'), 'utf-8');
        const sandbox: Record<string, unknown> = {
            addEventListener: () => undefined,
            CDN_SIGNATURE_SECRET: 'test-secret',
        };
        vm.runInNewContext(jsSource, sandbox);

        expect(sandbox.PROTECTED_EXACT_PATHS).toEqual(ts.PROTECTED_EXACT_PATHS);
        expect(sandbox.PROTECTED_PATH_PREFIXES).toEqual(ts.PROTECTED_PATH_PREFIXES);
        expect(sandbox.PATH_ALIASES).toEqual(ts.PATH_ALIASES);
    });

    it('does not protect the paths the clients actually request', async () => {
        // Explicit .ts: the classic edition sits next to the module edition as
        // `edgeWorker.js`, and the bundler resolves that file first for an
        // extensionless specifier — which evaluates the classic script and
        // throws on its top-level `addEventListener` call.
        const ts = await import('../infrastructure/cloudflare/edgeWorker.ts');

        // Verified against the live deployment on 2026-10-22: these paths are
        // served unprotected. The protection set must not grow to cover them
        // until the mobile app signs the path it fetches — see the header
        // comment in edgeWorker.ts.
        const unprotected = [
            '/feeds/bootstrap-feed.min.json',
            '/feeds/feed-index.json',
            '/feeds/government-feed.json',
            '/meta/taken-usernames.min.json',
        ];
        for (const pathname of unprotected) {
            expect(ts.PROTECTED_EXACT_PATHS).not.toContain(pathname);
            expect(ts.PROTECTED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))).toBe(false);
        }

        // /categories/ IS protected, and the web app signs the path it fetches.
        expect(ts.PROTECTED_PATH_PREFIXES).toContain('/categories/');
    });

    it('accepts a signature computed over the equivalent spelling of the path', async () => {
        // Explicit .ts: the classic edition sits next to the module edition as
        // `edgeWorker.js`, and the bundler resolves that file first for an
        // extensionless specifier — which evaluates the classic script and
        // throws on its top-level `addEventListener` call.
        const ts = await import('../infrastructure/cloudflare/edgeWorker.ts');
        const secret = 'test-secret';
        const version = '1700000000000';

        // The mobile app signs the root spelling and requests the prefixed one.
        // The alias table is what makes a future protection change safe: a
        // signature over either spelling of the same artifact is accepted.
        const signature = createHmac('sha256', secret)
            .update(`/feeds/bootstrap-feed.min.json:${version}`)
            .digest('hex');

        const fetchSpy = vi
            .spyOn(globalThis, 'fetch')
            .mockResolvedValue(new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }));

        try {
            const response = await ts.default.fetch(
                {
                    method: 'GET',
                    url: `https://cdn.fresherflow.in/bootstrap-feed.min.json?v=${version}&sig=${signature}`,
                } as unknown as Request,
                { CDN_SIGNATURE_SECRET: secret }
            );

            // Not a 403: the alias matched.
            expect(response.status).toBe(200);
        } finally {
            fetchSpy.mockRestore();
        }
    });

    it('still rejects a signature computed over an unrelated path', async () => {
        // Explicit .ts: the classic edition sits next to the module edition as
        // `edgeWorker.js`, and the bundler resolves that file first for an
        // extensionless specifier — which evaluates the classic script and
        // throws on its top-level `addEventListener` call.
        const ts = await import('../infrastructure/cloudflare/edgeWorker.ts');
        const secret = 'test-secret';
        const version = '1700000000000';

        const signature = createHmac('sha256', secret).update(`/something-else.json:${version}`).digest('hex');

        const fetchSpy = vi
            .spyOn(globalThis, 'fetch')
            .mockResolvedValue(new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }));

        try {
            const response = await ts.default.fetch(
                {
                    method: 'GET',
                    url: `https://cdn.fresherflow.in/bootstrap-feed.min.json?v=${version}&sig=${signature}`,
                } as unknown as Request,
                { CDN_SIGNATURE_SECRET: secret }
            );

            expect(response.status).toBe(403);
        } finally {
            fetchSpy.mockRestore();
        }
    });
});
