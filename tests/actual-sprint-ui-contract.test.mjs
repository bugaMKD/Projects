import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
const workspace=readFileSync(new URL('../src/ReleaseWorkspace.tsx',import.meta.url),'utf8');
test('App persists completed sprint with existing workspace operations',()=>{
 assert.match(app,/persistWorkspaceActuals\(/);
 assert.match(app,/appendCompletedSprint\(session\.saved\.completedSprintPoints/);
 assert.match(app,/onRecordSprint=\{recordSprint\}/);
});
test('workspace actuals are saved only on explicit action',()=>{
 assert.match(workspace,/onRecordSprint\(sprintPointsText\)/);
 assert.match(workspace,/Save Sprint/);
});
test('workspace protects unsaved draft and pending sprint entry',()=>{
 assert.match(workspace,/dirty \|\| pendingSprintEntry/);
 assert.match(workspace,/disabled=\{!session\.persisted \|\| dirty/);
});
test('established BL curve uses preview-aware actuals while retaining saved BL',()=>{
 assert.match(workspace,/buildEstablishedBaselineDataset\(established, completedActuals\)/);
 assert.match(workspace,/completedActuals = actualPreview \?\? savedActuals/);
 assert.match(workspace,/buildReleaseChartDataset\(/);
});
