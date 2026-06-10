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

        // Bust the Next.js data cache so re-rendered pages get fresh CDN data.
        // @ts-expect-error -- revalidateTag accepts 1 arg in Next.js 15 typings; 'max' profile is Next.js 16 only
        revalidateTag('feed-version');
        // @ts-expect-error -- revalidateTag accepts 1 arg in Next.js 15 typings; 'max' profile is Next.js 16 only
        revalidateTag('bootstrap-feed');

        return NextResponse.json({
            revalidated: true,
            now: Date.now(),
            paths: revalidatedPaths,
        });
    } catch {
        return NextResponse.json({ message: 'Error parsing request body' }, { status: 400 });
    }
}

