import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { logger } from '@fresherflow/utils';

/**
 * Thrown when this process is not allowed to write to the public CDN bucket.
 *
 * This is the incident barrier. On 2026-10-15 the repository-root `.env` held
 * LIVE PRODUCTION R2 credentials (`R2_*`, bucket `fresherflow-cdn`) next to a
 * LOCAL `DATABASE_URL`, so a local dev/test run published its local test
 * database straight to the production public bucket: two fake listings
 * ("Trace Pending A" @ Acme Trace Systems, "Verification Engineer" @ Acme
 * Verification Labs) were served from https://fresherflow.in/jobs for ~7 days.
 *
 * The credentials were never in git — the failure was that a local environment
 * had no barrier between "my local test DB" and "the production public
 * bucket". This error is that barrier: it is thrown instead of letting the
 * upload quietly succeed.
 */
export class CdnPublishBlockedError extends Error {
    readonly code = 'CDN_PUBLISH_BLOCKED';

    constructor(message: string) {
        super(message);
        this.name = 'CdnPublishBlockedError';
    }
}

/**
 * Thrown when this process is allowed to publish but R2 is not configured.
 *
 * Previously this was a `logger.warn` + `return`, so a feed rebuild with
 * missing credentials "succeeded", wrote local files, uploaded nothing, and
 * the admin button reported success while the live site kept serving the old
 * feed. A missing bucket is a misconfiguration and must be loud.
 */
export class R2NotConfiguredError extends Error {
    readonly code = 'R2_NOT_CONFIGURED';

    constructor(message: string) {
        super(message);
        this.name = 'R2NotConfiguredError';
    }
}

/**
 * The outcome of the publish guard.
 */
export interface CdnPublishPolicy {
    /** True only when this process may write to the public CDN bucket. */
    allowed: boolean;
    /** Always populated — the reason is what the operator reads in the log. */
    reason: string;
}

const FALSY_FLAGS = ['false', '0', 'no', 'off'];

/**
 * Decides whether THIS PROCESS may write to the public CDN bucket.
 *
 * The rule is deliberately environment-shaped rather than flag-shaped:
 *
 *   - Publishing requires `NODE_ENV=production`. A local `pnpm dev`, a test
 *     run, or a script on a laptop can therefore never overwrite the live
 *     public feed, no matter which credentials happen to sit in its `.env`.
 *   - `CDN_PUBLISH_ENABLED=false` is an emergency kill switch: it turns
 *     publishing off everywhere, including production.
 *   - Any other value of `CDN_PUBLISH_ENABLED` (including unset) leaves the
 *     `NODE_ENV=production` requirement in force.
 *
 * Production needs NO environment change: `render.yaml` already sets
 * `NODE_ENV=production` on `fresherflow-api` and `fresherflow-worker`.
 * `CDN_PUBLISH_ENABLED=true` is accepted and documented as the explicit form
 * of the same thing, so an operator can set it for clarity, but it is not
 * required — making it required would silently disable publishing in a
 * deploy that never had it.
 */
export function resolveCdnPublishPolicy(): CdnPublishPolicy {
    const nodeEnv = (process.env.NODE_ENV || '').trim().toLowerCase();
    const flag = (process.env.CDN_PUBLISH_ENABLED || '').trim().toLowerCase();

    if (FALSY_FLAGS.includes(flag)) {
        return {
            allowed: false,
            reason: 'CDN_PUBLISH_ENABLED is set to a falsy value (emergency kill switch)',
        };
    }

    if (nodeEnv !== 'production') {
        return {
            allowed: false,
            reason: `NODE_ENV is ${nodeEnv ? `"${nodeEnv}"` : 'unset'}, not "production"`,
        };
    }

    return {
        allowed: true,
        reason: 'NODE_ENV is "production" and CDN_PUBLISH_ENABLED is not disabled',
    };
}

/**
 * Cache-Control values used for the objects this service uploads.
 *
 * Before this existed every object was uploaded with `CacheControl: undefined`,
 * so Cloudflare served them as `CF-Cache-Status: DYNAMIC` — every request
 * reached the origin and the "versioned URL" scheme bought nothing. The
 * version manifest was the only exception (`no-cache, no-store, must-revalidate`).
 */
