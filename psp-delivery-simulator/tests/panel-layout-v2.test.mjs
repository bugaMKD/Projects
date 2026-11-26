import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const workspace = readFileSync(fileURLToPath(new URL('../src/ReleaseWorkspace.tsx', import.meta.url)), 'utf8');
const capacity = readFileSync(fileURLToPath(new URL('../src/components/ReleaseHistoricalCapacityView.tsx', import.meta.url)), 'utf8');

test('BL completion forecast is left of future SE/QA breakdown, and PSP allocation is below', () => {
  const left = workspace.indexOf('title={established ? "Established BL completion forecast" : "Draft BL completion forecast"}');
  const right = workspace.indexOf('mode="future"/>');
  const below = workspace.indexOf('title="PSP allocation"');
  assert.ok(left >= 0 && right > left && below > right);
  const gridStart = workspace.lastIndexOf('<div className="lower-grid">', left);
  assert.ok(gridStart >= 0);
  assert.ok(!workspace.slice(gridStart, right).includes('title="PSP allocation"'));
});

test('future capacity summary keeps effective days and potential throughput, hides available days', () => {
  assert.match(capacity, /Effective days \/ sprint/);
  assert.match(capacity, /Potential SP \/ sprint/);
  assert.match(capacity, /mode !== 'future' && <th[^>]*>Available days \/ sprint<\/th>/);
  assert.match(capacity, /mode !== 'future' && <td style=\{cell\}>\{fmt\(r\.futureAvailableDaysPerSprint\)\}<\/td>/);
});
