import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalStorageReleaseRepository, ReleaseStorageError, RELEASES_STORAGE_KEY } from '../src/repositories/LocalStorageReleaseRepository.ts';
import { createDraftRelease, establishRelease, replaceReleaseActuals, saveDraftRelease } from '../src/models/ReleaseRecord.ts';

const now='2026-11-16T12:00:00.000Z';
const later='2026-11-17T12:00:00.000Z';
const inputs = (name='Release Alpha') => ({
 release:{releaseName:name,scopeStoryPoints:100,variationPercent:15},
 historical:{deliveredStoryPoints:100,seEffectiveDays:100,qaEffectiveDays:50},
 sprintMembers:[{id:'se',name:'SE',role:'SE',availableDays:10,productivity:1},
  {id:'qa',name:'QA',role:'QA',availableDays:5,productivity:1}],
});
const baseline = (releaseInputs) => ({
 release:{...releaseInputs.release}, historical:{...releaseInputs.historical},
 sprintMembers:releaseInputs.sprintMembers.map(m=>({...m})),
 forecast:{forecastStatus:'forecastable',forecastFinishes:{optimistic:9,realistic:10,pessimistic:12},
 scenarioThroughputs:{optimistic:11.5,realistic:10,pessimistic:8.5},
 points:Array.from({length:13},(_,i)=>({sprintNumber:i,sprint:i===0?'Start':`S${i}`,
  scope:100,optimistic:Math.min(100,i*11.5),realistic:Math.min(100,i*10),pessimistic:Math.min(100,i*8.5)}))}
});
class MemoryStorage {
 data=new Map();writes=0;
 getItem(k){return this.data.has(k)?this.data.get(k):null;}
 setItem(k,v){this.writes++;this.data.set(k,v);}
 removeItem(k){this.data.delete(k);}
}
const setup=()=>{const storage=new MemoryStorage();return {storage,repo:new LocalStorageReleaseRepository(storage)};};
const create=(id='a',name='Release Alpha')=>createDraftRelease(id,now,inputs(name));

