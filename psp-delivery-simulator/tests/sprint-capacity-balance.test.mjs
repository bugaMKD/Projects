import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSprintCapacityBalance } from '../src/services/sprintCapacityBalance.ts';

const history = {deliveredStoryPoints: 120, seEffectiveDays: 60, qaEffectiveDays: 30};
const result = (seEffectiveDays, qaEffectiveDays, historical = history) =>
  calculateSprintCapacityBalance({seEffectiveDays, qaEffectiveDays}, historical);

test('balanced capacity when actual role potential is equal', () => {
  assert.equal(result(20, 10).label, 'Balanced'); // 40 SP potential for each role
  assert.equal(result(20, 10).sePotentialStoryPoints, 40);
  assert.equal(result(20, 10).qaPotentialStoryPoints, 40);
});
test('SE constrains potential throughput', () => assert.equal(result(12, 10).label, 'SE limiting'));
test('QA constrains potential throughput', () => assert.equal(result(20, 6).label, 'QA limiting'));
test('zero effective days in both roles is not balanced', () => assert.equal(result(0, 0).label, 'No delivery capacity'));
test('one role with zero effective days is limiting', () => {
  assert.equal(result(0, 10).label, 'SE limiting');
  assert.equal(result(20, 0).label, 'QA limiting');
});
test('legacy records with missing effort show Not available rather than zero', () => {
  assert.equal(result(null, 10).label, 'Not available');
  assert.equal(result(20, null).label, 'Not available');
});
test('unusable historical ratios show Not available', () => {
  assert.equal(result(20, 10, {...history, seEffectiveDays: 0}).label, 'Not available');
  assert.equal(result(20, 10, {...history, deliveredStoryPoints: 0}).label, 'Not available');
});
test('comparison is tolerant of insignificant floating-point differences', () => {
  assert.equal(result(20, 10 + 1e-11).label, 'Balanced');
});
test('release-specific historical ratios determine capacity label', () => {
  assert.equal(result(20, 10).label, 'Balanced');
  assert.equal(result(20, 10, {...history, qaEffectiveDays: 60}).label, 'QA limiting');
});
test('actual SP not involved in the capacity constraint calculation', () => {
  const a = calculateSprintCapacityBalance({seEffectiveDays:20,qaEffectiveDays:10,completedStoryPoints:1},history);
  const b = calculateSprintCapacityBalance({seEffectiveDays:20,qaEffectiveDays:10,completedStoryPoints:100},history);
  assert.deepEqual(a,b);
});
