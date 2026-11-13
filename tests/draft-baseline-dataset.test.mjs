import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDraftBaselineDataset } from '../src/services/draftBaselineDataset.ts';

const historical = { deliveredStoryPoints: 100, seEffectiveDays: 100, qaEffectiveDays: 50 };
const members = [
  { id: 'se', name: 'SE', role: 'SE', availableDays: 10, productivity: 1 },
  { id: 'qa', name: 'QA', role: 'QA', availableDays: 5, productivity: 1 },
];
const defaultDraft = { releaseName: 'Release Alpha', scopeStoryPoints: 100, variationPercent: 15 };
const actuals = [9, 12, 8, 9];
const build = (draft = defaultDraft, points = actuals) =>
  buildDraftBaselineDataset(draft, historical, members, points);

test('default draft uses the validated 10 SP/sprint math and ±15% completion points', () => {
  const data = build();
  assert.deepEqual(data.forecastFinishes, { optimistic: 9, realistic: 10, pessimistic: 12 });
  assert.equal(data.chartData[0].sprint, 'Start');
  assert.equal(data.chartData[1].optimistic, 11.5);
  assert.equal(data.chartData[1].realistic, 10);
  assert.equal(data.chartData[1].pessimistic, 8.5);
});

test('draft scope recalculates all three completion forecasts, without changing actuals', () => {
  const original = build();
  const changed = build({ ...defaultDraft, scopeStoryPoints: 150 });
  assert.deepEqual(changed.forecastFinishes, { optimistic: 14, realistic: 15, pessimistic: 18 });
  assert.deepEqual(original.chartData.slice(0,5).map(p=>p.actual), changed.chartData.slice(0,5).map(p=>p.actual));
  assert.equal(changed.remaining, 112);
  assert.equal(changed.chartData[1].scope, 150);
});

test('variation edits affect optimistic and pessimistic, never realistic', () => {
  const original = build();
  const changed = build({ ...defaultDraft, variationPercent: 20 });
  assert.equal(changed.scenarioThroughputs.realistic, original.scenarioThroughputs.realistic);
  assert.equal(changed.forecastFinishes.realistic, original.forecastFinishes.realistic);
  assert.equal(changed.scenarioThroughputs.optimistic, 12);
  assert.equal(changed.scenarioThroughputs.pessimistic, 8);
  assert.deepEqual(changed.forecastFinishes, { optimistic: 9, realistic: 10, pessimistic: 13 });
});

test('release-name edit does not change any chart points', () => {
  const original = build();
  const renamed = build({ ...defaultDraft, releaseName: 'Release Beta' });
  assert.deepEqual(renamed.chartData, original.chartData);
  assert.deepEqual(renamed.forecastFinishes, original.forecastFinishes);
});

test('actual results can continue beyond the new pessimistic completion sprint', () => {
  const data = build({ ...defaultDraft, scopeStoryPoints: 30 }, Array(9).fill(2));
  assert.equal(data.chartData.at(-1).sprint, 'S9');
  assert.equal(data.chartData.at(-1).actual, 18);
  assert.equal(data.chartData.at(-1).pessimistic, 30);
  assert.equal(data.chartData.at(-1).realistic, 30);
  assert.equal(data.chartData.at(-1).optimistic, 30);
});

test('invalid draft is rejected before it reaches the forecast engine', () => {
  for (const update of [{ scopeStoryPoints: 0 }, { variationPercent: -1 }, { variationPercent: 35 }, { releaseName: ' ' }]) {
    assert.throws(() => build({ ...defaultDraft, ...update }), /Invalid draft baseline configuration/);
  }
});

test('draft config, historical data, capacity and sprint actuals are never mutated', () => {
  const draft = Object.freeze({ ...defaultDraft });
  const immutableActuals = Object.freeze([...actuals]);
  const result = build(draft, immutableActuals);
  assert.equal(draft.scopeStoryPoints, 100);
  assert.deepEqual(immutableActuals, actuals);
  assert.equal(historical.deliveredStoryPoints, 100);
  assert.equal(members[0].availableDays, 10);
  assert.equal(result.completed, 38);
});