test('5.2 fresh storage starts empty and is not written just by reading',()=>{
 const {repo,storage}=setup();assert.deepEqual(repo.listReleases(),[]);
 assert.equal(repo.getRelease('missing'),null);assert.equal(storage.writes,0);
});
test('save + open + reload repository preserves multiple independent releases',()=>{
 const {repo,storage}=setup();repo.saveRelease(create('a'));repo.saveRelease(create('b','Release Beta'));
 const reloaded=new LocalStorageReleaseRepository(storage);
 assert.deepEqual(reloaded.listReleases().map(r=>r.id),['a','b']);
 assert.equal(reloaded.getRelease('b').draft.release.releaseName,'Release Beta');
});
test('manual draft save only occurs on explicit saveRelease; repository reads never write',()=>{
 const {repo,storage}=setup();const record=create();repo.saveRelease(record);
 const updated=saveDraftRelease(record,later,inputs('Changed'));
 assert.equal(repo.getRelease('a').draft.release.releaseName,'Release Alpha');
 assert.equal(storage.writes,1);
 repo.saveRelease(updated);assert.equal(repo.getRelease('a').draft.release.releaseName,'Changed');
 assert.equal(storage.writes,2);
});
test('listing is deterministic newest first without touching saved order',()=>{
 const {repo}=setup();repo.saveRelease(create('a'));repo.saveRelease(saveDraftRelease(create('b','B'),later,inputs('B')));
 assert.deepEqual(repo.listReleases().map(r=>r.id),['b','a']);
});
test('no external mutation of returned records changes stored data',()=>{
 const {repo}=setup();const source=create();repo.saveRelease(source);
 source.draft.release.releaseName='Mutated source';
 const loaded=repo.getRelease('a');loaded.draft.release.releaseName='Mutated result';
 assert.equal(repo.getRelease('a').draft.release.releaseName,'Release Alpha');
});
test('established BL survives serialization, reload and later actual changes',()=>{
 const {repo,storage}=setup();const draft=create();const established=establishRelease(draft,later,baseline(draft.draft));
 repo.saveRelease(established);
 const r2=new LocalStorageReleaseRepository(storage);
 assert.deepEqual(r2.getRelease('a').establishedBaseline.forecast,established.establishedBaseline.forecast);
 const actual=replaceReleaseActuals(r2.getRelease('a'),later,[20,30,40,50]);
 r2.saveRelease(actual);
 assert.deepEqual(repo.getRelease('a').completedSprintPoints,[20,30,40,50]);
 assert.deepEqual(repo.getRelease('a').establishedBaseline.forecast,established.establishedBaseline.forecast);
});
test('cannot unlock or replace established baseline using same release ID',()=>{
 const {repo}=setup();const draft=create();repo.saveRelease(establishRelease(draft,later,baseline(draft.draft)));
 assert.throws(()=>repo.saveRelease(draft),ReleaseStorageError);
 const changed=repo.getRelease('a');changed.establishedBaseline.forecast.points[1].realistic=99;
 assert.throws(()=>repo.saveRelease(changed),ReleaseStorageError);
 assert.equal(repo.getRelease('a').establishedBaseline.forecast.points[1].realistic,10);
});
test('delete only the requested record; repeat delete is a no-op',()=>{
 const {repo,storage}=setup();repo.saveRelease(create('a'));repo.saveRelease(create('b','B'));
 assert.equal(repo.deleteRelease('a'),true);assert.equal(repo.deleteRelease('a'),false);
 assert.equal(repo.getRelease('a'),null);assert.equal(repo.getRelease('b').id,'b');
 assert.equal(storage.writes,3);
});
test('malformed JSON fails closed without overwriting existing storage',()=>{
 const {repo,storage}=setup();const broken='{not-json';storage.setItem(RELEASES_STORAGE_KEY,broken);
 assert.throws(()=>repo.listReleases(),ReleaseStorageError);
 assert.throws(()=>repo.saveRelease(create()),ReleaseStorageError);
 assert.equal(storage.getItem(RELEASES_STORAGE_KEY),broken);
});
test('unsupported schema cannot be silently reset or overwritten',()=>{
 const {repo,storage}=setup();const future=JSON.stringify({schemaVersion:2,releases:[]});
 storage.setItem(RELEASES_STORAGE_KEY,future);
 assert.throws(()=>repo.getRelease('a'),/unsupported schema/);
 assert.throws(()=>repo.saveRelease(create()),ReleaseStorageError);
 assert.equal(storage.getItem(RELEASES_STORAGE_KEY),future);
});
test('duplicate IDs in saved collection are rejected',()=>{
 const {repo,storage}=setup();storage.setItem(RELEASES_STORAGE_KEY,JSON.stringify({schemaVersion:1,releases:[create(),create()]}));
 assert.throws(()=>repo.listReleases(),/duplicate IDs/);
});
test('incomplete or invalid nested release payload is rejected',()=>{
 const {repo,storage}=setup();const invalid=create();invalid.draft.historical.qaEffectiveDays=-1;
 storage.setItem(RELEASES_STORAGE_KEY,JSON.stringify({schemaVersion:1,releases:[invalid]}));
 assert.throws(()=>repo.listReleases(),ReleaseStorageError);
});
test('storage unavailable or quota failure does not report a successful save',()=>{
 const storage=new MemoryStorage();storage.setItem=()=>{throw new Error('QuotaExceeded');};
 const repo=new LocalStorageReleaseRepository(storage);
 assert.throws(()=>repo.saveRelease(create()),/Cannot save releases/);
 assert.equal(storage.getItem(RELEASES_STORAGE_KEY),null);
});
test('cannot overwrite a release ID with a different creation timestamp',()=>{
 const {repo}=setup();repo.saveRelease(create());
 const second=create();second.createdAt=later;
 assert.throws(()=>repo.saveRelease(second),/creation metadata/);
});
test('invalid record save does not affect other releases',()=>{
 const {repo}=setup();repo.saveRelease(create());
 const invalid=create('b');invalid.completedSprintPoints=[-10];
 assert.throws(()=>repo.saveRelease(invalid),ReleaseStorageError);
 assert.deepEqual(repo.listReleases().map(r=>r.id),['a']);
});
