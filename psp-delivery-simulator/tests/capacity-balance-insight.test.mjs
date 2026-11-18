import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCapacityBalanceInsight as calculate, formatCapacityGapPercent, formatCapacityShortfall } from '../src/services/capacityBalanceInsight.ts';
const input = (se, qa, historicalDeliveredStoryPoints=100, historicalSeEffectiveDays=100, historicalQaEffectiveDays=50) => ({
  sePotentialStoryPointsPerSprint:se,
  qaPotentialStoryPointsPerSprint:qa,
  historicalDeliveredStoryPoints,
  historicalSeEffectiveDays,
  historicalQaEffectiveDays,
});
test('below five percent remains visually Balanced while revealing the actual gap',()=>{
  const result = calculate(input(100,99));
  assert.equal(result.label,'Balanced');
  assert.equal(result.severity,'balanced');
  assert.equal(result.limitingRole,'QA');
  assert.equal(result.gapPercent,1);
  assert.equal(result.additionalEffectiveDays,0.5);
  assert.equal(formatCapacityGapPercent(result.gapPercent),'1% gap');
});
test('exactly five percent remains Balanced, just above becomes moderate',()=>{
  assert.equal(calculate(input(100,95)).label,'Balanced');
  assert.equal(calculate(input(100,94.9)).severity,'moderate');
  assert.equal(calculate(input(100,85)).severity,'moderate');
  assert.equal(calculate(input(100,84.9)).severity,'high');
});
test('QA bottleneck converts SP deficit into QA effective days',()=>{
  const result = calculate(input(100,92));
  assert.equal(result.label,'QA limiting');
  assert.equal(result.gapPercent,8);
  assert.equal(result.additionalEffectiveDays,4);
  assert.equal(formatCapacityShortfall(result),'4 additional effective QA days/sprint');
});
test('SE bottleneck uses SE historical productivity, not QA',()=>{
  const result = calculate(input(70,100));
  assert.equal(result.label,'SE limiting');
  assert.equal(result.gapPercent,30);
  assert.equal(result.additionalEffectiveDays,30);
  assert.equal(result.severity,'high');
});
test('fully balanced capacity has zero gap and no shortfall',()=>{
  const result = calculate(input(90,90));
  assert.equal(result.label,'Balanced');
  assert.equal(result.additionalEffectiveDays,0);
  assert.equal(formatCapacityShortfall(result),'No effective-day shortfall');
});
test('both roles with zero capacity are unavailable, not falsely balanced',()=>{
  const result = calculate(input(0,0));
  assert.equal(result.label,'No delivery capacity');
  assert.equal(result.gapPercent,null);
  assert.equal(result.severity,'unavailable');
});
test('one role with zero potential has full gap, shortfall when productivity known',()=>{
  const result = calculate(input(100,0));
  assert.equal(result.label,'QA limiting');
  assert.equal(result.gapPercent,100);
  assert.equal(result.additionalEffectiveDays,50);
});
test('missing data and missing historical productivity do not report bogus days',()=>{
  assert.equal(calculate(input(null,100)).label,'Not available');
  const result=calculate(input(100,80,100,100,0));
  assert.equal(result.label,'QA limiting');
  assert.equal(result.additionalEffectiveDays,null);
  assert.equal(formatCapacityShortfall(result),'Effective-day shortfall unavailable');
});
