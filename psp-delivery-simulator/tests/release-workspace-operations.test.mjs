import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalStorageReleaseRepository } from '../src/repositories/LocalStorageReleaseRepository.ts';
import { establishBaseline } from '../src/models/EstablishedBaseline.ts';
import {
  newWorkspaceSession, openWorkspaceSession, editWorkspaceSession, hasUnsavedDraftChanges,
  persistWorkspaceDraft, persistWorkspaceBaseline, persistWorkspaceActuals,
} from '../src/services/ReleaseWorkspaceOperations.ts';

const inputs = () => ({
  release:{releaseName:'Alpha',scopeStoryPoints:100,variationPercent:15},
  historical:{deliveredStoryPoints:100,seEffectiveDays:100,qaEffectiveDays:50},
  sprintMembers:[{id:'se',name:'SE',role:'SE',availableDays:10,productivity:1},{id:'qa',name:'QA',role:'QA',availableDays:5,productivity:1}],
});
const forecast = (i=inputs()) => ({
  chartData: Array.from({length:13},(_,n)=>({sprint:n?'S'+n:'Start',sprintNumber:n,scope:i.release.scopeStoryPoints,
    optimistic:Math.min(i.release.scopeStoryPoints,11.5*n),realistic:Math.min(i.release.scopeStoryPoints,10*n),
    pessimistic:Math.min(i.release.scopeStoryPoints,8.5*n),actual:null})),
  forecastStatus:'forecastable',
  forecastFinishes:{optimistic:9,realistic:10,pessimistic:12},
  scenarioThroughputs:{optimistic:11.5,realistic:10,pessimistic:8.5},
});
const t1='2026-11-16T12:00:00.000Z'; const t2='2026-11-16T12:10:00.000Z';
class Store {
  map = new Map(); writes=0; failWrite=false;
  getItem(k){return this.map.get(k)??null;}
  setItem(k,v){if(this.failWrite) throw new Error('quota'); this.writes++; this.map.set(k,v);}
  removeItem(k){this.map.delete(k);}
}
const setup=()=>{const store=new Store();return {store,repo:new LocalStorageReleaseRepository(store)};};

