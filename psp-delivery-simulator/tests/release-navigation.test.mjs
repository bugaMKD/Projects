import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_NAVIGATION, navigateToManagement, navigateToNewRelease, navigateToSavedRelease, reconcileDeletedRelease, releaseSummary } from '../src/navigation/ReleaseNavigation.ts';

const example = { id:'rel-1', draft:{release:{releaseName:'Alpha',scopeStoryPoints:240}}, baselineStatus:'draft', establishedBaseline:null, completedSprintPoints:[20,30], updatedAt:'2026-11-16T12:00:00Z' };

test('5.3 initial tab is Release Management with no selection',()=>{
  assert.deepEqual(INITIAL_NAVIGATION,{tab:'management',selection:{kind:'none'}});
});
test('New Release opens a distinct unsaved workspace state',()=>{
  assert.deepEqual(navigateToNewRelease(),{tab:'workspace',selection:{kind:'new'}});
});
test('Open existing release selects stable ID',()=>{
  assert.deepEqual(navigateToSavedRelease('rel-1',[example]),{tab:'workspace',selection:{kind:'saved',releaseId:'rel-1'}});
});
test('Open missing release is refused',()=>{
  assert.throws(()=>navigateToSavedRelease('missing',[example]),/does not exist/);
});
test('Returning to management preserves selected release',()=>{
  const selected=navigateToSavedRelease('rel-1',[example]);
  assert.deepEqual(navigateToManagement(selected),{...selected,tab:'management'});
});
test('Deleting selected release resets to management',()=>{
  assert.deepEqual(reconcileDeletedRelease(navigateToSavedRelease('rel-1',[example]),'rel-1'),INITIAL_NAVIGATION);
});
test('Deleting other release does not disturb selection',()=>{
  const selected=navigateToSavedRelease('rel-1',[example]);
  assert.deepEqual(reconcileDeletedRelease(selected,'other'),selected);
});
test('Summary reports incremental actuals as cumulative total',()=>{
  assert.deepEqual(releaseSummary(example),{id:'rel-1',name:'Alpha',status:'Draft BL',scope:240,actualStoryPoints:50,realisticFinishSprint:null,updatedAt:'2026-11-16T12:00:00Z'});
});
test('Established BL summary uses saved realistic finish, not a recalculation',()=>{
  const established={...example,baselineStatus:'established', establishedBaseline:{forecast:{forecastFinishes:{realistic:12}}}};
  assert.equal(releaseSummary(established).realisticFinishSprint,12);
  assert.equal(releaseSummary(established).status,'Established BL');
});
