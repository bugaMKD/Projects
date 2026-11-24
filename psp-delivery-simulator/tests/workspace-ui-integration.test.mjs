// Focused source-level regression contracts for the 5.4.2 UI integration.
// These supplement, and DO NOT replace, local React build/runtime validation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const workspace = readFileSync(fileURLToPath(new URL('../src/ReleaseWorkspace.tsx', import.meta.url)), 'utf8');
const app = readFileSync(fileURLToPath(new URL('../src/App.tsx', import.meta.url)), 'utf8');

test('5.4.2: new releases start with empty actual delivery, never mock actuals', () => {
  assert.match(app, /newWorkspaceSession\(id, new Date\(\)\.toISOString\(\), inputs\)/);
  assert.doesNotMatch(workspace, /mockRelease\.sprintCompletedPoints/);
  assert.match(workspace, /const savedActuals = session\.saved\.completedSprintPoints/);
});
test('5.4.2: release workspace restores configuration from selected session', () => {
  assert.match(workspace, /createDraftBaselineFormInput\(initial\.release\)/);
  assert.match(workspace, /createDraftHistoricalFormInput\(initial\.historical\)/);
  assert.match(workspace, /createDraftSprintCapacityForm\(initial\.sprintMembers\)/);
});
test('5.4.2: baseline uses saved forecast snapshot rather than recomputing established BL', () => {
  assert.match(workspace, /buildEstablishedBaselineDataset\(established, completedActuals\)/);
  assert.match(workspace, /establishBaseline\(validDraft, validHistorical, validSprintMembers, draftData\)/);
  assert.match(app, /persistWorkspaceBaseline\(repository,/);
});
test('5.4.2: Save Draft is an explicit repository action', () => {
  assert.match(workspace, /onClick=\{saveDraft\}/);
  assert.match(app, /persistWorkspaceDraft\(repository,/);
  assert.match(workspace, /disabled=\{saving \|\| !eligibility\.allowed \|\| actualPreviewDirty \|\| pendingSprintCorrection\} onClick=\{saveDraft\}/);
});
test('5.4.2: unsaved navigation changes warn before leaving', () => {
  assert.match(app, /const acceptLeave/);
  assert.match(app, /window\.confirm\('This release has unsaved changes/);
  assert.match(app, /addEventListener\('beforeunload'/);
  assert.match(workspace, /hasUnsavedDraftChanges/);
});
test('5.4.2: switching between saved releases remounts the workspace forms', () => {
  assert.match(app, /setWorkspaceEpoch\(n => n \+ 1\)/);
  assert.match(app, /key=\{`\$\{session\.saved\.id\}:\$\{workspaceEpoch\}`\}/);
  assert.match(app, /openWorkspaceSession\(repository, id\)/);
});
