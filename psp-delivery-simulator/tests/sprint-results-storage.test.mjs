import test from 'node:test';
import assert from 'node:assert/strict';
import { createDraftRelease } from '../src/models/ReleaseRecord.ts';
import { parseReleaseCollection, LocalStorageReleaseRepository } from '../src/repositories/LocalStorageReleaseRepository.ts';
const now='2026-11-17T10:00:00.000Z';
const inputs = {
 release:{releaseName:'Example',scopeStoryPoints:120,variationPercent:15},
 historical:{deliveredStoryPoints:100,seEffectiveDays:40,qaEffectiveDays:20},
 sprintMembers:[{id:'se',name:'SE',role:'SE',availableDays:10,productivity:1}, {id:'qa',name:'QA',role:'QA',availableDays:5,productivity:1}],
};
test('legacy record without sprintResults remains valid',()=>{
 const legacy=createDraftRelease('legacy',now,inputs,[25]); delete legacy.sprintResults;
 const collection=parseReleaseCollection({schemaVersion:1,releases:[legacy]});
 assert.equal(collection.releases[0].completedSprintPoints[0],25);
});
test('repository persists rich sprint results and round trips',()=>{
 let stored=null;
 const storage={getItem:()=>stored,setItem:(_k,v)=>{stored=v},removeItem:()=>{stored=null}};
 const repo=new LocalStorageReleaseRepository(storage);
 const r=createDraftRelease('new',now,inputs,[25]);
 r.sprintResults[0]={completedStoryPoints:25,seEffectiveDays:12.5,qaEffectiveDays:6};
 repo.saveRelease(r);
 assert.equal(repo.getRelease('new').sprintResults[0].qaEffectiveDays,6);
});
test('repository refuses mismatched SP mirror or invalid effort without writes',()=>{
 let stored=null, writes=0;
 const storage={getItem:()=>stored,setItem:(_k,v)=>{writes++;stored=v}};
 const repo=new LocalStorageReleaseRepository(storage);
 const r=createDraftRelease('new',now,inputs,[25]);
 r.sprintResults[0].completedStoryPoints=26;
 assert.throws(()=>repo.saveRelease(r));
 r.sprintResults[0].completedStoryPoints=25;
 r.sprintResults[0].qaEffectiveDays=-1;
 assert.throws(()=>repo.saveRelease(r));
 assert.equal(writes,0);
});
