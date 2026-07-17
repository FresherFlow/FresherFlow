import { NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

export const dynamic = 'force-dynamic';

const getS3Client = () => {
    if (!process.env.R2_ENDPOINT || !process.env.R2_ACCESS_KEY_ID) return null;
    return new S3Client({
        region: 'auto',
        endpoint: process.env.R2_ENDPOINT,
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
        },
    });
};

export async function GET() {
    const s3Client = getS3Client();
    if (!s3Client) {
        return NextResponse.json({ error: 'R2 credentials missing' }, { status: 500 });
    }

    try {
        const bucketName = process.env.R2_BUCKET_NAME;
        const jobs: any[] = [];
        
        const prefixes = ['jobs/ats/', 'jobs/non-ats/', 'jobs/aggregators/'];
        const listPromises = prefixes.map(async (prefix) => {
            try {
                let isTruncated = true;
                let continuationToken: string | undefined = undefined;
                const allContents: any[] = [];

                while (isTruncated) {
                    const listCommand: any = new ListObjectsV2Command({
                        Bucket: bucketName,
                        Prefix: prefix,
                        ContinuationToken: continuationToken,
                    });
                    const response: any = await s3Client.send(listCommand);
                    if (response.Contents) {
                        allContents.push(...response.Contents);
                    }
                    isTruncated = response.IsTruncated || false;
                    continuationToken = response.NextContinuationToken;
                }
                return allContents;
            } catch (err) {
                console.error(`Failed to list prefix ${prefix}:`, err);
                return [];
            }
        });

        const listResults = await Promise.all(listPromises);
        const allContents = listResults.flat();

        if (allContents.length > 0) {
            const sortedContents = allContents.sort((a, b) => {
                const timeA = a.LastModified?.getTime() || 0;
                const timeB = b.LastModified?.getTime() || 0;
                return timeB - timeA;
            });

            // Get the most recent 30 jobs to load extremely fast
            const recentKeys = sortedContents
                .filter(obj => obj.Key && obj.Key.endsWith('.json') && !obj.Key.includes('discovery/'))
                .map(obj => obj.Key!)
                .slice(0, 30);

            const fetchPromises = recentKeys.map(async (key) => {
                try {
                    const getCommand = new GetObjectCommand({
                        Bucket: bucketName,
                        Key: key,
                    });
                    const getResponse = await s3Client.send(getCommand);
                    const bodyString = await getResponse.Body?.transformToString();
                    if (bodyString) {
                        try {
                            const parsedJob = JSON.parse(bodyString);
                            parsedJob._r2Key = key;
                            
                            if (key.startsWith('jobs/ats/')) {
                                const parts = key.split('/');
                                parsedJob._sourceType = 'ats';
                                parsedJob._provider = parts[2];
                                parsedJob._companyFolder = parts[3];
                            } else if (key.startsWith('jobs/non-ats/')) {
                                const parts = key.split('/');
                                parsedJob._sourceType = 'non-ats';
                                parsedJob._provider = 'direct';
                                parsedJob._companyFolder = parts[2];
                            } else if (key.startsWith('jobs/aggregators/')) {
                                const parts = key.split('/');
                                parsedJob._sourceType = 'aggregators';
                                parsedJob._provider = 'aggregator';
                                parsedJob._dateFolder = parts[2];
                            } else {
                                parsedJob._sourceType = 'unknown';
                            }
                            
                            return parsedJob;
                        } catch {
                            console.error('Error parsing JSON for object:', key);
                        }
                    }
                } catch {
                    console.error('Error fetching/parsing object:', key);
                }
                return null;
            });

            const results = await Promise.all(fetchPromises);
            for (const res of results) {
                if (res) jobs.push(res);
            }
        }

        return NextResponse.json({ jobs }, { status: 200 });
    } catch (error: any) {
        console.error('Error fetching jobs from R2:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch pending jobs' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const s3Client = getS3Client();
    if (!s3Client) {
        return NextResponse.json({ error: 'R2 credentials missing' }, { status: 500 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const key = searchParams.get('key');
        if (!key) {
            return NextResponse.json({ error: 'Missing object key' }, { status: 400 });
        }

        const bucketName = process.env.R2_BUCKET_NAME ;
        const command = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: key,
        });
        
        await s3Client.send(command);
        return NextResponse.json({ success: true, key }, { status: 200 });
    } catch (error: any) {
        console.error('Error deleting job from R2:', error);
        return NextResponse.json({ error: error.message || 'Failed to delete job' }, { status: 500 });
    }
}
