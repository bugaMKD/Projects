import test from 'node:test';
import assert from 'node:assert/strict';
import { getIntegratedMockData, getInitialDraftBaselineConfig } from '../src/data/originalReleaseDataset.ts';
import { createDraftSprintCapacityForm, parseDraftSprintCapacityForm, DEFAULT_SPRINT_CAPACITY_MEMBERS } from '../src/models/DraftSprintCapacityInput.ts';

const historical = Object.freeze({ deliveredStoryPoints:100, seEffectiveDays:100, qaEffectiveDays:50 });
const draft = Object.freeze({ releaseName:'Release Alpha',scopeStoryPoints:100, variationPercent:15 });
const members = Object.freeze([
  Object.freeze({id:'se',name:'SE',role:'SE',availableDays:10,productivity:1}),
  Object.freeze({id:'qa',name:'QA',role:'QA',availableDays:5,productivity:1}),
]);
const apply = (team=members, historicalInput=historical, draftInput=draft) => getIntegratedMockData(draftInput,historicalInput,team);
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9, `${a} != ${b}`);
const actuals=(data)=>data.chartData.map(point=>point.actual).filter(value=>value!==null);

test('4.3.2 default calls preserve existing 4.1/4.2 forecasts',()=>{
 const a=getIntegratedMockData();
 const b=getIntegratedMockData(getInitialDraftBaselineConfig(),historical,DEFAULT_SPRINT_CAPACITY_MEMBERS);
 assert.deepEqual(a,b);
 close(apply().scenarioThroughputs.realistic,10);
 assert.deepEqual(apply().forecastFinishes,{optimistic:9,realistic:10,pessimistic:12});
});

test('SE becomes the bottleneck when future SE capacity decreases',()=>{
 const data=apply([{...members[0],availableDays:4},members[1]]);
 close(data.scenarioThroughputs.realistic,4);
 assert.equal(data.forecastFinishes.realistic,25);
});

test('QA becomes the bottleneck when future QA capacity decreases',()=>{
 const data=apply([members[0],{...members[1],availableDays:2}]);
 close(data.scenarioThroughputs.realistic,4);
 assert.equal(data.forecastFinishes.realistic,25);
});

test('individual productivity percentage flows through form conversion into throughput',()=>{
 const form=createDraftSprintCapacityForm(members).map(m=>m.role==='QA'?{...m,productivityPercentText:'75'}:m);
 const result=parseDraftSprintCapacityForm(form);
 assert.deepEqual(result.errors,{members:{}});
 assert.ok(result.members);
 const data=apply(result.members);
 close(data.scenarioThroughputs.realistic,7.5);
 close(data.scenarioThroughputs.optimistic,8.625);
 close(data.scenarioThroughputs.pessimistic,6.375);
});

test('multiple team members add effective days within each role',()=>{
 const data=apply([members[0],{...members[1],availableDays:1},
   {id:'qa2',name:'QA 2',role:'QA',availableDays:3,productivity:1}]);
 close(data.scenarioThroughputs.realistic,8);
});

test('zero future QA capacity is valid, producing not-forecastable instead of fake completion',()=>{
 const form=createDraftSprintCapacityForm(members).map(m=>m.role==='QA'?{...m,availableDaysText:'0'}:m);
 const parsed=parseDraftSprintCapacityForm(form);
 assert.ok(parsed.members);
 const data=apply(parsed.members);
 assert.equal(data.forecastStatus,'not-forecastable');
 assert.deepEqual(data.forecastFinishes,{optimistic:null,realistic:null,pessimistic:null});
 assert.ok(data.chartData.some(p=>p.actual!==null));
});

test('capacity changes keep actual sprint delivery and release scope independent',()=>{
 const initial=apply();
 const changed=apply([members[0],{...members[1],availableDays:1}]);
 assert.deepEqual(actuals(initial),actuals(changed));
 assert.equal(initial.completed,changed.completed);
 assert.equal(initial.remaining,changed.remaining);
 assert.ok(changed.chartData.length>initial.chartData.length);
 assert.equal(changed.chartData[1].scope,100);
});

test('actuals extending beyond a faster pessimistic completion remain visible with flat BL',()=>{
 const fast=apply([{...members[0],availableDays:100},{...members[1],availableDays:50}],historical,{...draft,scopeStoryPoints:30});
 const last=fast.chartData.at(-1);
 assert.equal(last.sprint,'S4');
 assert.equal(last.actual,116);
 assert.equal(last.optimistic,30);
 assert.equal(last.realistic,30);
 assert.equal(last.pessimistic,30);
});

test('invalid form is rejected before being passed to the dataset',()=>{
 const form=createDraftSprintCapacityForm(members);
 form[0].availableDaysText='-2';
 const result=parseDraftSprintCapacityForm(form);
 assert.equal(result.members,null);
 assert.ok(result.errors.members['0'].availableDaysText);
});

test('config, historical inputs and team inputs are never mutated',()=>{
 const before=JSON.stringify({historical,draft,members});
 const result=apply();
 assert.equal(result.forecastStatus,'forecastable');
 assert.equal(JSON.stringify({historical,draft,members}),before);
});
