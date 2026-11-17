import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workspace = readFileSync(new URL('../src/ReleaseWorkspace.tsx', import.meta.url), 'utf8');
const history = readFileSync(new URL('../src/components/ReleaseHistoricalCapacityView.tsx', import.meta.url), 'utf8');
const status = workspace.slice(workspace.indexOf('aria-label="Baseline establishment"'), workspace.indexOf('aria-label="Release metrics"'));

test('5.4.7 realistic capacity appears inside BL status, before release metrics', () => {
  assert.match(status, /title="Realistic capacity"/);
  assert.match(status, /formatStoryPoints\(baselineCapacity\.realisticStoryPointsPerSprint\)/);
});

test('5.4.7 capacity balance appears in BL status and respects role-specific wording', () => {
  assert.match(status, /title="Capacity balance" value=\{capacityBalance\}/);
  assert.match(workspace, /baselineCapacity\.limitingRole === 'SE' \? 'SE limiting'/);
  assert.match(workspace, /baselineCapacity\.limitingRole === 'QA' \? 'QA limiting'/);
});

test('5.4.7 status uses live valid draft inputs or frozen established inputs', () => {
  assert.match(workspace, /established\?\.historical \?\? validHistorical/);
  assert.match(workspace, /established\?\.sprintMembers \?\? validSprintMembers/);
  assert.match(workspace, /summarizeReleaseCapacity\(/);
});

test('5.4.7 historical panel keeps breakdown but no longer duplicates headline metrics', () => {
  assert.doesNotMatch(history, /<strong>Realistic capacity:<\/strong>/);
  assert.doesNotMatch(history, /<strong>Capacity balance:<\/strong>/);
  assert.match(history, /Historical SP \/ effective day/);
  assert.match(history, /Potential SP \/ sprint/);
});

test('5.4.7 saves BL and sprint-edit behavior unchanged', () => {
  assert.match(workspace, /onClick=\{saveDraft\}/);
  assert.match(workspace, /onClick=\{establish\}/);
  assert.match(workspace, /onClick=\{saveSprintCorrections\}/);
  assert.match(workspace, /buildEstablishedBaselineDataset\(established, completedActuals\)/);
});
