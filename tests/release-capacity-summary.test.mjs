import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeReleaseCapacity } from '../src/services/releaseCapacitySummary.ts';

const history = {deliveredStoryPoints:100,seEffectiveDays:100,qaEffectiveDays:50};
const team = [
  {id:'se',name:'SE',role:'SE',availableDays:10,productivity:1},
  {id:'qa',name:'QA',role:'QA',availableDays:5,productivity:1},
];
const summary=(h=history,m=team)=>summarizeReleaseCapacity(h,m);
test('5.4.3 historical totals and per-day rates are release-specific',()=>{
  const result=summary();
  assert.equal(result.historicalDeliveredStoryPoints,100);
  assert.equal(result.se.historicalStoryPointsPerEffectiveDay,1);
  assert.equal(result.qa.historicalStoryPointsPerEffectiveDay,2);
});
test('both roles tie at realistic 10 SP/sprint in default scenario',()=>{
  assert.equal(summary().realisticStoryPointsPerSprint,10);
  assert.equal(summary().limitingRole,'Both');
});
test('QA limiting role when QA available days decrease',()=>{
  const result=summary(history,[team[0],{...team[1],availableDays:2}]);
  assert.equal(result.qa.potentialStoryPointsPerSprint,4);
  assert.equal(result.realisticStoryPointsPerSprint,4);
  assert.equal(result.limitingRole,'QA');
});
test('SE limiting role when SE future capacity decreases',()=>{
  const result=summary(history,[{...team[0],availableDays:3},team[1]]);
  assert.equal(result.realisticStoryPointsPerSprint,3);
  assert.equal(result.limitingRole,'SE');
});
test('multiple members contribute weighted effective days to role',()=>{
  const result=summary(history,[{...team[0],availableDays:4,productivity:0.5},{...team[1],availableDays:3},{id:'qa2',name:'QA 2',role:'QA',availableDays:2,productivity:0.75}]);
  assert.equal(result.se.futureAvailableDaysPerSprint,4);
  assert.equal(result.se.futureEffectiveDaysPerSprint,2);
  assert.equal(result.qa.futureEffectiveDaysPerSprint,4.5);
  assert.equal(result.qa.potentialStoryPointsPerSprint,9);
});
test('historical data changes rates even if team remains unchanged',()=>{
  const result=summary({...history,deliveredStoryPoints:200});
  assert.equal(result.realisticStoryPointsPerSprint,20);
});
test('zero future QA days yields zero throughput with QA bottleneck',()=>{
  const result=summary(history,[team[0],{...team[1],availableDays:0}]);
  assert.equal(result.qa.potentialStoryPointsPerSprint,0);
  assert.equal(result.realisticStoryPointsPerSprint,0);
  assert.equal(result.limitingRole,'QA');
});
test('no members for one role means zero potential for that role',()=>{
  const result=summary(history,[team[0]]);
  assert.equal(result.qa.memberCount,0);
  assert.equal(result.qa.potentialStoryPointsPerSprint,0);
});
test('unavailable historical productivity is explicitly N/A',()=>{
  const result=summary({...history,qaEffectiveDays:0});
  assert.equal(result.qa.historicalStoryPointsPerEffectiveDay,null);
  assert.equal(result.limitingRole,'Unavailable');
});
test('calculation never mutates supplied release inputs',()=>{
  const h={...history}, members=team.map(m=>({...m}));
  const before=JSON.stringify({h,members});
  summary(h,members);
  assert.equal(JSON.stringify({h,members}),before);
});
