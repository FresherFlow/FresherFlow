import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

// ⚠️  ISR WRITE SAFETY — READ BEFORE EDITING THIS FILE
//
// revalidatePath() causes 1 IMMEDIATE ISR write per call on Vercel.
// revalidateTag(tag, 'max') marks data stale lazily — ZERO ISR writes on the call itself.
//
// Hub/list pages (/, /jobs, /internships, /walk-ins, etc.) are powered by the CDN JSON feed.
// They MUST NOT be passed to revalidatePath(). They refresh automatically when the CDN feed
// tag is marked stale and the next visitor hits the page.
//
// Passing hub paths to revalidatePath() caused a 20k+ ISR write spike (commit 8b1cc2d).
// The HUB_PATHS guard below hard-blocks this at runtime to prevent future regressions.
//
// Valid revalidatePath() targets: individual job detail slugs ONLY (e.g. /some-job-slug-abc).
const HUB_PATHS = new Set([
    '/',
    '/opportunities',
    '/jobs',
    '/internships',
    '/walk-ins',
    '/remote',
    '/government-jobs',
    '/companies',
    '/location',
    '/batch',
    '/skills',
    '/roles',
]);

/** Returns true if the path is a hub/list page that must never be passed to revalidatePath(). */
function isHubPath(path: string): boolean {
    return HUB_PATHS.has(path) || HUB_PATHS.has(path.replace(/\/$/, ''));
}

/**
 * Derives which feed tags need busting based on slug paths.
 * Only called when no explicit body.tags are provided (slug-based revalidation).
 *
 * Called by: publicOpportunityCache.service.ts (after individual job publish/expire)
 * NOT called for: regenerate-feeds (those always send explicit body.tags)
 */
function deriveTagsFromPaths(paths: string[]): string[] {
    const tags: string[] = [];

    const hasGovt = paths.some(p => p.startsWith('/government-jobs'));
    const hasCompany = paths.some(p => p.startsWith('/companies/'));
    const hasWalkin = paths.some(p => p.startsWith('/walk-ins/'));
    const hasNormal = paths.some(p => !p.startsWith('/government-jobs') && !p.startsWith('/companies/'));

    if (hasNormal || hasWalkin) tags.push('homepage-feed');
    if (hasGovt) tags.push('government-feed');
    if (hasCompany) tags.push('companies-metadata');

    // Granular slug-level tags
    for (const path of paths) {
        if (isHubPath(path)) continue;
        const parts = path.split('/').filter(Boolean);
        if (parts.length === 0) continue;
        const lastPart = parts[parts.length - 1];

        if (path.startsWith('/companies/')) {
            tags.push(`company-${lastPart}`);
        } else if (path.startsWith('/walk-ins/')) {
            tags.push(`city-${lastPart}`);
        } else {
            tags.push(`opportunity-${lastPart}`);
            const companyPrefix = lastPart.split('-')[0];
            if (companyPrefix) tags.push(`company-${companyPrefix}`);
        }
    }

    return tags;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { secret, paths } = body;

        const expectedSecret = process.env.REVALIDATE_SECRET_TOKEN;
        if (!expectedSecret) {
            return NextResponse.json(
                { message: 'REVALIDATE_SECRET_TOKEN is not configured on the server' },
                { status: 500 }
            );
        }

        if (secret !== expectedSecret) {
            return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
        }

        const revalidatedPaths: string[] = [];
        const skippedPaths: string[] = [];

        // Revalidate individual job detail slugs only.
        // Hub/list pages are hard-blocked by isHubPath() — they update via tag invalidation.
        if (Array.isArray(paths)) {
            for (const path of paths) {
                if (typeof path === 'string') {
                    if (isHubPath(path)) {
                        skippedPaths.push(path);
                        continue;
                    }
                    revalidatePath(path);
                    revalidatedPaths.push(path);
                }
            }
        }

        // --- Tag invalidation ---
        const tagsToBust = new Set<string>();

        if (Array.isArray(body.tags) && body.tags.length > 0) {
            // Caller provided explicit tags (e.g. from regenerate-feeds → system.ts).
            // Trust them directly — no path inference needed.
            for (const tag of body.tags) {
                if (typeof tag === 'string') tagsToBust.add(tag);
            }
        } else if (Array.isArray(paths) && paths.length > 0) {
            // Caller provided slug paths (e.g. from publicOpportunityCache.service.ts).
            // Derive which feed tags to bust based on path prefixes.
            const derived = deriveTagsFromPaths(
                (paths as unknown[]).filter((p): p is string => typeof p === 'string')
            );
            for (const tag of derived) tagsToBust.add(tag);

            // Also check if expired-feed should be busted from path content
            if ((paths as unknown[]).some((p): p is string => typeof p === 'string' && p.includes('expired'))) {
                tagsToBust.add('expired-feed');
            }
        }

        // Also support expired-feed from explicit body.tags (already handled above via Set)
        if (Array.isArray(body.tags) && body.tags.includes('expired-feed')) {
            tagsToBust.add('expired-feed');
        }

        const revalidatedTags: string[] = [];
        for (const tag of tagsToBust) {
            revalidateTag(tag, 'max');
            revalidatedTags.push(tag);
        }

        return NextResponse.json({
            revalidated: true,
            now: Date.now(),
            paths: revalidatedPaths,
            skipped: skippedPaths,
            tags: revalidatedTags,
        });
    } catch {
        return NextResponse.json({ message: 'Error parsing request body' }, { status: 400 });
    }
}
