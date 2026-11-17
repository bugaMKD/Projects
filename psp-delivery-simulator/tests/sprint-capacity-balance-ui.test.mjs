import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const workspace = readFileSync(new URL('../src/ReleaseWorkspace.tsx', import.meta.url), 'utf8');

test('shows sprint-level capacity balance alongside recorded effective days', () => {
  assert.match(workspace, /<th>QA effective days<\/th><th>Actual capacity balance<\/th>/);
  assert.match(workspace, /<td title=\{sprintBalance\.description\}>\{sprintBalance\.label\}<\/td>/);
});
test('uses actual displayed results including unsaved previews', () => {
  assert.match(workspace, /const sprintResult = displayedResults\[i\]/);
  assert.match(workspace, /calculateSprintCapacityBalance\(sprintResult,/);
});
test('established BL compares against frozen historical assumptions', () => {
  assert.match(workspace, /calculateSprintCapacityBalance\(sprintResult, established\?\.historical \?\? validHistorical\)/);
});