export const CACHE_CONTROL = {
    /** The cache buster. Must never be cached by anything, ever. */
    NO_STORE: 'no-cache, no-store, must-revalidate',
    /**
     * Version-addressed feed artifacts. Every reader appends `?v=<version>`,
     * and the version changes on every publish, so the URL changes exactly
     * when the content changes. A one-hour TTL is enough to absorb the
     * traffic (the hit rate does not depend on the TTL being long — a new
     * publish means a new URL and therefore a new cache entry) and it bounds
     * the blast radius of a publish/upload race to about an hour instead of
     * the year an `immutable` year-long TTL would allow.
     */
    VERSIONED: 'public, max-age=3600, stale-while-revalidate=600',
    /**
     * Objects that are ALSO read through a constant URL (no `?v=` token) by
     * at least one client — mobile reads `skills.json`, `education.json`,
     * `cities.json`, `companies.json`, `feeds/resources-feed.json` and
     * `meta/stats.json` with a plain fetch. A long TTL on those would serve
     * the same bytes indefinitely, so they get a short one.
     */
    SHORT: 'public, max-age=300, stale-while-revalidate=600',
    /** Sitemaps: read unversioned by crawlers and by the web sitemap route. */
    MEDIUM: 'public, max-age=900, stale-while-revalidate=3600',
    /** Long-lived static assets (OG images). */
    STATIC: 'public, max-age=86400, stale-while-revalidate=604800',
} as const;

/**
 * Derives the Cache-Control for an object key.
 *
 * The decision lives here, inside the storage service, on purpose: the feed
 * publisher calls `uploadToR2` from 30+ places and each of them would
 * otherwise have to repeat the same per-key policy.
 *
 * Key patterns and their readers:
 *
 * | Key | Policy | Who reads it, and how |
 * |---|---|---|
 * | `meta/feed-version.json` | NO_STORE | every client, unversioned — it is the cache buster |
 * | `meta/company-slug-history.json` | VERSIONED | web, `?v=` |
 * | `meta/stats.json` | SHORT | web nav-counts route, unversioned |
 * | `meta/taken-usernames.min.json` | SHORT | mobile, `?t=` (timestamp mode) |
 * | `meta/generated-hubs.json` | SHORT | API only |
 * | `feeds/bootstrap-feed.min.json` | VERSIONED | web `?v=`, mobile `?v=` |
 * | `feeds/feed-index.json` | VERSIONED | web, `?v=` |
 * | `feeds/government-feed.json` | VERSIONED | web `?v=`, mobile `?v=` |
 * | `feeds/expired-feed.min.json` | VERSIONED | web `?v=`, mobile `?t=` |
 * | `feeds/resources-feed.json` | SHORT | mobile, plain fetch (constant URL) |
 * | `feeds/links.min.json`, `feeds/walkins-feed.json` | SHORT | no reader today |
 * | `feeds/syllabus.json` | SHORT | API only |
 * | `jobs/{id}.json` | VERSIONED | web, `?v=` |
 * | `companies/{slug}.json` | VERSIONED | web, `?v=` |
 * | `categories/{id}.json` | VERSIONED | web, `?v=` |
 * | `sitemaps/sitemap-data.json` | VERSIONED | web, `?v=` |
 * | `sitemaps/*.xml` | MEDIUM | crawlers + web sitemap route, unversioned |
 * | `companies.json`, `skills.json`, `education.json`, `cities.json` | SHORT | mobile + parser scripts, unversioned |
 * | `profiles/{username}.json` | SHORT | public profile payload, unversioned |
 * | `og/**.png` | STATIC | OG images |
 */
export function cacheControlForKey(key: string): string {
    const normalized = key.replace(/^\/+/, '');

    // The cache buster. Everything else is addressed by `?v=<version>`, and
    // this file is what changes that version — caching it pins every reader
    // to a stale feed.
    if (normalized === 'meta/feed-version.json') return CACHE_CONTROL.NO_STORE;

    // Version-addressed artifacts.
    if (normalized === 'meta/company-slug-history.json') return CACHE_CONTROL.VERSIONED;
    if (normalized === 'sitemaps/sitemap-data.json') return CACHE_CONTROL.VERSIONED;
    if (normalized.startsWith('jobs/')) return CACHE_CONTROL.VERSIONED;
    if (normalized.startsWith('companies/')) return CACHE_CONTROL.VERSIONED;
    if (normalized.startsWith('categories/')) return CACHE_CONTROL.VERSIONED;

    if (normalized.startsWith('feeds/')) {
        // Read through a constant URL by at least one client.
        if (
            normalized === 'feeds/resources-feed.json' ||
            normalized === 'feeds/syllabus.json' ||
            normalized === 'feeds/links.min.json' ||
            normalized === 'feeds/walkins-feed.json'
        ) {
            return CACHE_CONTROL.SHORT;
        }
        return CACHE_CONTROL.VERSIONED;
    }

    // Sitemaps change on every publish and are crawled unversioned.
    if (normalized.startsWith('sitemaps/')) return CACHE_CONTROL.MEDIUM;

    // The remaining meta files (stats, taken usernames, generated hubs).
    if (normalized.startsWith('meta/')) return CACHE_CONTROL.SHORT;

    // Root-level metadata: mobile and the parser scripts read these with a
    // plain, unversioned fetch.
    if (
        normalized === 'companies.json' ||
        normalized === 'skills.json' ||
        normalized === 'education.json' ||
        normalized === 'cities.json'
    ) {
        return CACHE_CONTROL.SHORT;
    }

    // Public profile payloads change whenever the profile changes.
    if (normalized.startsWith('profiles/')) return CACHE_CONTROL.SHORT;

    // OG images and other static assets.
    if (normalized.startsWith('og/')) return CACHE_CONTROL.STATIC;

    // Unknown key: keep the window short. A wrong long TTL is a stale public
    // artifact nobody notices; a short TTL only costs an origin read.
    return CACHE_CONTROL.SHORT;
}

