// One-shot: snapshot the production CDN feeds into apps/web/public/
// so `FEED_SOURCE=local` can serve every job page from local JSON.
// Usage: node scripts/sync-local-feeds.mjs
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';

const WEB_ROOT = path.resolve(process.cwd());
const PUB = path.join(WEB_ROOT, 'public');
const CDN = process.env.FEED_SNAPSHOT_ORIGIN || 'https://cdn.fresherflow.in';
const ORIGIN = process.env.FEED_SNAPSHOT_SITE || 'https://www.fresherflow.in';

const files = [
    ['feeds/feed-version.json', `${CDN}/meta/feed-version.json`],
    ['feeds/feed-index.json', `${CDN}/feeds/feed-index.json`],
    ['feeds/bootstrap-feed.min.json', `${CDN}/feeds/bootstrap-feed.min.json`],
    ['feeds/government-feed.json', `${CDN}/feeds/government-feed.json`],
    ['feeds/expired-feed.min.json', `${CDN}/feeds/expired-feed.min.json`],
    ['sitemaps/sitemap-data.json', `${CDN}/sitemaps/sitemap-data.json`],
    ['companies.json', `${CDN}/companies.json`],
];

let failures = 0;
for (const [out, url] of files) {
    const dest = path.join(PUB, out);
    await mkdir(path.dirname(dest), { recursive: true });
    try {
        const res = await fetch(url, { headers: { Origin: ORIGIN } });
        if (!res.ok) {
            console.warn(`skip ${out}: HTTP ${res.status}`);
            failures++;
            continue;
        }
        const body = Buffer.from(await res.arrayBuffer());
        if (out === 'feeds/feed-version.json') {
            // Local files never change; pin the version so all cache keys stay stable.
            await writeFile(dest, JSON.stringify({ version: 'local', stable: true }));
            console.log(`ok   ${out}  (pinned to "local")`);
            continue;
        }
        await writeFile(dest, body);
        console.log(`ok   ${out}  (${(body.length / 1e6).toFixed(2)} MB)`);
    } catch (err) {
        console.warn(`skip ${out}: ${err?.message || err}`);
        failures++;
    }
}

// Per-job detail JSONs. Not every index entry has one on the CDN — detail
// pages fall back to the bootstrap feed for the rest (same as production).
try {
    const index = JSON.parse(await readFile(path.join(PUB, 'feeds/feed-index.json'), 'utf8'));
    const ids = index.opportunities.map(o => o.id).filter(Boolean);
    const jobsDir = path.join(PUB, 'jobs');
    await mkdir(jobsDir, { recursive: true });
    let ok = 0, miss = 0;
    const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, (i + 1) * n));
    for (const batch of chunk(ids, 12)) {
        await Promise.all(batch.map(async id => {
            try {
                const res = await fetch(`${CDN}/jobs/${id}.json`, { headers: { Origin: ORIGIN } });
                if (res.ok) {
                    await writeFile(path.join(jobsDir, `${id}.json`), Buffer.from(await res.arrayBuffer()));
                    ok++;
                } else miss++;
            } catch { miss++; }
        }));
    }
    console.log(`ok   jobs/*.json  (${ok} files, ${miss} absent on CDN — bootstrap fallback covers them)`);
} catch (err) {
    console.warn(`skip jobs/*.json: ${err?.message || err}`);
    failures++;
}

console.log(`\nFeeds written under ${PUB}`);
console.log('Start the app with FEED_SOURCE=local to serve pages from these files.');
process.exitCode = failures ? 1 : 0;
