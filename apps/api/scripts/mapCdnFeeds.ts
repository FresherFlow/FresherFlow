/**
 * Generates every feed the API publishes and writes a report of what each
 * produced: object key, record count, byte size, and whether anything in
 * apps/web or apps/mobile actually reads it.
 *
 * This is the inventory behind docs/cdn-feed-map.md. Run from apps/api with
 * DATABASE_URL available:
 *   pnpm tsx scripts/mapCdnFeeds.ts
 *
 * Writes the report to stdout and dumps each generated feed next to itself
 * under .feed-map/ so the payloads can be inspected without curl.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import prisma from '../src/infrastructure/database/prisma';
import { FeedGeneratorService } from '../src/infrastructure/services/opportunity/feedGenerator.service';

const OUT_DIR = path.join(process.cwd(), '.feed-map');

interface Row {
    key: string;
    generator: string;
    count: number;
    bytes: number;
    reader: string;
    note: string;
}

function countOf(v: unknown): number {
    if (!v || typeof v !== 'object') return 0;
    const rec = v as Record<string, unknown>;
    if (Array.isArray(rec.opportunities)) return rec.opportunities.length;
    if (Array.isArray(rec.deliveries)) return rec.deliveries.length;
    if (Array.isArray(rec.companies)) return rec.companies.length;
    if (Array.isArray(rec.skills)) return rec.skills.length;
    if (Array.isArray(rec.sitemaps)) return rec.sitemaps.length;
    if (Array.isArray(rec.urls)) return rec.urls.length;
    if (Array.isArray(rec)) return (rec as unknown[]).length;
    return typeof rec.count === 'number' ? rec.count : 1;
}

async function dump(name: string, data: unknown) {
    const body = typeof data === 'string' ? data : JSON.stringify(data);
    const bytes = Buffer.byteLength(body, 'utf8');
    await fs.mkdir(OUT_DIR, { recursive: true });
    await fs.writeFile(path.join(OUT_DIR, name), body, 'utf8');
    return { bytes, body };
}

async function main() {
    await fs.mkdir(OUT_DIR, { recursive: true });
    const rows: Row[] = [];

    const push = async (
        key: string,
        generator: string,
        data: unknown,
        reader: string,
        note: string,
        file: string
    ) => {
        try {
            const { bytes } = await dump(file, data);
            rows.push({ key, generator, count: countOf(data), bytes, reader, note });
        } catch (e) {
            rows.push({
                key,
                generator,
                count: -1,
                bytes: 0,
                reader,
                note: `FAILED: ${e instanceof Error ? e.message : String(e)}`,
            });
        }
    };

    await push(
        'feeds/bootstrap-feed.min.json', 'generateBootstrapFeed',
        await FeedGeneratorService.generateBootstrapFeed(),
        'web cdnFeed._fetchBootstrapFeed (homepage, all feeds)',
        'The heavy superset. mobile syncModule.', 'bootstrap-feed.min.json');

    await push(
        'feeds/feed-index.json', 'generateFeedIndex',
        await FeedGeneratorService.generateFeedIndex(),
        'web cdnFeed._fetchFeedIndex (preferred path)',
        'Light projection of the bootstrap feed. Includes driveDetails.',
        'feed-index.json');

    await push(
        'feeds/government-feed.json', 'generateGovernmentFeed',
        await FeedGeneratorService.generateGovernmentFeed(),
        'web /govt routes, [city] generateStaticParams',
        'Government listings only.', 'government-feed.json');

    await push(
        'feeds/walkins-feed.json', 'generateWalkinFeed',
        await FeedGeneratorService.generateWalkinFeed(),
        'NOTHING - no web or mobile reader',
        'DEAD PAYLOAD. Written on every refresh, never fetched. ' +
        'The walk-in page reads feed-index.json instead.',
        'walkins-feed.json');

    await push(
        'feeds/expired-feed.min.json', 'generateExpiredFeed',
        await FeedGeneratorService.generateExpiredFeed(),
        'web detail pages as a 404 fallback',
        'Recently expired, so a live URL does not hard-fail.', 'expired-feed.min.json');

    await push(
        'feeds/resources-feed.json', 'generateResourcesFeed',
        await FeedGeneratorService.generateResourcesFeed(),
        'web /resources',
        'Community resource collections.', 'resources-feed.json');

    await push(
        'feeds/links.min.json', 'generateLinksFeed',
        await FeedGeneratorService.generateLinksFeed(),
        'web internal-link graph',
        '', 'links.min.json');

    await push(
        'feeds/syllabus.json', 'metadata.service.appendOpportunityMetadata',
        await FeedGeneratorService.generateSitemapData(),
        'web syllabus/curriculum pages',
        'Single owner. Previously also written to the bucket root as ' +
        'syllabus.json, which duplicated the dataset.',
        'syllabus.json');

    await push(
        'meta/feed-version.json', 'staticFeed (written on every refresh)',
        { version: Date.now(), stable: true },
        'web cdnFeed.fetchFeedVersion',
        'Cache-buster appended as ?v= and a CDN signature input.', 'feed-version.json');

    await push(
        'meta/stats.json', 'generateStats',
        await FeedGeneratorService.generateStats(),
        'web homepage counters, /api/stats',
        'Includes the walk-in count.', 'stats.json');

    await push(
        'meta/taken-usernames.min.json', 'generateTakenUsernames',
        await FeedGeneratorService.generateTakenUsernames(),
        'web username availability check',
        'Deny-list: a name is unavailable if it is in here.', 'taken-usernames.min.json');

    await push(
        'meta/generated-hubs.json', 'staticFeed hub metadata',
        { hubs: ['/jobs', '/jobs/internships', '/jobs/walkins', '/govt'] },
        'web hub pages',
        'NOTE: lists /jobs/walkins, which 301s to /drives - a different ' +
        'hub from /drives/walk-in.', 'generated-hubs.json');

    // Sitemaps: generated as XML strings, reported as raw bytes.
    for (const [file, key, note] of [
        ['sitemap.xml', 'sitemaps/sitemap.xml', 'Sitemap index.'],
        ['sitemap-index.xml', 'sitemaps/sitemap-index.xml', ''],
        ['sitemap-jobs.xml', 'sitemaps/sitemap-jobs.xml', ''],
        ['sitemap-walkins.xml', 'sitemaps/sitemap-walkins.xml',
            'Entries point at /jobs/{slug}. The hub it is filed under is /jobs/walkins, which redirects.'],
        ['sitemap-govt.xml', 'sitemaps/sitemap-govt.xml', ''],
        ['sitemap-companies.xml', 'sitemaps/sitemap-companies.xml', ''],
        ['sitemap-locations.xml', 'sitemaps/sitemap-locations.xml', ''],
        ['sitemap-roles.xml', 'sitemaps/sitemap-roles.xml', ''],
        ['sitemap-skills.xml', 'sitemaps/sitemap-skills.xml', ''],
        ['sitemap-batches.xml', 'sitemaps/sitemap-batches.xml', ''],
        ['sitemap-data.json', 'sitemaps/sitemap-data.json', 'URL lists per section, used by generateStaticParams.'],
    ] as const) {
        let body = '';
        try {
            if (file === 'sitemap-data.json') {
                const d = await FeedGeneratorService.generateSitemapData();
                body = JSON.stringify(d);
                rows.push({ key, generator: 'generateSitemapData', count: countOf(d), bytes: Buffer.byteLength(body), reader: 'web generateStaticParams', note });
            } else {
                body = await FeedGeneratorService.generateSitemap();
                rows.push({ key, generator: 'generateSitemap', count: 1, bytes: Buffer.byteLength(body), reader: 'search engines', note });
            }
            await dump(file, body);
        } catch (e) {
            rows.push({ key, generator: 'generateSitemap', count: -1, bytes: 0, reader: 'search engines', note: `FAILED: ${e instanceof Error ? e.message : String(e)}` });
        }
    }

    // Per-opportunity shard: one object per published job.
    const shardCount = await prisma.opportunity.count({
        where: { status: 'PUBLISHED', deletedAt: null },
    });
    rows.push({
        key: 'jobs/{id}.json',
        generator: 'uploadSingleJob (fired per publish, not per refresh)',
        count: shardCount,
        bytes: 0,
        reader: 'web detail page + split-view pane (one object each)',
        note: 'One R2 object per opportunity. This is the object count, not a byte total.',
    });

    // Metadata written at the R2 ROOT (no directory prefix). These are not
    // leftovers: web runtimeConfig and mobile api.ts both read them from the
    // CDN root, and no folder copy exists.
    for (const [key, note] of [
        ['companies.json', 'Company directory. Read by web COMPANIES_METADATA_URL and mobile.'],
        ['cities.json', 'City directory. Read by web CITIES_METADATA_URL and mobile.'],
        ['skills.json', 'Skill taxonomy. Read by web SKILLS_METADATA_URL and mobile.'],
        ['education.json', 'Degree/course taxonomy. Read by web EDUCATION_METADATA_URL and mobile.'],
    ] as const) {
        rows.push({ key, generator: 'metadata.service', count: -1, bytes: -1, reader: 'web taxonomy pages', note });
    }

    const report = [
        '# API -> CDN feed map',
        '',
        `Generated by scripts/mapCdnFeeds.ts at ${new Date().toISOString()}`,
        '',
        '| Object key | Generator | Records | Bytes | Read by | Notes |',
        '|---|---|---:|---:|---|---|',
        ...rows.map((r) =>
            `| \`${r.key}\` | \`${r.generator}\` | ${r.count} | ${r.bytes < 0 ? 'n/a' : r.bytes.toLocaleString()} | ${r.reader} | ${r.note} |`
        ),
    ].join('\n');

    await fs.writeFile(path.join(OUT_DIR, 'REPORT.md'), report, 'utf8');
    console.log(report);
    console.log(`\n\nDumped ${rows.length} artifacts to ${OUT_DIR}`);
}

main()
    .catch((e) => { console.error('failed:', e); process.exitCode = 1; })
    .finally(async () => { await prisma.$disconnect(); process.exit(process.exitCode ?? 0); });
