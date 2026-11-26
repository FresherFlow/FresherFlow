import assert from 'node:assert/strict';
import test from 'node:test';
import { loadWidgetModule } from '../scripts/load-widget-module.mjs';

const { parseWidgetMessage, asJobs, asSubmissionRecord } = await loadWidgetModule('widget-data.ts');

test('unknown view falls back instead of throwing', () => {
  assert.equal(parseWidgetMessage({ view: 'basket', kind: 'tool-result', data: {} }), undefined);
});

test('unknown kind falls back', () => {
  assert.equal(parseWidgetMessage({ view: 'submission', kind: 'made-up', data: {} }), undefined);
});

test('valid envelope passes', () => {
  assert.equal(parseWidgetMessage({ view: 'cards', kind: 'tool-result', data: { jobs: [] } }).view, 'cards');
});

test('malformed data is rejected, not crashed on', () => {
  assert.equal(asJobs({ jobs: 'not-an-array' }), undefined);
  assert.equal(asSubmissionRecord({ status: 42 }), undefined);
});

test('error envelope is accepted', () => {
  const message = parseWidgetMessage({ view: 'submission', kind: 'error', data: { message: 'Submission not found' } });
  assert.equal(message.kind, 'error');
});
