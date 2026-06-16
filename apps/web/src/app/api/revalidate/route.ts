import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

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

        // Revalidate only the specific paths passed (e.g. the job detail slug).
        // Do NOT revalidate list pages here — they pull from the CDN feed which
        // is cache-busted by the tags below. Revalidating list pages on every
        // publish was the cause of 242K ISR writes (5 pages × N publishes/day).
        if (Array.isArray(paths)) {
            for (const path of paths) {
                if (typeof path === 'string') {
                    revalidatePath(path);
                    revalidatedPaths.push(path);
                }
            }
        }

        const revalidatedTags: string[] = [];

        // Bust the feed version on every publish/expire action so pages can fetch fresh URLs
        revalidateTag('feed-version', 'max');
        revalidatedTags.push('feed-version');

        const pathsArr = Array.isArray(paths) ? paths : [];

        // Granular feed revalidation: Only invalidate feeds that actually changed to prevent site-wide cache storms.
        const hasGovt = pathsArr.some(p => typeof p === 'string' && p.startsWith('/government-jobs'));
        const hasCompany = pathsArr.some(p => typeof p === 'string' && p.startsWith('/companies/'));
        const hasWalkin = pathsArr.some(p => typeof p === 'string' && p.startsWith('/walk-ins/'));
        const hasNormal = pathsArr.some(p => typeof p === 'string' && !p.startsWith('/government-jobs') && !p.startsWith('/companies/'));

        if (hasNormal || hasWalkin) {
            revalidateTag('homepage-feed', 'max');
            revalidatedTags.push('homepage-feed');
        }
        if (hasGovt) {
            revalidateTag('government-feed', 'max');
            revalidatedTags.push('government-feed');
        }
        if (body.tags?.includes('expired-feed') || pathsArr.some(p => typeof p === 'string' && p.includes('expired'))) {
            revalidateTag('expired-feed', 'max');
            revalidatedTags.push('expired-feed');
        }
        if (hasCompany) {
            revalidateTag('companies-metadata', 'max');
            revalidatedTags.push('companies-metadata');
        }

        // Extract and bust granular tags from paths
        if (Array.isArray(paths)) {
            for (const path of paths) {
                if (typeof path === 'string') {
                    const parts = path.split('/').filter(Boolean);
                    if (parts.length > 0) {
                        const lastPart = parts[parts.length - 1];
                        if (path.startsWith('/companies/')) {
                            revalidateTag(`company-${lastPart}`, 'max');
                            revalidatedTags.push(`company-${lastPart}`);
                        } else if (path.startsWith('/walk-ins/')) {
                            revalidateTag(`city-${lastPart}`, 'max');
                            revalidatedTags.push(`city-${lastPart}`);
                        } else {
                            revalidateTag(`opportunity-${lastPart}`, 'max');
                            revalidatedTags.push(`opportunity-${lastPart}`);
                            const companyPrefix = lastPart.split('-')[0];
                            if (companyPrefix) {
                                revalidateTag(`company-${companyPrefix}`, 'max');
                                revalidatedTags.push(`company-${companyPrefix}`);
                            }
                        }
                    }
                }
            }
        }

        // Support custom tags in the body
        if (Array.isArray(body.tags)) {
            for (const tag of body.tags) {
                if (typeof tag === 'string') {
                    revalidateTag(tag, 'max');
                    revalidatedTags.push(tag);
                }
            }
        }

        return NextResponse.json({
            revalidated: true,
            now: Date.now(),
            paths: revalidatedPaths,
            tags: revalidatedTags,
        });
    } catch {
        return NextResponse.json({ message: 'Error parsing request body' }, { status: 400 });
    }
}

