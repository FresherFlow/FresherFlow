import { S3Client, ListObjectsV2Command, ListObjectsV2CommandOutput, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '@fresherflow/logger';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables if running as a standalone script
dotenv.config({ path: path.join(process.cwd(), '../../.env') });

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucketName) {
    logger.error('R2 credentials not fully configured in environment.');
    process.exit(1);
  }

  const s3 = new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  let continuationToken: string | undefined = undefined;
  let deletedCount = 0;

  logger.info(`Starting cleanup of OG images older than 90 days (Before ${ninetyDaysAgo.toISOString()})`);
  if (isDryRun) {
    logger.info('DRY RUN ENABLED - No files will be deleted.');
  }

  do {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: 'og/',
      ContinuationToken: continuationToken,
    });

    const response = await s3.send(command) as ListObjectsV2CommandOutput;
    
    if (response.Contents) {
      for (const object of response.Contents) {
        if (object.LastModified && object.LastModified < ninetyDaysAgo) {
          if (isDryRun) {
            logger.info(`[Dry Run] Would delete: ${object.Key}`);
            deletedCount++;
          } else {
            logger.info(`Deleting: ${object.Key}`);
            try {
              await s3.send(new DeleteObjectCommand({
                Bucket: bucketName,
                Key: object.Key,
              }));
              deletedCount++;
            } catch (err) {
              logger.error(`Failed to delete ${object.Key}`, err);
            }
          }
        }
      }
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  logger.info(`Cleanup completed. Total ${isDryRun ? 'would be ' : ''}deleted: ${deletedCount}`);
}

main().catch(err => {
  logger.error('Error during cleanup script execution', err);
  process.exit(1);
});
