import assertPsp from 'node:assert/strict';
import { readFileSync as readPspSource } from 'node:fs';
import { resolve as resolvePspPath } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const workspace = readFileSync(new URL('../src/ReleaseWorkspace.tsx', import.meta.url), 'utf8');
const capacity = readFileSync(new URL('../src/components/ReleaseHistoricalCapacityView.tsx', import.meta.url), 'utf8');
const pos = (needle) => { const p=workspace.indexOf(needle); assert.notEqual(p,-1,`Missing ${needle}`); return p; };

test('5.4.8 release planning is default, with accessible in-workspace tabs', () => {
  assert.match(workspace, /useState<'planning' \| 'history'>\('planning'\)/);
  assert.match(workspace, /role="tablist"/);
  assert.match(workspace, /role="tab"[^>]*aria-selected=\{workspaceTab === 'planning'\}/);
  assert.match(workspace, /role="tab"[^>]*aria-selected=\{workspaceTab === 'history'\}/);
  assert.match(workspace, /role="tabpanel" id="release-planning-panel"/);
  assert.match(workspace, /role="tabpanel" id="historical-data-panel"/);
});
test('release planning retains baseline actions and monitoring after BL Status removal', () => {
  const source = readPspSource(resolvePspPath(process.cwd(), 'src/ReleaseWorkspace.tsx'),'utf8');
  const markers=['aria-label="BL future team capacity"','className="panel chart-panel psp-chart-pane"','aria-label="Capacity impact summary"','aria-label="Baseline actions"','aria-label="Baseline status messages"','className="panel sprint-panel"'];
  let previous=-1;
  for(const marker of markers) {
    const index=source.indexOf(marker);
    assertPsp.ok(index>previous, 'Missing or out-of-order: '+marker);
    previous=index;
  }
  assertPsp.match(source,/id="historical-data-panel"/);
  assertPsp.doesNotMatch(source,/aria-label="Baseline establishment"/);
});

test('5.4.8 historical form and stats are in historical tab only', () => {
  assert.ok(pos('id="historical-data-panel"') < pos('aria-label="BL historical productivity"'));
  assert.ok(pos('aria-label="BL historical productivity"') < pos('mode="historical"'));
  assert.match(capacity, /mode !== 'future'/);
  assert.match(capacity, /mode === 'historical'/);
  assert.match(capacity, /Historical SP \/ effective day/);
});
test('5.4.8 historical assumptions remain release-specific and frozen after BL', () => {
  assert.match(workspace, /session\.committed/);
  assert.match(workspace, /established\?\.historical \?\? validHistorical/);
  assert.match(workspace, /disabled=\{!!established\} aria-label=\{field\.label\}/);
  assert.match(workspace, /createDraftHistoricalFormInput\(initial\.historical\)/);
  assert.match(workspace, /onSaveDraft\(currentInputs\)/);
});
test('5.4.8 tab switching does not remove sprint editing or BL protections', () => {
  for (const method of ['onClick={saveDraft}', 'onClick={establish}', 'onClick={recordSprint}', 'onClick={applySprintPreview}', 'onClick={saveSprintCorrections}', 'onClick={discardSprintPreview}']) assert.ok(workspace.includes(method), method);
  assert.match(workspace, /buildEstablishedBaselineDataset\(established, completedActuals\)/);
  assert.match(workspace, /hidden=\{workspaceTab !== 'planning'\}/);
  assert.match(workspace, /hidden=\{workspaceTab !== 'history'\}/);
});
