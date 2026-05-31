import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { secret, paths, tags } = body;

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
        const revalidatedTags: string[] = [];

        // Revalidate specific literal paths (e.g. ['/opportunities/job-123'])
        if (Array.isArray(paths)) {
            for (const path of paths) {
                if (typeof path === 'string') {
                    // Revalidate the literal path
                    revalidatePath(path);
                    revalidatedPaths.push(path);
                }
            }
        }

        // Revalidate specific tags if provided
        if (Array.isArray(tags)) {
            for (const tag of tags) {
                if (typeof tag === 'string') {
                    revalidateTag(tag);
                    revalidatedTags.push(tag);
                }
            }
        }

        return NextResponse.json({
            revalidated: true,
            now: Date.now(),
            paths: revalidatedPaths,
            tags: revalidatedTags
        });
    } catch (err) {
        return NextResponse.json({ message: 'Error parsing request body' }, { status: 400 });
    }
}
