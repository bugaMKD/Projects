import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateHistoricalProductivity } from '../src/services/historicalCalculator.ts';
import { calculateTeamCapacity, calculateDeliveryCapacity } from '../src/services/capacityCalculator.ts';

test('historical productivity uses each role effective days, no QA weight', () => {
  const h = calculateHistoricalProductivity({ deliveredStoryPoints: 100, seEffectiveDays: 100, qaEffectiveDays: 50 });
  assert.equal(h.seStoryPointsPerEffectiveDay, 1);
  assert.equal(h.qaStoryPointsPerEffectiveDay, 2);
  assert.equal(h.historicalSeToQaEffectiveDayRatio, 2);
});
test('individual available days × productivity; ratio based on effective days', () => {
  const t = calculateTeamCapacity([
    { id:'se', name:'SE', role:'SE', availableDays:100, productivity:1 },
    { id:'qa1', name:'QA1', role:'QA', availableDays:25, productivity:0.6 },
    { id:'qa2', name:'QA2', role:'QA', availableDays:20, productivity:0.5 },
  ]);
  assert.equal(t.seEffectiveDays, 100);
  assert.equal(t.qaAvailableDays, 45);
  assert.equal(t.qaEffectiveDays, 25);
  assert.equal(t.seToQaEffectiveDayRatio, 4);
});
test('user scenario: historical 100/50; current 100/25 -> deliver 50 of 100', () => {
  const h = calculateHistoricalProductivity({ deliveredStoryPoints:100, seEffectiveDays:100, qaEffectiveDays:50 });
  const t = calculateTeamCapacity([
    {id:'s',name:'SE',role:'SE',availableDays:100,productivity:1},
    {id:'q',name:'QA',role:'QA',availableDays:25,productivity:1},
  ]);
  const d = calculateDeliveryCapacity(100, h, t);
  assert.equal(d.seCodingCapacityStoryPoints, 100);
  assert.equal(d.qaTestingCapacityStoryPoints, 50);
  assert.equal(d.deliverableStoryPoints, 50);
  assert.equal(d.constrainedBy, 'QA');
});
test('se is the bottleneck when current SE effective days are lower', () => {
  const h = calculateHistoricalProductivity({ deliveredStoryPoints:100, seEffectiveDays:100, qaEffectiveDays:50 });
  const t = calculateTeamCapacity([
    {id:'s',name:'SE',role:'SE',availableDays:20,productivity:1},
    {id:'q',name:'QA',role:'QA',availableDays:50,productivity:1},
  ]);
  const d = calculateDeliveryCapacity(100,h,t);
  assert.equal(d.deliverableStoryPoints,20);
  assert.equal(d.constrainedBy,'SE');
});
test('scope caps deliverable work and no engineers means zero delivery', () => {
  const h = calculateHistoricalProductivity({ deliveredStoryPoints:100, seEffectiveDays:100, qaEffectiveDays:50 });
  const enough = calculateTeamCapacity([
    {id:'s',name:'SE',role:'SE',availableDays:100,productivity:1},
    {id:'q',name:'QA',role:'QA',availableDays:50,productivity:1},
  ]);
  assert.equal(calculateDeliveryCapacity(30,h,enough).deliverableStoryPoints,30);
  assert.equal(calculateDeliveryCapacity(30,h,calculateTeamCapacity([])).deliverableStoryPoints,0);
});
test('bad inputs rejected', () => {
  assert.throws(() => calculateHistoricalProductivity({deliveredStoryPoints:100,seEffectiveDays:0,qaEffectiveDays:50}));
  assert.throws(() => calculateTeamCapacity([{id:'x',name:'X',role:'QA',availableDays:10,productivity:1.2}]));
  assert.throws(() => calculateTeamCapacity([{id:'x',name:'X',role:'QA',availableDays:-1,productivity:1}]));
});
