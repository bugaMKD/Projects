import test from 'node:test';
import assert from 'node:assert/strict';
import { getInitialDraftBaselineConfig, getIntegratedMockData } from '../src/data/originalReleaseDataset.ts';
import { createDraftHistoricalFormInput, parseDraftHistoricalFormInput } from '../src/models/DraftHistoricalInput.ts';

const DEFAULT_HISTORY = Object.freeze({ deliveredStoryPoints: 100, seEffectiveDays: 100, qaEffectiveDays: 50 });
const BASE_DRAFT = Object.freeze({ releaseName: 'Release Alpha', scopeStoryPoints: 100, variationPercent: 15 });
const actuals = data => data.chartData.map(p => p.actual).filter(p => p !== null);
const roughly = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

test('4.2.2 default call remains backwards compatible with 4.1', () => {
  const defaultData = getIntegratedMockData();
  const explicit = getIntegratedMockData(getInitialDraftBaselineConfig(), DEFAULT_HISTORY);
  assert.deepEqual(defaultData, explicit);
  assert.equal(defaultData.chartData[0].sprint, 'Start');
});

test('historical delivered SP affects throughput with fixed sprint capacity', () => {
  const original = getIntegratedMockData(BASE_DRAFT, DEFAULT_HISTORY);
  const changed = getIntegratedMockData(BASE_DRAFT, { ...DEFAULT_HISTORY, deliveredStoryPoints: 200 });
  roughly(original.scenarioThroughputs.realistic, 10);
  roughly(changed.scenarioThroughputs.realistic, 20);
  assert.deepEqual(original.forecastFinishes, { optimistic: 9, realistic: 10, pessimistic: 12 });
  assert.deepEqual(changed.forecastFinishes, { optimistic: 5, realistic: 5, pessimistic: 6 });
});

test('editing historical SE effective days changes the SE-constrained forecast', () => {
  const changed = getIntegratedMockData(BASE_DRAFT, { ...DEFAULT_HISTORY, seEffectiveDays: 200 });
  roughly(changed.scenarioThroughputs.realistic, 5);
  assert.equal(changed.forecastFinishes.realistic, 20);
});

test('editing historical QA effective days changes the QA-constrained forecast', () => {
  const changed = getIntegratedMockData(BASE_DRAFT, { ...DEFAULT_HISTORY, qaEffectiveDays: 100 });
  roughly(changed.scenarioThroughputs.realistic, 5);
  assert.equal(changed.forecastFinishes.realistic, 20);
});

test('both variation and changed historical productivity feed the same scenarios', () => {
  const change = getIntegratedMockData({ ...BASE_DRAFT, variationPercent: 20 }, { ...DEFAULT_HISTORY, deliveredStoryPoints: 200 });
  roughly(change.scenarioThroughputs.realistic, 20);
  roughly(change.scenarioThroughputs.optimistic, 24);
  roughly(change.scenarioThroughputs.pessimistic, 16);
  assert.deepEqual(change.forecastFinishes, { optimistic: 5, realistic: 5, pessimistic: 7 });
});

test('actual completed SP remain independent when historical data changes', () => {
  const first = getIntegratedMockData(BASE_DRAFT, DEFAULT_HISTORY);
  const changed = getIntegratedMockData(BASE_DRAFT, { ...DEFAULT_HISTORY, deliveredStoryPoints: 500 });
  assert.deepEqual(actuals(first), actuals(changed));
  assert.equal(first.completed, changed.completed);
  assert.equal(first.remaining, changed.remaining);
  assert.equal(changed.chartData.at(-1).sprint, `S${Math.max(changed.forecastFinishes.pessimistic, actuals(changed).length - 1)}`);
});

test('historical form is parsed before it enters forecast data; invalid forms cannot be applied', () => {
  const validForm = createDraftHistoricalFormInput(DEFAULT_HISTORY);
  const parsed = parseDraftHistoricalFormInput({ ...validForm, qaEffectiveDaysText: '12.5' });
  assert.deepEqual(parsed.errors, {});
  assert.ok(parsed.historical);
  const data = getIntegratedMockData(BASE_DRAFT, parsed.historical);
  roughly(data.scenarioThroughputs.realistic, 10); // QA potential is 20; SE remains limiting at 10
  const invalid = parseDraftHistoricalFormInput({ ...validForm, seEffectiveDaysText: '' });
  assert.equal(invalid.historical, null);
  assert.ok(invalid.errors.seEffectiveDaysText);
});
