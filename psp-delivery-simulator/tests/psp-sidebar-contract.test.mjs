import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const workspace = readFileSync(new URL('../src/auth/CloudWorkspaceApp.tsx', import.meta.url), 'utf8');
const auth = readFileSync(new URL('../src/auth/AuthPreview.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/pspSidebar.css', import.meta.url), 'utf8');
test('signed-in cloud application uses a two-item collapsible sidebar', () => {
  assert.match(workspace, /sidebarOpen/);
  assert.match(workspace, /Collapse navigation/);
  assert.match(workspace, /Expand navigation/);
  assert.match(workspace, /aria-label="Workspace sections"/);
  assert.match(workspace, />Release Management<\/span>/);
  assert.match(workspace, />Workspace<\/span>/);
  assert.doesNotMatch(workspace, />Cloud Release Management<\/button>/);
  assert.doesNotMatch(workspace, />Cloud Release Workspace<\/button>/);
  assert.match(styles, /psp-shell--collapsed/);
});
test('cloud sidebar displays user and delegates sign out to existing auth flow', () => {
  assert.match(workspace, /userEmail/);
  assert.match(workspace, /onSignOut/);
  assert.match(auth, /<CloudWorkspaceApp key=\{user.id\}/);
  assert.match(auth, /onSignOut=\{\(\) => \{ void signOut\(\); \}\}/);
});
test('existing cloud release operations and unsaved-change guard are retained', () => {
  assert.match(workspace, /const acceptLeave =/);
  assert.match(workspace, /onClick=\{goManagement\}/);
  assert.match(workspace, /onOpen=\{openRelease\}/);
  assert.match(workspace, /onNew=\{newRelease\}/);
  assert.match(workspace, /onSaveDraft=\{saveDraft\}/);
  assert.match(workspace, /onSaveActualChanges=\{correctSprint\}/);
});

test('no redundant page header or cloud badge is rendered', () => {
  assert.doesNotMatch(workspace, /psp-shell__header/);
  assert.doesNotMatch(workspace, /psp-shell__cloud-status/);
  assert.doesNotMatch(workspace, /psp-shell__eyebrow/);
  assert.doesNotMatch(styles, /\.psp-shell__header/);
  assert.match(styles, /psp-shell__body\{[^}]*padding:16px 24px 48px/);
  assert.match(workspace, /<ReleaseManagement releases=/);
  assert.match(workspace, /<ReleaseWorkspace key=/);
});
