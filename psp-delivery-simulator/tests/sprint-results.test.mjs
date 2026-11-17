import test from 'node:test';
import assert from 'node:assert/strict';
import { getSprintResults, parseSprintResult, updateSprintResult, hasSprintResultChanges } from '../src/models/SprintResult.ts';
import { createDraftRelease, replaceReleaseSprintResults, replaceReleaseActuals } from '../src/models/ReleaseRecord.ts';

const inputs = () => ({
 release:{releaseName:'A',scopeStoryPoints:150,variationPercent:15},
 historical:{deliveredStoryPoints:100,seEffectiveDays:80,qaEffectiveDays:40},
 sprintMembers:[{id:'a',name:'SE',role:'SE',availableDays:10,productivity:1},{id:'b',name:'QA',role:'QA',availableDays:5,productivity:1}],
});
const date='2026-11-17T10:00:00.000Z';
test('legacy SP-only sprint history shows missing effort as null, never zero',()=>{
 const legacy=createDraftRelease('a',date,inputs(),[40,30]);
 delete legacy.sprintResults;
 assert.deepEqual(getSprintResults(legacy),[
  {completedStoryPoints:40,seEffectiveDays:null,qaEffectiveDays:null},
  {completedStoryPoints:30,seEffectiveDays:null,qaEffectiveDays:null},
 ]);
});
test('new sprint must have all three nonnegative values',()=>{
 assert.deepEqual(parseSprintResult('42','18','9'),{completedStoryPoints:42,seEffectiveDays:18,qaEffectiveDays:9});
 assert.deepEqual(parseSprintResult('0','0','0'),{completedStoryPoints:0,seEffectiveDays:0,qaEffectiveDays:0});
 for(const values of [['40','','9'],['40','12','-1'],['xx','1','1'],['12','Infinity','3']]) assert.throws(()=>parseSprintResult(...values));
});
test('adding effort does not change existing BL inputs and keeps SP values consistent',()=>{
 const created=createDraftRelease('a',date,inputs(),[40]);
 const row=parseSprintResult('30','12','6');
 const next=replaceReleaseSprintResults(created,date,[...getSprintResults(created),row]);
 assert.deepEqual(next.completedSprintPoints,[40,30]);
 assert.equal(next.sprintResults[0].seEffectiveDays,null);
 assert.equal(next.sprintResults[1].seEffectiveDays,12);
 assert.equal(next.sprintResults[1].qaEffectiveDays,6);
 assert.deepEqual(next.draft,created.draft);
});
test('editing one sprint previews without mutating saved history',()=>{
 const original=[{completedStoryPoints:24,seEffectiveDays:10,qaEffectiveDays:5}];
 const preview=updateSprintResult(original,0,{completedStoryPoints:29,seEffectiveDays:8,qaEffectiveDays:4});
 assert.equal(original[0].completedStoryPoints,24);
 assert.equal(preview[0].seEffectiveDays,8);
 assert.equal(hasSprintResultChanges(original,preview),true);
 assert.equal(hasSprintResultChanges(original,null),false);
 assert.throws(()=>updateSprintResult(original,1,preview[0]));
});
test('legacy point-only updates preserve effort of corresponding sprints',()=>{
 const r=replaceReleaseSprintResults(createDraftRelease('a',date,inputs()),date,[parseSprintResult('42','18','9')]);
 const next=replaceReleaseActuals(r,date,[41]);
 assert.equal(next.sprintResults[0].completedStoryPoints,41);
 assert.equal(next.sprintResults[0].seEffectiveDays,18);
});
test('reject out of sync SP mirror to prevent data loss',()=>{
 const record=createDraftRelease('a',date,inputs(),[20]);
 record.sprintResults[0].completedStoryPoints=30;
 assert.throws(()=>getSprintResults(record),/inconsistent/);
});
