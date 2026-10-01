import pg from 'pg';
const { Pool } = pg;
import { loadEnv } from '../config/loadEnv.js';

loadEnv();

const connectionString =
  process.env.INGESTION_DATABASE_URL ||
  process.env.STAGING_DATABASE_URL ||
  process.env.DATABASE_URL;

export const hasDb = Boolean(connectionString);

if (!hasDb) {
  console.warn('WARNING: INGESTION_DATABASE_URL / STAGING_DATABASE_URL / DATABASE_URL is missing from environment variables.');
}

const isRemoteDb = connectionString && !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1');

// Never disable TLS verification by default. Remote connections are exactly the
// case that must be verified. An explicit opt-out remains available for
// local/dev proxies via PG_SSL_REJECT_UNAUTHORIZED=0.
const rejectUnauthorized = process.env.PG_SSL_REJECT_UNAUTHORIZED !== '0';

if (isRemoteDb && !rejectUnauthorized && process.env.NODE_ENV === 'production') {
  // Defence in depth: a stray env var must not silently expose the ingestion
  // database to interception. Fail closed instead.
  throw new Error('TLS verification must not be disabled in production');
}

export const pool = new Pool({
  connectionString,
  ssl: isRemoteDb ? { rejectUnauthorized } : undefined,
});

