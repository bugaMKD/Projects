import test from 'node:test';
import assert from 'node:assert/strict';
import { establishBaseline } from '../src/models/EstablishedBaseline.ts';
import { buildEstablishedBaselineDataset } from '../src/services/establishedBaselineDataset.ts';

const release = { releaseName: 'Test release', scopeStoryPoints: 100, variationPercent: 15 };
const historical = { deliveredStoryPoints: 100, seEffectiveDays: 100, qaEffectiveDays: 50 };
const team = [
  { id: 'se1', name: 'SE', role: 'SE', availableDays: 10, productivity: 1 },
  { id: 'qa1', name: 'QA', role: 'QA', availableDays: 5, productivity: 1 },
];
// Representative output of the already validated 3.3/3.4 cumulative engine.
const source = () => {
  const scope = release.scopeStoryPoints;
  const rates = [11.5, 10, 8.5];
  const completion = { optimistic: 9, realistic: 10, pessimistic: 12 };
  const points = Array.from({ length: 13 }, (_, n) => ({
    sprintNumber: n, sprint: n === 0 ? 'Start' : `S${n}`, scope,
    optimistic: Math.min(scope, n * rates[0]),
    realistic: Math.min(scope, n * rates[1]),
    pessimistic: Math.min(scope, n * rates[2]),
    actual: n <= 4 ? [0, 29, 54, 88, 116][n] : null,
  }));
  return { chartData: points, completed:116, remaining:0,
    originalAtCurrentSprint:{optimistic:46,realistic:40,pessimistic:34},
    forecastFinishes:completion, forecastStatus:'forecastable',
    scenarioThroughputs:{optimistic:11.5,realistic:10,pessimistic:8.5} };
};
const establish = () => establishBaseline(release, historical, team, source());

test('snapshot preserves baseline inputs and completion sprints', () => {
  const bl = establish();
  assert.equal(bl.release.scopeStoryPoints, 100);
  assert.equal(bl.historical.deliveredStoryPoints, 100);
  assert.equal(bl.sprintMembers.length, 2);
  assert.deepEqual(bl.forecast.forecastFinishes, { optimistic: 9, realistic: 10, pessimistic: 12 });
});

test('snapshot does not share input object references', () => {
  const bl = establish();
  release.releaseName = 'Changed'; team[0].availableDays = 3; historical.deliveredStoryPoints = 400;
  assert.equal(bl.release.releaseName, 'Test release');
  assert.equal(bl.sprintMembers[0].availableDays, 10);
  assert.equal(bl.historical.deliveredStoryPoints, 100);
  release.releaseName = 'Test release'; team[0].availableDays = 10; historical.deliveredStoryPoints = 100;
});

test('snapshot baseline forecast lines are frozen', () => {
  const bl = establish();
  assert.equal(Object.isFrozen(bl.forecast.points), true);
  assert.equal(Object.isFrozen(bl.forecast.points[0]), true);
  assert.equal(Object.isFrozen(bl.forecast.forecastFinishes), true);
});

test('new actual delivery does not change frozen forecast', () => {
  const bl = establish();
  const a = buildEstablishedBaselineDataset(bl, [4, 8]);
  const b = buildEstablishedBaselineDataset(bl, [40, 2]);
  for (const key of ['scope', 'optimistic', 'realistic', 'pessimistic']) {
    assert.deepEqual(a.chartData.map(p => p[key]), b.chartData.map(p => p[key]));
  }
  assert.equal(a.completed, 12);
  assert.equal(b.completed, 42);
  assert.deepEqual(a.forecastFinishes, b.forecastFinishes);
});

test('actuals extending beyond pessimistic completion extend chart and preserve BL at scope', () => {
  const bl = establish();
  const data = buildEstablishedBaselineDataset(bl, Array(15).fill(5));
  assert.equal(data.chartData.at(-1).sprint, 'S15');
  assert.equal(data.chartData.at(-1).actual, 75);
  assert.equal(data.chartData.at(-1).optimistic, 100);
  assert.equal(data.chartData.at(-1).realistic, 100);
  assert.equal(data.chartData.at(-1).pessimistic, 100);
  assert.equal(data.forecastFinishes.pessimistic, 12);
});

test('actuals may exceed scope without rewriting the scope baseline', () => {
  const data = buildEstablishedBaselineDataset(establish(), [60, 60]);
  assert.equal(data.completed, 120);
  assert.equal(data.remaining, 0);
  assert.equal(data.chartData[2].scope, 100);
});

test('invalid actual delivery is rejected', () => {
  assert.throws(() => buildEstablishedBaselineDataset(establish(), [1, -2]));
  assert.throws(() => buildEstablishedBaselineDataset(establish(), [Infinity]));
});

test('rejects a forecast created using a different scope', () => {
  const dataset = source();
  assert.throws(() => establishBaseline({ ...release, scopeStoryPoints: 101 }, historical, team, dataset));
});

test('established values reproduce the current draft before actuals change', () => {
  const draft = source();
  const bl = establish();
  const merged = buildEstablishedBaselineDataset(bl, [29, 25, 34, 28]);
  assert.deepEqual(merged.chartData, draft.chartData);
  assert.deepEqual(merged.forecastFinishes, draft.forecastFinishes);
});
