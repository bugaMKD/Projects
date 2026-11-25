import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../src/auth/CloudWorkspaceApp.tsx', import.meta.url), 'utf8');
test('Workspace does not require an active session when releases are loaded', () => {
  assert.match(src, /const goWorkspace = \(\) => \{/);
  assert.match(src, /if \(pendingRef\.current \|\| loading\) return;/);
  assert.match(src, /title="Workspace"\s+disabled=\{pending \|\| loading\} onClick=\{goWorkspace\}/);
  assert.doesNotMatch(src, /disabled=\{pending \|\| loading \|\| !session\}/);
});
test('Workspace without a session provides an explicit selector of owned releases', () => {
  assert.match(src, /navigation\.tab === 'workspace' && !session/);
  assert.match(src, /releases\.map\(release =>/);
  assert.match(src, /onClick=\{\(\) => openRelease\(release\.id\)\}/);
  assert.match(src, /No saved releases yet/);
  assert.match(src, /<ReleaseWorkspace key=/);
});
