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
test('5.4.8 release planning contains future capacity, BL, chart, actuals, allocation and outlook', () => {
  assert.ok(pos('id="release-planning-panel"') < pos('aria-label="BL future team capacity"'));
  assert.ok(pos('aria-label="BL future team capacity"') < pos('aria-label="Baseline establishment"'));
  assert.ok(pos('aria-label="Baseline establishment"') < pos('<section className="panel chart-panel">'));
  assert.ok(pos('<section className="panel chart-panel">') < pos('<section className="panel sprint-panel">'));
  assert.ok(pos('<section className="panel sprint-panel">') < pos('<div className="lower-grid">'));
  assert.ok(pos('mode="future"') < pos('id="historical-data-panel"'));
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
