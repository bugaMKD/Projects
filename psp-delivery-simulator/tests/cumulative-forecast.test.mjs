import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCumulativeForecast } from '../src/services/cumulativeForecast.ts';

const variation = (realistic, percent = 15) => ({
  optimisticStoryPointsPerSprint: realistic * (1 + percent / 100),
  realisticStoryPointsPerSprint: realistic,
  pessimisticStoryPointsPerSprint: realistic * (1 - percent / 100),
});

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test('Scenario 1: scope 100, 10 SP/sprint, ±15% => completion 9/10/12', () => {
  const result = generateCumulativeForecast(100, variation(10));
  assert.equal(result.status, 'forecastable');
  assert.deepEqual(result.completionSprints, { optimistic: 9, realistic: 10, pessimistic: 12 });
  assert.equal(result.points.length, 13);
  assert.deepEqual(result.points[0], {
    sprintNumber: 0, sprint: 'Start', scope: 100,
    optimistic: 0, realistic: 0, pessimistic: 0,
  });
  assert.equal(result.points[1].sprint, 'S1');
  near(result.points[1].optimistic, 11.5);
  near(result.points[1].realistic, 10);
  near(result.points[1].pessimistic, 8.5);
  assert.equal(result.points[9].optimistic, 100);
  assert.equal(result.points[10].optimistic, 100);
  assert.equal(result.points[11].realistic, 100);
  assert.equal(result.points[12].pessimistic, 100);
});

test('Scenario 2: scope 150, 20 SP/sprint, ±15% => completion 7/8/9', () => {
  const r = generateCumulativeForecast(150, variation(20));
  assert.deepEqual(r.completionSprints, { optimistic: 7, realistic: 8, pessimistic: 9 });
  assert.equal(r.points.at(-1).sprint, 'S9');
});

test('Scenario 3: scope 150, 7 SP/sprint, ±15% => completion 19/22/26', () => {
  const r = generateCumulativeForecast(150, variation(7));
  assert.deepEqual(r.completionSprints, { optimistic: 19, realistic: 22, pessimistic: 26 });
  assert.equal(r.points.length, 27);
});

test('zero release scope finishes at Start without needing throughput', () => {
  const r = generateCumulativeForecast(0, variation(0));
  assert.deepEqual(r.completionSprints, { optimistic: 0, realistic: 0, pessimistic: 0 });
  assert.equal(r.status, 'forecastable');
  assert.equal(r.points.length, 1);
  assert.equal(r.points[0].sprint, 'Start');
});

test('zero throughput with positive remaining scope is not forecastable', () => {
  const r = generateCumulativeForecast(100, variation(0));
  assert.equal(r.status, 'not-forecastable');
  assert.deepEqual(r.completionSprints, { optimistic: null, realistic: null, pessimistic: null });
  assert.equal(r.points.length, 1);
});

test('all forecast series remain flat at scope after completion', () => {
  const r = generateCumulativeForecast(100, variation(10));
  for (const p of r.points) {
    for (const key of ['optimistic', 'realistic', 'pessimistic']) {
      assert.ok(p[key] >= 0 && p[key] <= 100);
    }
  }
  assert.ok(r.points.slice(9).every(p => p.optimistic === 100));
  assert.ok(r.points.slice(10).every(p => p.realistic === 100));
});

test('fractional throughputs are not rounded between sprints', () => {
  const r = generateCumulativeForecast(10, variation(2.125, 20));
  near(r.points[1].realistic, 2.125);
  near(r.points[2].realistic, 4.25);
  near(r.points[1].pessimistic, 1.7);
});

test('future update-compatible starting point can begin at completed sprint', () => {
  const r = generateCumulativeForecast(100, variation(10), {
    startSprint: 4, startingCompletedStoryPoints: 35,
  });
  assert.equal(r.points[0].sprint, 'S4');
  assert.equal(r.points[0].realistic, 35);
  assert.deepEqual(r.completionSprints, { optimistic: 10, realistic: 11, pessimistic: 12 });
  assert.equal(r.points[1].realistic, 45);
});

test('invalid capacity, scope, and starting values fail clearly', () => {
  assert.throws(() => generateCumulativeForecast(-1, variation(10)));
  assert.throws(() => generateCumulativeForecast(100, variation(-1)));
  assert.throws(() => generateCumulativeForecast(100, variation(10), { startSprint: -1 }));
  assert.throws(() => generateCumulativeForecast(100, variation(10), { startingCompletedStoryPoints: 101 }));
  assert.throws(() => generateCumulativeForecast(100, variation(10), { startSprint: 1.5 }));
});

test('a wildly long forecast is rejected instead of allocating huge datasets', () => {
  assert.throws(() => generateCumulativeForecast(100, variation(0.001)));
});
