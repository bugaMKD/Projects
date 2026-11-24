import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const workspace=readFileSync(new URL('../src/ReleaseWorkspace.tsx',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
test('preview draws actuals from the effective preview, not saved array',()=>{
  assert.match(workspace,/completedActuals = displayedResults\.map/);
  assert.match(workspace,/buildEstablishedBaselineDataset\(established, completedActuals\)/);
  assert.match(workspace,/completedSprintPoints: completedActuals/);
});
test('only explicit Save Changes sends corrections to persistence',()=>{
  assert.match(workspace,/const changes = actualPreview;[\s\S]*?runSave\(\(\) => onSaveActualChanges\(changes\)/);
  assert.match(workspace,/onClick=\{saveSprintCorrections\}/);
  assert.match(workspace,/await work\(\); onSuccess\(\);/);
  assert.match(app,/persistWorkspaceSprintResults\(repository, session/);
  assert.match(app,/validateSprintResults\(/);
});
test('preview is protected by unsaved-changes navigation warnings',()=>{
  assert.match(workspace,/pendingSprintCorrection \|\| actualPreviewDirty/);
  assert.match(app,/dirtyRef\.current/);
});
test('sprint correction is not committed on Enter',()=>{
  assert.match(workspace,/Apply Preview/);
  assert.doesNotMatch(workspace,/onKeyDown=\{[^}]*applySprintPreview/);
});
test('save and discard are separate and not automatic',()=>{
  assert.match(workspace,/onClick=\{discardSprintPreview\}/);
  assert.match(workspace,/Unsaved actuals preview/);
});
