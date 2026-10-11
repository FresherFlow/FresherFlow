import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

// Server-only minimal R2 JSON reader for admin routes (source health ledger).
// Separate from `@fresherflow/utils/r2` on purpose: the web app must not
// import pipeline-adjacent packages (boundary rule), and this file needs only
// reads. Returns null when unconfigured or unreadable — callers render a
// "not connected" state, never a 500. Never throws.

function getClient(): S3Client | null {
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) return null;
  return new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export const hasR2Read = Boolean(
  process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET_NAME
);

export async function readJsonFromR2<T>(key: string): Promise<T | null> {
  const client = getClient();
  const bucket = (process.env.R2_BUCKET_NAME || '').trim();
  if (!client || !bucket) return null;
  try {
    const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!res.Body) return null;
    const text = await res.Body.transformToString();
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
