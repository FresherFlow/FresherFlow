import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

// These list pages use revalidate = false (on-demand only).
// Always revalidate them alongside any specific job path so the feed stays current.
const LIST_PAGES = ['/jobs', '/internships', '/walk-ins', '/opportunities'];

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { secret, paths } = body;

        // Ensure the secret matches the environment variable
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

        // Revalidate specific literal paths (e.g. ['/software-engineer-at-google-abc123'])
        if (Array.isArray(paths)) {
            for (const path of paths) {
                if (typeof path === 'string') {
                    revalidatePath(path);
                    revalidatedPaths.push(path);
                }
            }
        }

        // Always revalidate list pages — they use revalidate = false so they only
        // update when explicitly triggered here, not on a timer.
        for (const listPath of LIST_PAGES) {
            revalidatePath(listPath);
            revalidatedPaths.push(listPath);
        }

        // Bust the Next.js data cache for version + feed so re-rendered pages get
        // fresh CDN data, not the indefinitely-cached stale version.
        // "max" profile = expire:never — held until explicitly invalidated (Next.js 16 required arg)
        revalidateTag('feed-version', 'max');
        revalidateTag('bootstrap-feed', 'max');

        return NextResponse.json({
            revalidated: true,
            now: Date.now(),
            paths: revalidatedPaths
        });
    } catch {
        return NextResponse.json({ message: 'Error parsing request body' }, { status: 400 });
    }
}
