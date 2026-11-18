import assertPsp from 'node:assert/strict';
import { readFileSync as readPspSource } from 'node:fs';
import { resolve as resolvePspPath } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const workspace = readFileSync(new URL('../src/ReleaseWorkspace.tsx', import.meta.url), 'utf8');

test('capacity impact is displayed with editable future team capacity', () => {
  const source = readPspSource(resolvePspPath(process.cwd(), 'src/ReleaseWorkspace.tsx'),'utf8');
  const team=source.indexOf('aria-label="BL future team capacity"');
  const chart=source.indexOf('className="panel chart-panel psp-chart-pane"');
  const impact=source.indexOf('aria-label="Capacity impact and forecast visibility"');
  const actions=source.indexOf('aria-label="Baseline actions"');
  const status=source.indexOf('aria-label="Baseline status messages"');
  assertPsp.ok(team>=0 && chart>team, 'Team capacity and chart must share planning layout');
  assertPsp.ok(impact>chart && actions>impact && status>actions, 'Full-width metrics, actions and status must follow chart');
  assertPsp.doesNotMatch(source,/aria-label="Baseline establishment"/);
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
test('capacity editing uses explicit row apply/cancel with validation', () => {
  const source = readPspSource(resolvePspPath(process.cwd(), 'src/ReleaseWorkspace.tsx'),'utf8');
  for(const marker of ['title="Edit member"','title="Apply row"','title="Cancel edit"','title="Remove member"','capacityRowError','aria-invalid={!!errors.availableDaysText}','aria-invalid={!!errors.productivityPercentText}']) {
    assertPsp.ok(source.includes(marker), 'Missing '+marker);
  }
  assertPsp.match(source,/commitDraftSprintCapacityForm\(capacityForm,validSprintMembers\)/);
  assertPsp.match(source,/if\(result\.applied\) \{setValidSprintMembers\(result\.members\)/);
  assertPsp.match(source,/setCapacityForm\(createDraftSprintCapacityForm\(validSprintMembers\)\)/);
  assertPsp.match(source,/capacityValidation\.members===null/);
});

