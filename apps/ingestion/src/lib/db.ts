import pg from 'pg';
import { logger } from '@fresherflow/utils';
const { Pool } = pg;

const connectionString =
  process.env.INGESTION_DATABASE_URL ||
  process.env.STAGING_DATABASE_URL ||
  process.env.DATABASE_URL;

// Never disable TLS verification by default. Managed Postgres providers
// should be configured via `?sslmode=require` in the connection string; an
// explicit opt-out remains available for local/dev proxies via
// PG_SSL_REJECT_UNAUTHORIZED=0. Matches the policy in @fresherflow/database.
const rejectUnauthorized = process.env.PG_SSL_REJECT_UNAUTHORIZED !== '0';

if (process.env.NODE_ENV === 'production' && !rejectUnauthorized) {
  // Defence in depth: a stray env var in production would silently expose the
  // ingestion database to interception. Fail closed instead.
  logger.error(
    '[db] PG_SSL_REJECT_UNAUTHORIZED=0 is set in production. Refusing to start with TLS verification disabled.'
  );
  throw new Error('TLS verification must not be disabled in production');
}

export const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized } : undefined,
});

