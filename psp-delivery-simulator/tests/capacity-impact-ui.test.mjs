import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const workspace = readFileSync(new URL('../src/ReleaseWorkspace.tsx', import.meta.url), 'utf8');

test('capacity impact is displayed with editable future team capacity', () => {
  assert.match(workspace, /aria-label="Capacity impact and forecast visibility"/);
  assert.ok(workspace.indexOf('aria-label="BL future team capacity"') < workspace.indexOf('aria-label="Capacity impact and forecast visibility"'));
  assert.ok(workspace.indexOf('aria-label="Capacity impact and forecast visibility"') < workspace.indexOf('aria-label="Baseline establishment"'));
});
test('reuse selected release historical productivity and applied team configuration', () => {
  assert.match(workspace, /summarizeReleaseCapacity\(\s*established\?\.historical \?\? validHistorical,\s*established\?\.sprintMembers \?\? validSprintMembers/);
});
test('present SE QA role potential and realistic forecasted velocity', () => {
  assert.match(workspace, /title="SE potential throughput"/);
  assert.match(workspace, /title="QA potential throughput"/);
  assert.match(workspace, /title="Forecasted realistic velocity"/);
  assert.match(workspace, /baselineCapacity\.realisticStoryPointsPerSprint/);
});
test('completion references existing forecast rather than a new formula', () => {
  assert.match(workspace, /formatFinish\(data\.forecastFinishes\.realistic\)/);
});
test('draft comparison isolates member capacity changes with constant historical productivity', () => {
  assert.match(workspace, /summarizeReleaseCapacity\(\s*established\?\.historical \?\? validHistorical,\s*established\?\.sprintMembers \?\? initial\.sprintMembers/);
  assert.match(workspace, /currentVelocity - referenceVelocity/);
  assert.match(workspace, /Capacity impact vs saved team setup/);
});
test('established BL freezes displayed capacity and hides draft delta', () => {
  assert.match(workspace, /established \? 'Frozen baseline assumptions/);
  assert.match(workspace, /\{!established && <p role="status"/);
});
test('labels equal positive capacity as balanced and zero as no delivery capacity', () => {
  assert.match(workspace, /realisticStoryPointsPerSprint === 0 \? 'No delivery capacity' : 'Balanced'/);
});
test('capacity editing still uses blur Enter staged commit, with invalid states explained', () => {
  assert.match(workspace, /onBlur=\{\(\) => commitCapacity\(\)\}/);
  assert.match(workspace, /Pending capacity inputs are invalid/);
});
