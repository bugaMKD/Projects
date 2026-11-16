import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workspace = readFileSync(new URL('../src/ReleaseWorkspace.tsx', import.meta.url), 'utf8');
const position = (text) => {
  const index = workspace.indexOf(text);
  assert.notEqual(index, -1, `Missing workspace panel: ${text}`);
  return index;
};

test('5.4.6 burn-up is immediately followed by actual sprint history', () => {
  const chart = position('<section className="panel chart-panel">');
  const sprint = position('<section className="panel sprint-panel">');
  const allocation = position('<div className="lower-grid">');
  assert.ok(chart < sprint && sprint < allocation);
  const between = workspace.slice(chart, sprint);
  assert.ok(between.includes('title="Release burn-up"'));
  assert.ok(!between.includes('<section className="panel sprint-panel">'));
  assert.ok(!between.includes('<div className="lower-grid">'));
});

test('5.4.6 PSP allocation and BL outlook remain side-by-side after actuals', () => {
  const sprint = position('<section className="panel sprint-panel">');
  const grid = position('<div className="lower-grid">');
  const allocation = position('title="PSP allocation"');
  const outlook = position('title={established ? "Established BL completion forecast"');
  const capacity = position('<ReleaseHistoricalCapacityView ');
  assert.ok(sprint < grid && grid < allocation && allocation < outlook && outlook < capacity);
});

test('5.4.6 section labels reflect updated order', () => {
  assert.match(workspace, /eyebrow="02 \/ Actual delivery"/);
  assert.match(workspace, /eyebrow="03 \/ Capacity planning · Preserved from v1"/);
  assert.match(workspace, /'04 \/ Established BL outlook' : '04 \/ Draft BL delivery outlook'/);
});

test('5.4.6 sprint editing and persistence controls remain available', () => {
  assert.match(workspace, /onClick=\{recordSprint\}/);
  assert.match(workspace, /onClick=\{applySprintPreview\}/);
  assert.match(workspace, /onClick=\{saveSprintCorrections\}/);
  assert.match(workspace, /onClick=\{discardSprintPreview\}/);
  assert.match(workspace, /buildEstablishedBaselineDataset\(established, completedActuals\)/);
});