test('new release starts unsaved and does not write storage',()=>{
 const {repo,store}=setup(); const s=newWorkspaceSession('alpha',t1,inputs());
 assert.equal(hasUnsavedDraftChanges(s),true); assert.equal(s.persisted,false);
 assert.deepEqual(repo.listReleases(),[]);assert.equal(store.writes,0);
});
test('Save Draft explicitly persists a new release',()=>{
 const {repo,store}=setup(); const s=persistWorkspaceDraft(repo,newWorkspaceSession('alpha',t1,inputs()),t2);
 assert.equal(store.writes,1); assert.equal(s.persisted,true);assert.equal(hasUnsavedDraftChanges(s),false);
 assert.equal(repo.getRelease('alpha').baselineStatus,'draft');
});
test('editing changes workspace only, never localStorage',()=>{
 const {repo,store}=setup(); const s=persistWorkspaceDraft(repo,newWorkspaceSession('alpha',t1,inputs()),t1);
 const changed=inputs();changed.release.scopeStoryPoints=140;
 const e=editWorkspaceSession(s,changed);
 assert.equal(hasUnsavedDraftChanges(e),true); assert.equal(repo.getRelease('alpha').draft.release.scopeStoryPoints,100);
 assert.equal(store.writes,1);
});
test('manual Save Draft updates same release identity and clears dirty status',()=>{
 const {repo}=setup();const saved=persistWorkspaceDraft(repo,newWorkspaceSession('alpha',t1,inputs()),t1);
 const changed=inputs(); changed.release.releaseName='Alpha updated';
 const modified=editWorkspaceSession(saved,changed);
 const resaved=persistWorkspaceDraft(repo,modified,t2);
 assert.equal(repo.listReleases().length,1);assert.equal(repo.getRelease('alpha').draft.release.releaseName,'Alpha updated');
 assert.equal(resaved.saved.createdAt,t1); assert.equal(hasUnsavedDraftChanges(resaved),false);
});
test('opening saved draft hydrates actual saved inputs',()=>{
 const {repo}=setup();const original=inputs();original.release.scopeStoryPoints=155;
 persistWorkspaceDraft(repo,newWorkspaceSession('alpha',t1,original),t1);
 const opened=openWorkspaceSession(repo,'alpha');
 assert.equal(opened.committed.release.scopeStoryPoints,155);assert.equal(opened.persisted,true);
});
test('opening absent release reports missing ID',()=>{
 const {repo}=setup();assert.throws(()=>openWorkspaceSession(repo,'missing'),/not found/);
});
test('establishment uses one write and persists frozen baseline snapshot',()=>{
 const {repo,store}=setup();const s=newWorkspaceSession('alpha',t1,inputs());
 const bl=establishBaseline(s.committed.release,s.committed.historical,s.committed.sprintMembers,forecast());
 const next=persistWorkspaceBaseline(repo,s,t2,bl);
 assert.equal(store.writes,1);assert.equal(next.saved.baselineStatus,'established');
 assert.equal(repo.getRelease('alpha').establishedBaseline.forecast.forecastFinishes.realistic,10);
});
test('establishment captures current committed inputs without prior Save Draft',()=>{
 const {repo}=setup();let s=newWorkspaceSession('alpha',t1,inputs());
 const changed=inputs();changed.release.scopeStoryPoints=150;s=editWorkspaceSession(s,changed);
 const bl=establishBaseline(changed.release,changed.historical,changed.sprintMembers,forecast(changed));
 s=persistWorkspaceBaseline(repo,s,t2,bl);
 assert.equal(s.saved.draft.release.scopeStoryPoints,150);assert.equal(repo.getRelease('alpha').baselineStatus,'established');
});
test('outdated snapshot is rejected with no storage change',()=>{
 const {repo,store}=setup();let s=newWorkspaceSession('alpha',t1,inputs());
 const old=establishBaseline(s.committed.release,s.committed.historical,s.committed.sprintMembers,forecast());
 const changed=inputs(); changed.sprintMembers[1].availableDays=2;s=editWorkspaceSession(s,changed);
 assert.throws(()=>persistWorkspaceBaseline(repo,s,t2,old),/snapshot inputs differ/);
 assert.equal(store.writes,0);
});
test('cannot edit or save draft after establishment',()=>{
 const {repo}=setup();const s=newWorkspaceSession('alpha',t1,inputs());
 const bl=establishBaseline(s.committed.release,s.committed.historical,s.committed.sprintMembers,forecast());
 const locked=persistWorkspaceBaseline(repo,s,t2,bl);
 assert.throws(()=>editWorkspaceSession(locked,inputs()),/locked/);
 assert.throws(()=>persistWorkspaceDraft(repo,locked,t2),/Established/);
});
test('saved baseline stays unchanged while actual sprints update beyond forecast horizon',()=>{
 const {repo}=setup();const s=newWorkspaceSession('alpha',t1,inputs());
 const bl=establishBaseline(s.committed.release,s.committed.historical,s.committed.sprintMembers,forecast());
 const locked=persistWorkspaceBaseline(repo,s,t2,bl);
 const before=JSON.stringify(repo.getRelease('alpha').establishedBaseline);
 const updated=persistWorkspaceActuals(repo,locked,t2,Array(15).fill(5));
 assert.equal(updated.saved.completedSprintPoints.length,15);
 assert.equal(JSON.stringify(repo.getRelease('alpha').establishedBaseline),before);
});
test('actual delivery requires a persisted release',()=>{
 const {repo}=setup();assert.throws(()=>persistWorkspaceActuals(repo,newWorkspaceSession('alpha',t1,inputs()),t2,[5]),/Save/);
});
test('storage failure does not report a successful save or mutate session',()=>{
 const {repo,store}=setup();const s=newWorkspaceSession('alpha',t1,inputs());store.failWrite=true;
 assert.throws(()=>persistWorkspaceDraft(repo,s,t2),/Cannot save/);
 assert.equal(s.persisted,false);assert.equal(s.saved.updatedAt,t1);
});
test('establish failure does not modify an existing draft',()=>{
 const {repo,store}=setup();const saved=persistWorkspaceDraft(repo,newWorkspaceSession('alpha',t1,inputs()),t1);
 const bl=establishBaseline(saved.committed.release,saved.committed.historical,saved.committed.sprintMembers,forecast());
 store.failWrite=true;
 assert.throws(()=>persistWorkspaceBaseline(repo,saved,t2,bl),/Cannot save/);
 assert.equal(repo.getRelease('alpha').baselineStatus,'draft');
});
test('two saved releases never overwrite each other',()=>{
 const {repo}=setup(); persistWorkspaceDraft(repo,newWorkspaceSession('alpha',t1,inputs()),t1);
 const second=inputs();second.release.releaseName='Beta';
 persistWorkspaceDraft(repo,newWorkspaceSession('beta',t1,second),t1);
 assert.equal(repo.listReleases().length,2);assert.equal(openWorkspaceSession(repo,'alpha').committed.release.releaseName,'Alpha');
});
