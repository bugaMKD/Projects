/**
 * Three scenarios verified by the user against the original PSP Excel workbook.
 * Keep the historical baseline constant to isolate changes in current capacity.
 * Run: npm test
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateHistoricalProductivity } from '../src/services/historicalCalculator.ts';
import { calculateTeamCapacity, calculateDeliveryCapacity } from '../src/services/capacityCalculator.ts';

const historical = calculateHistoricalProductivity({
  deliveredStoryPoints: 100,
  seEffectiveDays: 100,
  qaEffectiveDays: 50,
});

function simulate({ scope, seDays, seProductivity, qaDays, qaProductivity }) {
  const team = calculateTeamCapacity([
    { id: 'se-1', name: 'SE', role: 'SE', availableDays: seDays, productivity: seProductivity },
    { id: 'qa-1', name: 'QA', role: 'QA', availableDays: qaDays, productivity: qaProductivity },
  ]);
  const delivery = calculateDeliveryCapacity(scope, historical, team);
  return { team, delivery };
}

test('Excel Scenario 1: scope 150, SE 90 × 100%, QA 30 × 100% (QA constraint)', () => {
  const { team, delivery } = simulate({ scope: 150, seDays: 90, seProductivity: 1, qaDays: 30, qaProductivity: 1 });
  assert.equal(historical.seStoryPointsPerEffectiveDay, 1);
  assert.equal(historical.qaStoryPointsPerEffectiveDay, 2);
  assert.equal(team.seEffectiveDays, 90);
  assert.equal(team.qaEffectiveDays, 30);
  assert.equal(team.seToQaEffectiveDayRatio, 3);
  assert.equal(delivery.seCodingCapacityStoryPoints, 90);
  assert.equal(delivery.qaTestingCapacityStoryPoints, 60);
  assert.equal(delivery.deliverableStoryPoints, 60);
  assert.equal(delivery.constrainedBy, 'QA');
  assert.equal(delivery.deliverableStoryPoints / delivery.scopeStoryPoints, 0.4);
});

test('Excel Scenario 2: scope 150, SE 40 × 100%, QA 50 × 100% (SE constraint)', () => {
  const { team, delivery } = simulate({ scope: 150, seDays: 40, seProductivity: 1, qaDays: 50, qaProductivity: 1 });
  assert.equal(team.seEffectiveDays, 40);
  assert.equal(team.qaEffectiveDays, 50);
  assert.equal(team.seToQaEffectiveDayRatio, 0.8);
  assert.equal(delivery.seCodingCapacityStoryPoints, 40);
  assert.equal(delivery.qaTestingCapacityStoryPoints, 100);
  assert.equal(delivery.deliverableStoryPoints, 40);
  assert.equal(delivery.constrainedBy, 'SE');
  assert.ok(Math.abs(delivery.deliverableStoryPoints / delivery.scopeStoryPoints - 40 / 150) < 1e-12);
});

test('Excel Scenario 3: scope 150, SE 100 × 80%, QA 40 × 75% (effective days)', () => {
  const { team, delivery } = simulate({ scope: 150, seDays: 100, seProductivity: 0.8, qaDays: 40, qaProductivity: 0.75 });
  assert.equal(team.seAvailableDays, 100);
  assert.equal(team.qaAvailableDays, 40);
  assert.equal(team.seEffectiveDays, 80);
  assert.equal(team.qaEffectiveDays, 30);
  assert.ok(Math.abs(team.seToQaEffectiveDayRatio - 80 / 30) < 1e-12);
  assert.equal(delivery.seCodingCapacityStoryPoints, 80);
  assert.equal(delivery.qaTestingCapacityStoryPoints, 60);
  assert.equal(delivery.deliverableStoryPoints, 60);
  assert.equal(delivery.constrainedBy, 'QA');
  assert.equal(delivery.deliverableStoryPoints / delivery.scopeStoryPoints, 0.4);
});
