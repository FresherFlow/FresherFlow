import PendingTool from './components/PendingTool';
import { Metadata } from 'next';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';

export const metadata: Metadata = {
    title: 'Pending Jobs - FresherFlow Admin',
    description: 'Verify and view pending jobs',
};

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

export default async function PendingJobsPage() {
    const jobs: any[] = [];
    
    const s3Client = getS3Client();
    if (!s3Client) {
        console.error('R2 credentials missing, skipping fetch');
    } else {
        try {
            const bucketName = process.env.R2_BUCKET_NAME || 'fresherflow-cdn';
        const listCommand = new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: 'jobs/',
        });
        const listResponse = await s3Client.send(listCommand);
        
        if (listResponse.Contents) {
            // Get only the most recent 100 jobs to prevent UI overload and timeouts
            const recentKeys = listResponse.Contents
                .filter(obj => obj.Key && obj.Key.endsWith('.json'))
                .sort((a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0))
                .map(obj => obj.Key!)
                .slice(0, 100);

            // Fetch in chunks of 10 to prevent ECONNRESET and connection pool exhaustion
            for (let i = 0; i < recentKeys.length; i += 10) {
                const chunk = recentKeys.slice(i, i + 10);
                const fetchPromises = chunk.map(async (key) => {
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
                                // Group by discoveredAt date embedded in the JSON payload
                                parsedJob._date = parsedJob.discoveredAt || new Date().toISOString().split('T')[0];
                                
                                // Extract UI helper fields from the R2 key structure
                                // e.g. jobs/ats/[adapter]/[company]/[jobId].json
                                // or jobs/non-ats/[company]/[jobId].json
                                // or jobs/aggregators/[date]/[time]/[safeName].json
                                const keyParts = key.split('/');
                                if (keyParts[1] === 'ats') {
                                    parsedJob._sourceType = 'ats';
                                    parsedJob._provider = keyParts[2];
                                    parsedJob._companyFolder = keyParts[3];
                                } else if (keyParts[1] === 'non-ats') {
                                    parsedJob._sourceType = 'non-ats';
                                    parsedJob._companyFolder = keyParts[2];
                                } else if (keyParts[1] === 'aggregators') {
                                    parsedJob._sourceType = 'aggregators';
                                    parsedJob._dateFolder = keyParts[2];
                                    parsedJob._date = keyParts[2]; // Use date from folder if discoveredAt is missing
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
        }
        }
        catch (error) {
            console.error('Error fetching jobs from R2:', error);
        }
    }

    return (
        <div className="flex-1 w-full p-2 sm:p-4 lg:p-6 max-w-[1600px] mx-auto flex flex-col h-[calc(100vh)] lg:h-screen min-h-0 overflow-hidden">
            <PendingTool initialJobs={jobs} />
        </div>
    );
}