export class StorageService {
    private static readonly PUBLIC_ROOT = path.join(process.cwd(), 'public');
    private static s3ClientInstance: S3Client | null = null;

    static getPublicRoot(): string {
        return this.PUBLIC_ROOT;
    }

    private static getS3Client(): S3Client | null {
        if (this.s3ClientInstance) return this.s3ClientInstance;

        const endpoint = process.env.R2_ENDPOINT;
        const accessKeyId = process.env.R2_ACCESS_KEY_ID;
        const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

        if (!endpoint || !accessKeyId || !secretAccessKey) {
            return null;
        }

        this.s3ClientInstance = new S3Client({
            region: 'auto',
            endpoint,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
            maxAttempts: 2,
        });

        return this.s3ClientInstance;
    }

    /**
     * Refuses the write when this process may not publish to the public CDN.
     *
     * Checked BEFORE the credential check on purpose. A local developer with
     * production credentials in their `.env` must be told "you are not
     * allowed to publish from here", not "R2 is not configured" — the first
     * is the rule they have to know about, the second is a detail of the
     * machine they are standing on.
     */
    private static assertPublishAllowed(operation: string): void {
        const policy = resolveCdnPublishPolicy();
        if (policy.allowed) return;

        throw new CdnPublishBlockedError(
            `[StorageService] Refusing to ${operation} on the public CDN: ${policy.reason}. ` +
                'Publishing to the live public bucket is restricted to production deployments so that a ' +
                'local or test database can never overwrite the public feed. If this is a publishing ' +
                'deployment, set NODE_ENV=production (and leave CDN_PUBLISH_ENABLED unset or "true"). ' +
                'For local testing, point R2_ENDPOINT / R2_BUCKET_NAME at a throwaway bucket and run ' +
                'the API with NODE_ENV=production.'
        );
    }

    /**
     * Returns the client and bucket, or throws when R2 is not fully configured.
     *
     * A missing bucket used to be a warning and a `return`, which made a feed
     * rebuild "succeed" while uploading nothing.
     */
    private static requireR2(operation: string): { s3: S3Client; bucketName: string } {
        const bucketName = (process.env.R2_BUCKET_NAME || '').trim();
        const s3 = this.getS3Client();

        if (!s3 || !bucketName) {
            throw new R2NotConfiguredError(
                `[StorageService] Cannot ${operation}: R2 is not configured. ` +
                    'Set R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET_NAME. ' +
                    'A missing bucket is a misconfiguration — it is not a reason to report success.'
            );
        }

        return { s3, bucketName };
    }

    /**
     * Rejects keys that could write outside the intended prefix.
     */
    private static assertValidKey(key: string, operation: string): void {
        const hasControlChars = Array.from(key).some((char) => {
            const code = char.charCodeAt(0);
            return code < 0x20 || code === 0x7f;
        });

        if (!key || key.startsWith('/') || key.includes('..') || hasControlChars) {
            logger.error(`[StorageService] Refusing to ${operation} with an invalid R2 key: ${JSON.stringify(key)}`);
            throw new Error(`[StorageService] Refusing to ${operation} with an invalid R2 key`);
        }
    }

