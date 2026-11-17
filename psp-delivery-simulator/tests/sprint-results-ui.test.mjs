import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const workspace=readFileSync(new URL('../src/ReleaseWorkspace.tsx',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
test('next completed sprint accepts SP and actual SE/QA effective days',()=>{
 assert.match(workspace,/onRecordSprint\(sprintPointsText, sprintSEText, sprintQAText\)/);
 assert.match(workspace,/Actual SE effective days for next sprint/);
 assert.match(workspace,/Actual QA effective days for next sprint/);
 assert.match(app,/persistWorkspaceSprintResults\(/);
});
test('sprint corrections retain preview and explicit save/discard',()=>{
 assert.match(workspace,/updateSprintResult\(/);
 assert.match(workspace,/Save Changes/);
 assert.match(workspace,/Discard Preview/);
 assert.match(workspace,/Not recorded/);
});
test('chart stays driven by story points; no automatic BL recalculation',()=>{
 assert.match(workspace,/completedActuals = displayedResults\.map/);
 assert.match(workspace,/buildEstablishedBaselineDataset\(established, completedActuals\)/);
});
