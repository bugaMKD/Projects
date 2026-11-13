import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReleaseChartDataset } from '../src/services/releaseChartData.ts';

const historical = { deliveredStoryPoints: 100, seEffectiveDays: 100, qaEffectiveDays: 50 };
const members = [
  { id: 'se', name: 'SE', role: 'SE', availableDays: 10, productivity: 1 },
  { id: 'qa', name: 'QA', role: 'QA', availableDays: 5, productivity: 1 },
];
const build = (overrides = {}) => buildReleaseChartDataset({
  originalScopeStoryPoints: 100,
  historical,
  originalSprintMembers: members,
  variationPercent: 15,
  completedSprintPoints: [9, 12, 8, 9],
  ...overrides,
});
const close = (a,b) => assert.ok(Math.abs(a-b)<1e-9, `${a} != ${b}`);

test('forecast points match validated 3.3 cumulative results and display Start', () => {
  const result = build();
  assert.deepEqual(result.forecastFinishes, { optimistic: 9, realistic: 10, pessimistic: 12 });
  assert.equal(result.chartData.length, 13);
  assert.deepEqual(result.chartData[0], {
    sprint: 'Start', sprintNumber: 0, scope: 100,
    optimistic: 0, realistic: 0, pessimistic: 0, actual: 0,
  });
  close(result.chartData[1].optimistic, 11.5);
  close(result.chartData[1].realistic, 10);
  close(result.chartData[1].pessimistic, 8.5);
  assert.equal(result.chartData[12].pessimistic, 100);
  assert.equal(result.chartData[12].sprint, 'S12');
});

test('actual results remain independent and stop after last completed sprint', () => {
  const result = build();
  assert.deepEqual(result.chartData.slice(0, 5).map(p=>p.actual), [0,9,21,29,38]);
  assert.ok(result.chartData.slice(5).every(p=>p.actual===null));
  assert.equal(result.completed, 38);
  assert.equal(result.remaining, 62);
  assert.equal(result.originalAtCurrentSprint.realistic, 40);
});

test('critical: actual can extend BEYOND pessimistic completion; forecast lines stay flat', () => {
  const completedSprintPoints = Array(15).fill(5); // 75 SP by S15; pessimistic predicted S12.
  const result = build({ completedSprintPoints });
  assert.equal(result.chartData.length, 16);
  assert.equal(result.chartData.at(-1).sprint, 'S15');
  assert.equal(result.chartData.at(-1).actual, 75);
  assert.equal(result.chartData.at(-1).optimistic, 100);
  assert.equal(result.chartData.at(-1).realistic, 100);
  assert.equal(result.chartData.at(-1).pessimistic, 100);
  assert.deepEqual(result.forecastFinishes, { optimistic: 9, realistic: 10, pessimistic: 12 });
});

test('changing actuals does not alter original cumulative forecasts', () => {
  const a = build({completedSprintPoints:[4,5,6]});
  const b = build({completedSprintPoints:[25,1,0]});
  for(const field of ['scope','optimistic','realistic','pessimistic']) {
    assert.deepEqual(a.chartData.map(p=>p[field]),b.chartData.map(p=>p[field]));
  }
});

test('mock data can have more actual SP than baseline scope without truncation', () => {
  const result=build({completedSprintPoints:[60,50]});
  assert.equal(result.completed,110);
  assert.equal(result.remaining,0);
  assert.equal(result.chartData[2].actual,110);
  assert.equal(result.chartData[2].scope,100);
});

test('invalid actual story points are rejected', () => {
  assert.throws(()=>build({completedSprintPoints:[10,-1]}));
  assert.throws(()=>build({completedSprintPoints:[Infinity]}));
});

test('zero-throughput forecast cannot falsely display flat completed lines', () => {
  const noQa=[{id:'se',name:'SE',role:'SE',availableDays:10,productivity:1}];
  const r=build({originalSprintMembers:noQa, completedSprintPoints:[3,4]});
  assert.equal(r.forecastStatus,'not-forecastable');
  assert.deepEqual(r.forecastFinishes,{optimistic:null,realistic:null,pessimistic:null});
  assert.equal(r.chartData.length,3);
  assert.equal(r.chartData[2].actual,7);
  assert.equal(r.chartData[2].realistic,null);
});