    static ensureDirectoryExists(dirPath: string): void {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    static writeLocalFile(filePath: string, content: string): void {
        const dir = path.dirname(filePath);
        this.ensureDirectoryExists(dir);
        fs.writeFileSync(filePath, content);
    }

    static readLocalFile(filePath: string): string | null {
        if (!fs.existsSync(filePath)) return null;
        return fs.readFileSync(filePath, 'utf-8');
    }

    /**
     * Uploads one object to the CDN bucket.
     *
     * Fails loudly in both of the two ways it used to fail quietly:
     *
     *   - This process is not allowed to publish (not `NODE_ENV=production`, or
     *     the kill switch is on) → `CdnPublishBlockedError`.
     *   - R2 is not configured → `R2NotConfiguredError`.
     *
     * A genuine upload failure still rethrows, so the feed rebuild that
     * triggered it fails with it.
     */
    static async uploadToR2(key: string, body: string, contentType: string): Promise<void> {
        this.assertValidKey(key, 'upload');
        this.assertPublishAllowed(`upload "${key}"`);
        const { s3, bucketName } = this.requireR2(`upload "${key}"`);

        try {
            await s3.send(
                new PutObjectCommand({
                    Bucket: bucketName,
                    Key: key,
                    Body: body,
                    ContentType: contentType,
                    // Per-key policy, derived from the object key. See
                    // `cacheControlForKey` for the table and the reasoning.
                    CacheControl: cacheControlForKey(key),
                })
            );
        } catch (error) {
            // Rethrow so a failed upload fails the feed regeneration that
            // triggered it. Swallowing here meant refresh() "succeeded" while
            // the CDN kept serving the previous version.
            logger.error(`[StorageService] Failed to upload ${key} to R2`, error);
            throw error;
        }
    }

    static async fetchFromR2(key: string): Promise<string | null> {
        const bucketName = (process.env.R2_BUCKET_NAME || '').trim();
        const s3 = this.getS3Client();

        if (!s3 || !bucketName) {
            // Reads stay non-fatal: "no such object" and "R2 not configured"
            // both mean "not available", and callers fall back to a local
            // file. The write path is where a missing bucket must be loud.
            logger.warn(`[StorageService] Cannot read ${key} from R2 - R2 credentials not fully configured in environment.`);
            return null;
        }

        try {
            const response = await s3.send(
                new GetObjectCommand({
                    Bucket: bucketName,
                    Key: key,
                })
            );
            if (!response.Body) return null;
            return await response.Body.transformToString();
        } catch (error: unknown) {
            const err = error as Error & { $metadata?: { httpStatusCode?: number } };
            if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
                return null;
            }
            logger.error(`[StorageService] Failed to fetch ${key} from R2`, error);
            return null;
        }
    }

    /**
     * Deletes exactly one object. There is deliberately no prefix/bulk variant:
     * every caller must name the single key it intends to remove, so a
     * regenerated shard set can never turn into a bucket-wide wipe.
     *
     * Throws on failure so the caller can abort its garbage collection rather
     * than reporting success while stale objects survive.
     *
     * A delete is a write to the public bucket, so it is behind the same
     * publish guard as an upload.
     */
    static async deleteFromR2(key: string): Promise<void> {
        if (!key || key.includes('*') || key.endsWith('/')) {
            logger.error(`[StorageService] Refusing to delete malformed R2 key: ${key}`);
            throw new Error('Refusing to delete a non-specific R2 key');
        }

        this.assertPublishAllowed(`delete "${key}"`);
        const { s3, bucketName } = this.requireR2(`delete "${key}"`);

        await s3.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));
    }

    /**
     * Lists every object key under a prefix. Used to compute the *stale set*
     * for garbage collection (`bucket keys − keys just written`), never to
     * delete anything by itself.
     *
     * `maxKeys` is a hard stop so a runaway prefix cannot page the whole
     * bucket. Callers treat a truncated result as "do not garbage collect":
     * an incomplete list would make real shards look stale.
     *
     * Returns `{ keys, truncated }`.
     */
    static async listR2Keys(prefix: string, maxKeys = 20000): Promise<{ keys: string[]; truncated: boolean }> {
        const bucketName = (process.env.R2_BUCKET_NAME || '').trim();
        const s3 = this.getS3Client();

        if (!s3 || !bucketName) {
            // "I could not enumerate the bucket" is not "there is nothing to
            // collect". Report it as truncated so the caller skips collection
            // instead of treating an unreadable bucket as an empty one.
            logger.warn(`[StorageService] Cannot list R2 keys under ${prefix} - R2 credentials not fully configured in environment.`);
            return { keys: [], truncated: true };
        }

        const keys: string[] = [];
        let continuationToken: string | undefined;

        try {
            do {
                const response = await s3.send(new ListObjectsV2Command({
                    Bucket: bucketName,
                    Prefix: prefix,
                    ContinuationToken: continuationToken,
                    MaxKeys: 1000,
                }));

                for (const obj of response.Contents || []) {
                    if (obj.Key) keys.push(obj.Key);
                }

                if (keys.length >= maxKeys) {
                    return { keys, truncated: true };
                }

                continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
            } while (continuationToken);
        } catch (error) {
            // A failed list must not be read as "nothing to collect".
            logger.error(`[StorageService] Failed to list R2 keys under ${prefix}`, error);
            return { keys: [], truncated: true };
        }

        return { keys, truncated: false };
    }
}
