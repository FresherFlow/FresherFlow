import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'node:fs/promises';

export async function uploadToR2(filePath: string, bucketName: string, destinationKey: string) {
    const endpoint = process.env.R2_ENDPOINT;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!endpoint || !accessKeyId || !secretAccessKey) {
        console.warn('R2 credentials not fully configured. Skipping upload.');
        return;
    }

    try {
        const s3Client = new S3Client({
            region: 'auto',
            endpoint,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });

        const fileContent = await fs.readFile(filePath);

        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: destinationKey,
            Body: fileContent,
            ContentType: 'application/json',
            CacheControl: 'public, max-age=3600',
        });

        await s3Client.send(command);
        console.log(`Successfully uploaded ${filePath} to R2 bucket ${bucketName} at key ${destinationKey}`);
    } catch (error) {
        console.error('Failed to upload to R2:', error);
    }
}
