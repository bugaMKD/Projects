import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDraftBaselineConfig,
  DEFAULT_VARIATION_PERCENT,
  DRAFT_VARIATION_MAX,
  validateDraftBaselineConfig,
  isValidDraftBaselineConfig,
} from '../src/models/DraftBaselineConfig.ts';

const original = { name: 'Release Alpha', scopeStoryPoints: 240 };

test('new draft defaults to release mock and ±15% without mutating it', () => {
  const config = createDraftBaselineConfig(original);
  assert.deepEqual(config, { releaseName: 'Release Alpha', scopeStoryPoints: 240, variationPercent: 15 });
  assert.equal(DEFAULT_VARIATION_PERCENT, 15);
  assert.deepEqual(original, { name: 'Release Alpha', scopeStoryPoints: 240 });
  assert.equal(isValidDraftBaselineConfig(config), true);
});

test('draft changes are independent of original mock inputs', () => {
  const draft = createDraftBaselineConfig(original);
  const updated = { ...draft, scopeStoryPoints: 180, variationPercent: 20, releaseName: 'Release Beta' };
  assert.equal(isValidDraftBaselineConfig(updated), true);
  assert.equal(draft.scopeStoryPoints, 240);
  assert.equal(original.scopeStoryPoints, 240);
});

test('variation 0% and upper slider boundary are accepted', () => {
  const draft = createDraftBaselineConfig(original);
  assert.deepEqual(validateDraftBaselineConfig({ ...draft, variationPercent: 0 }), {});
  assert.deepEqual(validateDraftBaselineConfig({ ...draft, variationPercent: DRAFT_VARIATION_MAX }), {});
});

test('rejects empty or whitespace release names', () => {
  assert.equal(validateDraftBaselineConfig({ ...createDraftBaselineConfig(original), releaseName: '  ' }).releaseName, 'Release name is required.');
});

test('rejects zero, negative and non-finite scope', () => {
  const draft = createDraftBaselineConfig(original);
  for (const scope of [0, -1, NaN, Infinity]) {
    assert.ok(validateDraftBaselineConfig({ ...draft, scopeStoryPoints: scope }).scopeStoryPoints);
  }
});

test('rejects out-of-range or non-finite variation', () => {
  const draft = createDraftBaselineConfig(original);
  for (const percent of [-1, 31, NaN, Infinity]) {
    assert.ok(validateDraftBaselineConfig({ ...draft, variationPercent: percent }).variationPercent);
  }
});

test('invalid edits do not mutate a previously valid configuration', () => {
  const draft = createDraftBaselineConfig(original);
  const invalid = { ...draft, scopeStoryPoints: 0 };
  assert.equal(isValidDraftBaselineConfig(invalid), false);
  assert.equal(isValidDraftBaselineConfig(draft), true);
  assert.equal(draft.scopeStoryPoints, 240);
});
