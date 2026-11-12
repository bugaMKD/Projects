import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRealisticSprintForecast } from '../src/services/realisticSprintForecast.ts';

const historical = {
  deliveredStoryPoints: 100,
  seEffectiveDays: 100,
  qaEffectiveDays: 50,
};

const member = (id, role, availableDays, productivity = 1) => ({
  id, name: id, role, availableDays, productivity,
});

test('historical 100 SE days / 50 QA days; next sprint 10 SE / 5 QA yields 10 SP', () => {
  const result = calculateRealisticSprintForecast(historical, [
    member('se', 'SE', 10), member('qa', 'QA', 5),
  ]);
  assert.equal(result.historicalSeStoryPointsPerEffectiveDay, 1);
  assert.equal(result.historicalQaStoryPointsPerEffectiveDay, 2);
  assert.equal(result.seCodingCapacityStoryPoints, 10);
  assert.equal(result.qaTestingCapacityStoryPoints, 10);
  assert.equal(result.realisticStoryPointsPerSprint, 10);
  assert.equal(result.constrainedBy, 'SE and QA');
});

test('QA bottleneck: 15 SE / 5 QA days yields 10 SP', () => {
  const result = calculateRealisticSprintForecast(historical, [
    member('se', 'SE', 15), member('qa', 'QA', 5),
  ]);
  assert.equal(result.seCodingCapacityStoryPoints, 15);
  assert.equal(result.qaTestingCapacityStoryPoints, 10);
  assert.equal(result.realisticStoryPointsPerSprint, 10);
  assert.equal(result.constrainedBy, 'QA');
});

test('SE bottleneck: 7 SE / 5 QA days yields 7 SP', () => {
  const result = calculateRealisticSprintForecast(historical, [
    member('se', 'SE', 7), member('qa', 'QA', 5),
  ]);
  assert.equal(result.realisticStoryPointsPerSprint, 7);
  assert.equal(result.constrainedBy, 'SE');
});

test('individual productivity is applied to capacity, before the role bottleneck', () => {
  const result = calculateRealisticSprintForecast(historical, [
    member('se-1', 'SE', 10, 0.8),
    member('se-2', 'SE', 5, 0.8),
    member('qa-1', 'QA', 5, 0.75),
  ]);
  assert.equal(result.seEffectiveDays, 12);
  assert.equal(result.qaEffectiveDays, 3.75);
  assert.equal(result.seCodingCapacityStoryPoints, 12);
  assert.equal(result.qaTestingCapacityStoryPoints, 7.5);
  assert.equal(result.realisticStoryPointsPerSprint, 7.5);
  assert.equal(result.constrainedBy, 'QA');
});

test('zero QA effective days means zero deliverable SP for the sprint', () => {
  const result = calculateRealisticSprintForecast(historical, [
    member('se', 'SE', 10), member('qa', 'QA', 0),
  ]);
  assert.equal(result.realisticStoryPointsPerSprint, 0);
  assert.equal(result.constrainedBy, 'QA');
});

test('historical release duration is not an input', () => {
  assert.deepEqual(Object.keys(historical).sort(), [
    'deliveredStoryPoints', 'qaEffectiveDays', 'seEffectiveDays',
  ]);
  const result = calculateRealisticSprintForecast(historical, [
    member('se', 'SE', 10), member('qa', 'QA', 5),
  ]);
  assert.equal(result.realisticStoryPointsPerSprint, 10);
});

test('reuses Iteration 2 validation for bad historical values and productivity', () => {
  assert.throws(() => calculateRealisticSprintForecast(
    { ...historical, qaEffectiveDays: 0 }, [member('se', 'SE', 10)],
  ));
  assert.throws(() => calculateRealisticSprintForecast(
    historical, [member('se', 'SE', 10, 1.2)],
  ));
});
