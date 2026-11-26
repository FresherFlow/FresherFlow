import assert from 'node:assert/strict';
import test from 'node:test';
import { loadWidgetModule } from '../scripts/load-widget-module.mjs';

const { safeHttpsUrl, safeLogoUrl, titleCase, typeLabel, workModeLabel, day } =
  await loadWidgetModule('guards.ts');

test('safeHttpsUrl rejects http, credentials, oversized and junk URLs', () => {
  assert.equal(safeHttpsUrl('http://jobs.example.com'), undefined);
  assert.equal(safeHttpsUrl('https://u:p@jobs.example.com'), undefined);
  assert.equal(safeHttpsUrl('x'.repeat(2049)), undefined);
  assert.equal(safeHttpsUrl('not a url'), undefined);
  assert.equal(safeHttpsUrl('https://jobs.example.com/a?b=1'), 'https://jobs.example.com/a?b=1');
});

test('safeLogoUrl accepts only allowlisted CDN and Clearbit hosts', () => {
  assert.equal(safeLogoUrl('https://cdn.fresherflow.in/logo.png'), 'https://cdn.fresherflow.in/logo.png');
  assert.equal(safeLogoUrl('https://img.cdn.fresherflow.in/logo.png'), 'https://img.cdn.fresherflow.in/logo.png');
  assert.equal(safeLogoUrl('https://logo.clearbit.com/amazon.jobs'), 'https://logo.clearbit.com/amazon.jobs');
  assert.equal(safeLogoUrl('https://evilcdn.fresherflow.in/logo.png'), undefined);
  assert.equal(safeLogoUrl('https://cdn.fresherflow.in.evil.com/logo.png'), undefined);
  assert.equal(safeLogoUrl('https://logo.clearbit.com.evil.com/logo.png'), undefined);
});

test('day formats in Asia/Kolkata regardless of host locale', () => {
  assert.equal(day('2026-11-26T19:30:00Z'), '27 Nov');
});

test('typeLabel normalizes employment types only', () => {
  assert.equal(typeLabel({ employmentTypes: ['EMPLOYMENT'] }), 'Job');
  assert.equal(typeLabel({ employmentTypes: ['WALK_IN'] }), 'Walk-in');
});

test('workModeLabel normalizes work mode separately', () => {
  assert.equal(workModeLabel({ workMode: 'ONSITE' }), 'On-site');
});

test('titleCase turns slugs into readable labels', () => {
  assert.equal(titleCase('java-script'), 'Java Script');
});
