import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const workspace = readFileSync(new URL('../src/ReleaseWorkspace.tsx', import.meta.url), 'utf8');
test('Release Workspace no longer includes the obsolete local prototype top bar', () => {
  assert.doesNotMatch(workspace, /<header className="topbar">/);
  assert.doesNotMatch(workspace, /Local prototype/);
  assert.match(workspace, /displayedRelease\.releaseName/);
  assert.match(workspace, /Established BL · Locked/);
});
