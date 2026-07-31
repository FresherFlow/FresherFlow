import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import prisma from '@fresherflow/database';
import { verifyAccessToken } from '@fresherflow/auth';

export const dynamic = 'force-dynamic';

function getS3Client(): S3Client {
    return new S3Client({
        region: 'auto',
        endpoint: process.env.R2_ENDPOINT!,
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID!,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
        },
    });
}

export async function POST() {
    try {
        // 1. Auth — read access token from cookie, same pattern as other server routes
        const cookieStore = await cookies();
        const accessToken = cookieStore.get('accessToken')?.value;
        if (!accessToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = verifyAccessToken(accessToken);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Load user + profile + projects from Postgres
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                profile: true,
                projects: {
                    orderBy: { order: 'asc' },
                },
            },
        });

        if (!user?.username) {
            return NextResponse.json({ error: 'Username required before publishing' }, { status: 400 });
        }
        if (!user.profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        // 3. Build the public profile JSON — identical shape to getPublicProfileByUsername in profile.service.ts
        const profileData = {
            user: {
                id: user.id,
                fullName: user.fullName,
                username: user.username,
                createdAt: user.createdAt,
            },
            profile: {
                ...user.profile,
                projects: user.projects,
            },
            projects: user.projects,
        };

        // 4. Upload to R2 at profiles/{username}.json
        const r2Endpoint = process.env.R2_ENDPOINT;
        const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
        const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
        const r2BucketName = process.env.R2_BUCKET_NAME;

        if (r2Endpoint && r2AccessKeyId && r2SecretAccessKey && r2BucketName) {
            const s3 = getS3Client();
            await s3.send(
                new PutObjectCommand({
                    Bucket: r2BucketName,
                    Key: `profiles/${user.username}.json`,
                    Body: JSON.stringify(profileData),
                    ContentType: 'application/json',
                })
            );
        }

        // 5. Update profilePublishedAt in Postgres
        const publishedAt = new Date();
        await prisma.profile.update({
            where: { userId },
            data: { profilePublishedAt: publishedAt },
        });

        return NextResponse.json({ publishedAt: publishedAt.toISOString() }, { status: 200 });
    } catch (error) {
        console.error('[profile/publish] error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
