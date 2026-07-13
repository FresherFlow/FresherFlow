import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import fs from 'node:fs/promises';

const endpoint = process.env.R2_ENDPOINT;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

function getS3Client() {
    if (!endpoint || !accessKeyId || !secretAccessKey) {
        return null;
    }
    return new S3Client({
        region: 'auto',
        endpoint,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
    });
}

export async function uploadToR2(filePath: string, bucketName: string, destinationKey: string) {
    const s3Client = getS3Client();
    if (!s3Client) {
        console.warn('R2 credentials not fully configured. Skipping upload.');
        return;
    }

    try {
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

export async function uploadJsonToR2(jsonObject: any, bucketName: string, destinationKey: string) {
    const s3Client = getS3Client();
    if (!s3Client) {
        console.warn('R2 credentials not fully configured. Skipping JSON upload.');
        return;
    }

    try {
        const body = typeof jsonObject === 'string' ? jsonObject : JSON.stringify(jsonObject, null, 2);
        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: destinationKey,
            Body: body,
            ContentType: 'application/json',
            CacheControl: 'public, max-age=3600',
        });
        await s3Client.send(command);
        console.log(`Successfully uploaded JSON to R2 bucket ${bucketName} at key ${destinationKey}`);
    } catch (error) {
        console.error('Failed to upload JSON to R2:', error);
    }
}

export async function downloadJsonFromR2(bucketName: string, key: string): Promise<any | null> {
    const s3Client = getS3Client();
    if (!s3Client) return null;

    try {
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: key,
        });
        const response = await s3Client.send(command);
        const str = await response.Body?.transformToString();
        if (str) return JSON.parse(str);
        return null;
    } catch (error: any) {
        if (error.name !== 'NoSuchKey') {
            console.error(`Failed to download ${key} from R2:`, error);
        }
        return null; // Return null if file doesn't exist
    }
}

export async function listR2Objects(bucketName: string, prefix: string) {
    const s3Client = getS3Client();
    if (!s3Client) {
        console.warn('R2 credentials not fully configured. Cannot list objects.');
        return [];
    }

    try {
        const command = new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: prefix,
        });
        const response = await s3Client.send(command);
        return response.Contents || [];
    } catch (error) {
        console.error('Failed to list R2 objects:', error);
        return [];
    }
}

export async function deleteR2Object(bucketName: string, key: string) {
    const s3Client = getS3Client();
    if (!s3Client) {
        console.warn('R2 credentials not fully configured. Cannot delete object.');
        return;
    }

    try {
        const command = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: key,
        });
        await s3Client.send(command);
        console.log(`Successfully deleted ${key} from R2 bucket ${bucketName}`);
    } catch (error) {
        console.error(`Failed to delete ${key} from R2:`, error);
    }
}
