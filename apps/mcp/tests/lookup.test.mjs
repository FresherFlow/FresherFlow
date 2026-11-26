import assert from 'node:assert/strict';
import test from 'node:test';
import { loadModule } from '../scripts/load-widget-module.mjs';

const { setApiBaseUrl, runWithAccessToken, getMySubmission, SubmissionLookupError } =
  await loadModule('tests/helpers/lookup-entry.ts', '.');

setApiBaseUrl('https://api.example.com');

function stubFetch(status, body) {
  globalThis.fetch = async () => new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

test('getMySubmission preserves kind on success', async () => {
  stubFetch(200, { success: true, kind: 'public-listing', submission: { id: 'opp-1', status: 'PUBLISHED' } });
  const result = await runWithAccessToken('token', () => getMySubmission('opp-1'));
  assert.equal(result.kind, 'public-listing');
  assert.equal(result.data.status, 'PUBLISHED');
});

test('getMySubmission turns only 404 into SubmissionLookupError', async () => {
  stubFetch(404, { error: { message: 'Submission not found.' } });
  await assert.rejects(
    () => runWithAccessToken('token', () => getMySubmission('missing')),
    SubmissionLookupError,
  );
});

test('getMySubmission leaves 401 as a generic failure', async () => {
  stubFetch(401, { error: { message: 'Unauthorized' } });
  await assert.rejects(
    () => runWithAccessToken('token', () => getMySubmission('sub-1')),
    (error) => error.name !== 'SubmissionLookupError',
  );
});
