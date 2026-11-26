import assert from 'node:assert/strict';
import test from 'node:test';
import { loadModule } from '../scripts/load-widget-module.mjs';

const { findWalkinsInputSchema, FIND_WALKINS_TOOL_NAME } = await loadModule('tools/find-walkins.ts', 'src');

test('the walk-in tool is named find_walkins', () => {
  assert.equal(FIND_WALKINS_TOOL_NAME, 'find_walkins');
});

test('find_walkins works with a city and no coordinates', () => {
  const parsed = findWalkinsInputSchema.safeParse({ city: 'Hyderabad' });
  assert.equal(parsed.success, true);
});

test('find_walkins rejects a half-specified coordinate pair', () => {
  assert.equal(findWalkinsInputSchema.safeParse({ latitude: 17.4 }).success, false);
  assert.equal(findWalkinsInputSchema.safeParse({ longitude: 78.4 }).success, false);
  assert.equal(findWalkinsInputSchema.safeParse({ latitude: 17.4, longitude: 78.4 }).success, true);
});

test('the local demo fixture path returns drives without calling the API', async () => {
  const { setDemoWalkins, findWalkins } = await loadModule('api/walkins.ts', 'src');
  setDemoWalkins([{ id: 'demo', slug: 'demo', city: 'Hyderabad' }]);
  try {
    const result = await findWalkins({ city: 'Hyderabad' }, null);
    assert.equal(result.total, 1);
    assert.equal(result.walkins[0].id, 'demo');
  } finally {
    setDemoWalkins(null);
  }
});
