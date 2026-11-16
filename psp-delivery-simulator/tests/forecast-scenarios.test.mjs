import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSprintForecastScenarios } from '../src/services/forecastScenarios.ts';

// Same validated historical data as Iterations 2 and 3.1.
const historical = { deliveredStoryPoints: 100, seEffectiveDays: 100, qaEffectiveDays: 50 };
const team = (se, qa, seProductivity = 1, qaProductivity = 1) => [
  { id: 'se', name: 'SE', role: 'SE', availableDays: se, productivity: seProductivity },
  { id: 'qa', name: 'QA', role: 'QA', availableDays: qa, productivity: qaProductivity },
];
const closeTo = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} !== ${expected}`);

test('default 15% variation around 10 SP/sprint', () => {
  const r = calculateSprintForecastScenarios(historical, team(10, 5));
  assert.equal(r.variationPercent, 15);
  closeTo(r.optimisticStoryPointsPerSprint, 11.5);
  closeTo(r.realisticStoryPointsPerSprint, 10);
  closeTo(r.pessimisticStoryPointsPerSprint, 8.5);
  assert.equal(r.constrainedBy, 'SE and QA');
});

test('configurable 10% variation around 20 SP/sprint', () => {
  const r = calculateSprintForecastScenarios(historical, team(30, 10), 10);
  closeTo(r.optimisticStoryPointsPerSprint, 22);
  closeTo(r.realisticStoryPointsPerSprint, 20);
  closeTo(r.pessimisticStoryPointsPerSprint, 18);
  assert.equal(r.constrainedBy, 'QA');
});

test('configurable 20% variation around 7 SP/sprint', () => {
  const r = calculateSprintForecastScenarios(historical, team(7, 5), 20);
  closeTo(r.optimisticStoryPointsPerSprint, 8.4);
  closeTo(r.realisticStoryPointsPerSprint, 7);
  closeTo(r.pessimisticStoryPointsPerSprint, 5.6);
  assert.equal(r.constrainedBy, 'SE');
});

test('individual productivity is applied by step 3.1 before scenario variation', () => {
  // SE 30×80%=24 effective days; QA 15×70%=10.5 effective days;
  // realistic=min(24×1,10.5×2)=21 SP (full-precision convention).
  const r = calculateSprintForecastScenarios(historical, team(30, 15, 0.8, 0.7), 15);
  closeTo(r.seCodingCapacityStoryPoints, 24);
  closeTo(r.qaTestingCapacityStoryPoints, 21);
  closeTo(r.realisticStoryPointsPerSprint, 21);
  closeTo(r.optimisticStoryPointsPerSprint, 24.15);
  closeTo(r.pessimisticStoryPointsPerSprint, 17.85);
});

test('0% variation gives three identical throughputs', () => {
  const r = calculateSprintForecastScenarios(historical, team(10, 5), 0);
  assert.equal(r.optimisticStoryPointsPerSprint, 10);
  assert.equal(r.realisticStoryPointsPerSprint, 10);
  assert.equal(r.pessimisticStoryPointsPerSprint, 10);
});

test('zero QA capacity yields zero in all scenarios', () => {
  const r = calculateSprintForecastScenarios(historical, team(10, 0));
  assert.equal(r.optimisticStoryPointsPerSprint, 0);
  assert.equal(r.realisticStoryPointsPerSprint, 0);
  assert.equal(r.pessimisticStoryPointsPerSprint, 0);
});

test('reject invalid uncertainty values', () => {
  for (const bad of [-1, 100, 101, NaN, Infinity, -Infinity]) {
    assert.throws(() => calculateSprintForecastScenarios(historical, team(10, 5), bad));
  }
});
