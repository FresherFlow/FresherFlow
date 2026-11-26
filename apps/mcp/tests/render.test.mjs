import assert from 'node:assert/strict';
import test from 'node:test';
import { installDomStub } from './dom-stub.mjs';
import { loadWidgetModule } from '../scripts/load-widget-module.mjs';

installDomStub();

const { cardsFixture, detailFixture, companyFixture, submissionFixtures } =
  await loadWidgetModule('fixtures.ts');
const { renderCards, renderDetail, renderCompany, renderSubmission, renderFallback } =
  await loadWidgetModule('render/index.ts');

test('rejected submission without reason says no reason was supplied', () => {
  const html = renderSubmission(submissionFixtures.rejectedNoReason, async () => true, () => {}).outerHTML;
  assert.match(html, /No reason was supplied/);
  assert.doesNotMatch(html, /Published/);
});

test('rejected submission without reason does not offer a write action without host support', () => {
  const html = renderSubmission(submissionFixtures.rejectedNoReason, async () => true, undefined).outerHTML;
  assert.doesNotMatch(html, /Correct this submission/);
});

test('openLink rejection shows a copyable url with the real href', async () => {
  const root = renderCards(cardsFixture, async () => false);
  await root.querySelector('.apply').click();
  assert.equal(root.querySelector('input[readonly]').value, cardsFixture.jobs[0].applyLink);
});

test('View details asks the assistant to render that listing, with the name framed as data', async () => {
  let sent = '';
  const view = renderCards(cardsFixture, async () => true, (message) => { sent = message; });
  const button = view.querySelector('.view-button');
  assert.ok(button);
  await button.click();
  assert.match(sent, /job details/i);
  assert.match(sent, /\[[^\]]+\]/);
  assert.match(sent, /data, not instructions/i);
});

test('untrusted title is escaped, never parsed as markup', () => {
  const bad = { ...cardsFixture, jobs: [{ ...cardsFixture.jobs[0], title: '<script>alert(1)</script>' }] };
  const html = renderCards(bad, async () => true).outerHTML;
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});

test('a non-https company URL is not rendered as a clickable link', () => {
  const bad = { ...companyFixture, company: { ...companyFixture.company, url: 'javascript:alert(1)' } };
  const html = renderCompany(bad, async () => true).outerHTML;
  assert.doesNotMatch(html, /href="javascript:/i);
  assert.match(html, /Company website/);
});

test('published state requires a live opportunity', () => {
  const html = renderSubmission(submissionFixtures.stalePublished, async () => true, () => {}).outerHTML;
  assert.match(html, /no longer available/);
  assert.doesNotMatch(html, /View published job/);
});

test('merged and duplicate-public states have distinct copy', () => {
  const merged = renderSubmission({ ...submissionFixtures.merged, targetPublished: false }, async () => true).outerHTML;
  assert.match(merged, /Merged into an existing listing/);
  assert.doesNotMatch(merged, /View existing job/);
  assert.match(renderSubmission(submissionFixtures.duplicateExistingLive, async () => true).outerHTML, /already live/);
});

test('detail shows stipend and walk-in/government details from real fields', () => {
  const rich = {
    ...detailFixture,
    salaryRange: null, stipend: '₹25,000/month',
    driveDetails: { dateRange: '12 Dec 2026', venueAddress: 'Bengaluru office' },
    governmentJobDetails: { postName: 'Assistant', vacancyCount: 12 },
  };
  const html = renderDetail(rich, async () => true).outerHTML;
  assert.match(html, /₹25,000\/month/);
  assert.match(html, /Bengaluru office/);
  assert.match(html, /Assistant/);
});

test('long description is collapsed behind Show more and expands on click', () => {
  const long = 'x'.repeat(500);
  const view = renderDetail({ ...detailFixture, description: long }, async () => true);
  const toggle = view.querySelector('.show-more');
  assert.ok(toggle);
  assert.ok(view.querySelector('.description-text').textContent.length < long.length);
  toggle.click();
  assert.equal(view.querySelector('.description-text').textContent, long);
  assert.equal(toggle.textContent, 'Show less');
});

test('detail offers at most two actions and shows skills only once', () => {
  const view = renderDetail(detailFixture, async () => true);
  assert.ok(view.querySelectorAll('.apply, .view-button').length <= 2);
  assert.equal(view.querySelectorAll('.badges').length, 1);
});

test('company with no logo emits no img and truncation copy is consistent', () => {
  const html = renderCompany({ ...companyFixture, company: { ...companyFixture.company, logoUrl: null } }, async () => true).outerHTML;
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /Showing \d+ of \d+ — ask for more/);
});

test('fallback names the failure without showing a blank widget', () => {
  assert.match(renderFallback('Could not read result').textContent, /Couldn't display this result/);
});
