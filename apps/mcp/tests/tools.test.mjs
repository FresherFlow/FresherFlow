import assert from 'node:assert/strict';
import test from 'node:test';
import { loadModule } from '../scripts/load-widget-module.mjs';
import { z } from 'zod';

const { normalizeSubmissionRecord } = await loadModule('tools/show-submission-result.ts', 'src');

const base = {
  id: 'sub-1',
  title: 'Intern',
  company: 'Example',
  sourceUrl: 'https://example.com/job',
  applyUrl: 'https://example.com/apply',
  status: 'PENDING_REVIEW',
  createdAt: '2026-11-26T00:00:00Z',
  opportunityId: 'opp-1',
  extractedData: { missingFields: ['salary'] },
  opportunity: {
    id: 'opp-1', slug: 'intern', status: 'DRAFT', deletedAt: null,
    deletionReason: null, expiresAt: null,
  },
};

test('PENDING_REVIEW maps to draft, never published', () => {
  const result = normalizeSubmissionRecord('submission-record', base);
  assert.equal(result.status, 'PENDING_REVIEW');
  assert.equal(result.published, false);
  assert.deepEqual(result.missingFields, ['salary']);
});

test('published requires a live opportunity, not just the submission status', () => {
  const live = normalizeSubmissionRecord('submission-record', {
    ...base,
    status: 'PUBLISHED',
    opportunity: { ...base.opportunity, status: 'PUBLISHED' },
  });
  assert.equal(live.published, true);

  const stale = normalizeSubmissionRecord('submission-record', {
    ...base,
    status: 'PUBLISHED',
    opportunity: { ...base.opportunity, status: 'ARCHIVED' },
  });
  assert.equal(stale.published, false);
  assert.equal(stale.stale, true);
});

test('MERGED is a distinct state', () => {
  const result = normalizeSubmissionRecord('submission-record', { ...base, status: 'MERGED' });
  assert.equal(result.status, 'MERGED');
  assert.equal(result.published, false);
});

test('public-listing carries no submission id or private fields', () => {
  const result = normalizeSubmissionRecord('public-listing', {
    id: 'opp-x', slug: 'live', status: 'PUBLISHED', title: 'Live',
    company: 'Example', expiresAt: null,
  });
  assert.equal(result.published, true);
  assert.equal(result.id, undefined);
  assert.equal(result.extractedData, undefined);
  assert.equal(result.applyUrl, undefined);
});

test('get_job jobSchema accepts the additive companyLogoUrl field', async () => {
  const { jobSchema } = await loadModule('tools/get-job.ts', 'src');
  assert.ok(Object.keys(jobSchema.shape).includes('companyLogoUrl'));
});

test('get_job output schema converts to JSON Schema for tools/list', async () => {
  const { jobSchema } = await loadModule('tools/get-job.ts', 'src');
  assert.doesNotThrow(() => z.toJSONSchema(jobSchema));
});

test('draft public-listing is not published and has no link claim', () => {
  const result = normalizeSubmissionRecord('public-listing', {
    id: 'opp-y', slug: 'draft', status: 'DRAFT', title: 'Draft',
    company: 'Example', expiresAt: null,
  });
  assert.equal(result.published, false);
  assert.equal(result.stale, false);
});
