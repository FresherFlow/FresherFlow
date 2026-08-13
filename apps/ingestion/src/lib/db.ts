import pg from 'pg';
const { Pool } = pg;

const connectionString =
  process.env.INGESTION_DATABASE_URL ||
  process.env.STAGING_DATABASE_URL ||
  process.env.DATABASE_URL;

export const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

