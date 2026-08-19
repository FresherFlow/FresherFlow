import pg from 'pg';
const { Pool } = pg;
import { loadEnv } from '../config/index.js';

await loadEnv();

const connectionString =
  process.env.INGESTION_DATABASE_URL ||
  process.env.STAGING_DATABASE_URL ||
  process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('WARNING: DATABASE_URL is missing from environment variables.');
}

export const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});
