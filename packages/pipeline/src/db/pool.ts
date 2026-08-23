import pg from 'pg';
const { Pool } = pg;
import { loadEnv } from '../config/index.js';

await loadEnv();

const connectionString =
  process.env.DATABASE_URL ||
  process.env.INGESTION_DATABASE_URL;

export const hasDb = Boolean(connectionString);

if (!hasDb) {
  console.warn('WARNING: DATABASE_URL is missing from environment variables.');
}

const isRemoteDb = connectionString && !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1');

export const pool = new Pool({
  connectionString,
  ssl: isRemoteDb ? { rejectUnauthorized: false } : undefined,
});

