import test from 'node:test';
import assert from 'node:assert/strict';
import {createDraftRelease,establishRelease} from '../src/models/ReleaseRecord.ts';
import {newWorkspaceSession,persistWorkspaceDraft,persistWorkspaceBaseline,persistWorkspaceActuals} from '../src/services/ReleaseWorkspaceOperations.ts';
import {appendCompletedSprint} from '../src/services/ActualSprintEntry.ts';
const now='2026-11-16T12:00:00.000Z';
const next='2026-11-16T13:00:00.000Z';
const inputs={
 release:{releaseName:'Alpha',scopeStoryPoints:100,variationPercent:15},
 historical:{deliveredStoryPoints:100,seEffectiveDays:100,qaEffectiveDays:50},
 sprintMembers:[{id:'se',name:'SE',role:'SE',availableDays:10,productivity:1},{id:'qa',name:'QA',role:'QA',availableDays:5,productivity:1}],
};
function memoryRepository(){
 const records=new Map();return {records,saveRelease:r=>{records.set(r.id,structuredClone(r));},getRelease:id=>structuredClone(records.get(id)??null)};
}
const baseline=(r)=>({release:{...r.draft.release},historical:{...r.draft.historical},sprintMembers:r.draft.sprintMembers.map(m=>({...m})),forecast:{forecastStatus:'forecastable',forecastFinishes:{optimistic:9,realistic:10,pessimistic:12},scenarioThroughputs:{optimistic:11.5,realistic:10,pessimistic:8.5},points:[{sprintNumber:0,sprint:'Start',scope:100,optimistic:0,realistic:0,pessimistic:0}]}});

test('saved Draft can record successive incremental sprints without altering inputs',()=>{
 const repo=memoryRepository();let session=persistWorkspaceDraft(repo,newWorkspaceSession('x',now,inputs),now);
 session=persistWorkspaceActuals(repo,session,next,appendCompletedSprint(session.saved.completedSprintPoints,'10'));
 session=persistWorkspaceActuals(repo,session,next,appendCompletedSprint(session.saved.completedSprintPoints,'12.5'));
 assert.deepEqual(repo.getRelease('x').completedSprintPoints,[10,12.5]);
 assert.deepEqual(repo.getRelease('x').draft,inputs);
});
test('recording actual sprint does not modify an Established BL snapshot',()=>{
 const repo=memoryRepository();let session=persistWorkspaceBaseline(repo,newWorkspaceSession('x',now,inputs),now,baseline(createDraftRelease('x',now,inputs)));
 const before=JSON.stringify(repo.getRelease('x').establishedBaseline);
 session=persistWorkspaceActuals(repo,session,next,[8]);
 assert.deepEqual(repo.getRelease('x').completedSprintPoints,[8]);
 assert.equal(JSON.stringify(repo.getRelease('x').establishedBaseline),before);
});
test('an unsaved release cannot record actual sprints',()=>{
 const repo=memoryRepository();const session=newWorkspaceSession('x',now,inputs);
 assert.throws(()=>persistWorkspaceActuals(repo,session,next,[5]),/Save the release/);
 assert.equal(repo.records.size,0);
});
