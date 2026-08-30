import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '@fresherflow/utils';

export class StorageService {
    private static readonly PUBLIC_ROOT = path.join(process.cwd(), 'public');
    private static s3ClientInstance: S3Client | null = null;

    static getPublicRoot(): string {
        return this.PUBLIC_ROOT;
    }

    private static getS3Client(): S3Client | null {
        if (this.s3ClientInstance) return this.s3ClientInstance;

        const endpoint = process.env.R2_ENDPOINT;
        const accessKeyId = process.env.R2_ACCESS_KEY_ID;
        const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

        if (!endpoint || !accessKeyId || !secretAccessKey) {
            return null;
        }

        this.s3ClientInstance = new S3Client({
            region: 'auto',
            endpoint,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
            maxAttempts: 2,
        });

        return this.s3ClientInstance;
    }

    static ensureDirectoryExists(dirPath: string): void {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    static writeLocalFile(filePath: string, content: string): void {
        const dir = path.dirname(filePath);
        this.ensureDirectoryExists(dir);
        fs.writeFileSync(filePath, content);
    }

    static readLocalFile(filePath: string): string | null {
        if (!fs.existsSync(filePath)) return null;
        return fs.readFileSync(filePath, 'utf-8');
    }

    static async uploadToR2(key: string, body: string, contentType: string): Promise<void> {
        const bucketName = process.env.R2_BUCKET_NAME;
        const s3 = this.getS3Client();

        if (!s3 || !bucketName) {
            logger.warn(`[StorageService] Skipping R2 upload for ${key} - R2 credentials not fully configured in environment.`);
            return;
        }

        try {
            await s3.send(
                new PutObjectCommand({
                    Bucket: bucketName,
                    Key: key,
                    Body: body,
                    ContentType: contentType,
                    CacheControl: key === 'feed-version.json' ? 'no-cache, no-store, must-revalidate' : undefined,
                })
            );
        } catch (error) {
            logger.error(`[StorageService] Failed to upload ${key} to R2`, error);
        }
    }

    static async fetchFromR2(key: string): Promise<string | null> {
        const bucketName = process.env.R2_BUCKET_NAME;
        const s3 = this.getS3Client();

        if (!s3 || !bucketName) {
            return null;
        }

        try {
            const response = await s3.send(
                new GetObjectCommand({
                    Bucket: bucketName,
                    Key: key,
                })
            );
            if (!response.Body) return null;
            return await response.Body.transformToString();
        } catch (error: unknown) {
            const err = error as Error & { $metadata?: { httpStatusCode?: number } };
            if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
                return null;
            }
            logger.error(`[StorageService] Failed to fetch ${key} from R2`, error);
            return null;
        }
    }
}
