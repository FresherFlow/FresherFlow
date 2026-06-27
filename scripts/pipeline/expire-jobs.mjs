#!/usr/bin/env node
/**
 * expire-jobs.mjs
 * -----------------------------------------------------------------------
 * Reference script for the job-sweeper pipeline.
 *
 * Calls POST /api/pipeline/expire-jobs on the FresherFlow API.
 * Authenticates via the INTERNAL_API_SECRET environment variable.
 *
 * Modes:
 *   --sweep          Auto-expire all PUBLISHED jobs whose expiresAt is in the past.
 *   --ids id1,id2    Expire specific jobs by UUID or slug.
 *   Both flags can be combined in a single invocation.
 *
 * Usage (local):
 *   INTERNAL_API_SECRET=your-secret API_URL=http://localhost:5000 node expire-jobs.mjs --sweep
 *
 * Usage (GitHub Actions):
 *   env:
 *     INTERNAL_API_SECRET: ${{ secrets.INTERNAL_API_SECRET }}
 *     API_URL: ${{ secrets.API_URL }}  # e.g. https://api.fresherflow.in
 *   run: node scripts/pipeline/expire-jobs.mjs --sweep
 *
 * Exit codes:
 *   0 — success (or nothing to expire)
 *   1 — authentication / server error
 */

import { parseArgs } from 'node:util';

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    sweep: { type: 'boolean', default: false },
    ids:   { type: 'string' },
    reason:{ type: 'string' },
  },
});

const API_URL           = process.env.API_URL || 'http://localhost:5000';
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;

if (!INTERNAL_API_SECRET) {
  console.error('[expire-jobs] INTERNAL_API_SECRET environment variable is not set.');
  process.exit(1);
}

const body = {
  sweepExpired: values.sweep ?? false,
  ...(values.ids ? { ids: values.ids.split(',').map((s) => s.trim()).filter(Boolean) } : {}),
  ...(values.reason ? { reason: values.reason } : {}),
};

console.log(`[expire-jobs] Calling ${API_URL}/api/pipeline/expire-jobs`);
console.log('[expire-jobs] Payload:', JSON.stringify(body));

try {
  const res = await fetch(`${API_URL}/api/pipeline/expire-jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': INTERNAL_API_SECRET,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();

  if (!res.ok) {
    console.error(`[expire-jobs] API returned ${res.status}:`, json);
    process.exit(1);
  }

  console.log('[expire-jobs] Result:');
  console.log(`  Expired  : ${json.expired}`);
  console.log(`  Skipped  : ${json.skipped}  (already expired — idempotent)`);
  console.log(`  Not found: ${json.notFound}`);

  if (json.expiredIds?.length) {
    console.log('[expire-jobs] Expired IDs:', json.expiredIds.join(', '));
  }
  if (json.notFoundIds?.length) {
    console.warn('[expire-jobs] WARNING — IDs not found:', json.notFoundIds.join(', '));
  }

  process.exit(0);
} catch (err) {
  console.error('[expire-jobs] Request failed:', err);
  process.exit(1);
}
