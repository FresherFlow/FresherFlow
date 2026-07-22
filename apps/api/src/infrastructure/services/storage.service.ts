import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '@fresherflow/logger';

export class StorageService {
    private static readonly PUBLIC_ROOT = path.join(process.cwd(), 'public');

    static getPublicRoot(): string {
        return this.PUBLIC_ROOT;
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
        const endpoint = process.env.R2_ENDPOINT;
        const accessKeyId = process.env.R2_ACCESS_KEY_ID;
        const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
        const bucketName = process.env.R2_BUCKET_NAME;

        if (!endpoint || !accessKeyId || !secretAccessKey) {
            logger.warn(`[StorageService] Skipping R2 upload for ${key} - R2 credentials not fully configured in environment.`);
            return;
        }

        try {
            const s3 = new S3Client({
                region: 'auto',
                endpoint,
                credentials: {
                    accessKeyId,
                    secretAccessKey,
                },
            });

            await s3.send(
                new PutObjectCommand({
                    Bucket: bucketName,
                    Key: key,
                    Body: body,
                    ContentType: contentType,
                    CacheControl: key === 'feed-version.json' ? 'no-cache, no-store, must-revalidate' : undefined,
                })
            );
            logger.info(`[StorageService] Successfully uploaded to R2: ${key}`);
        } catch (error) {
            logger.error(`[StorageService] Failed to upload ${key} to R2`, error);
        }
    }

    static async fetchFromR2(key: string): Promise<string | null> {
        const endpoint = process.env.R2_ENDPOINT;
        const accessKeyId = process.env.R2_ACCESS_KEY_ID;
        const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
        const bucketName = process.env.R2_BUCKET_NAME;

        if (!endpoint || !accessKeyId || !secretAccessKey) {
            return null;
        }

        try {
            const s3 = new S3Client({
                region: 'auto',
                endpoint,
                credentials: {
                    accessKeyId,
                    secretAccessKey,
                },
            });

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
