import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const workspace = readFileSync(new URL('../src/ReleaseWorkspace.tsx',import.meta.url),'utf8');

test('insight uses historical productivity and role potential throughput',()=>{
  assert.match(workspace,/calculateCapacityBalanceInsight\(\{/);
  assert.match(workspace,/baselineCapacity\.se\.potentialStoryPointsPerSprint/);
  assert.match(workspace,/baselineCapacity\.qa\.potentialStoryPointsPerSprint/);
  assert.match(workspace,/historicalDeliveredStoryPoints:/);
  assert.match(workspace,/historicalSeEffectiveDays:/);
  assert.match(workspace,/historicalQaEffectiveDays:/);
});
test('capacity balance first metric shows label, gap, shortfall, and severity',()=>{
  const a=workspace.indexOf('aria-label="Capacity impact metrics"');
  const b=workspace.indexOf('title="SE potential throughput"',a);
  const first=workspace.slice(a,b);
  assert.ok(a>=0 && b>a);
  assert.match(first,/aria-label="Capacity balance insight"/);
  assert.match(first,/title="Capacity balance" value=\{capacityBalance\}/);
  assert.match(first,/formatCapacityGapPercent\(capacityInsight\.gapPercent\)/);
  assert.match(first,/formatCapacityShortfall\(capacityInsight\)/);
  assert.match(first,/capacityInsight\.severity === 'balanced'/);
  assert.match(first,/capacityInsight\.severity === 'moderate'/);
  assert.match(first,/capacityInsight\.severity === 'high'/);
});
test('does not alter the release forecast inputs, locked BL or actions',()=>{
  assert.match(workspace,/buildReleaseChartDataset\(\{/);
  assert.match(workspace,/buildEstablishedBaselineDataset\(established, completedActuals\)/);
  assert.match(workspace,/aria-label="Baseline actions"/);
  assert.equal((workspace.match(/onClick=\{saveDraft\}/g)??[]).length,1);
  assert.equal((workspace.match(/onClick=\{establish\}/g)??[]).length,1);
  assert.match(workspace,/className="panel psp-combined-planning"/);
  assert.match(workspace,/className="panel chart-panel psp-chart-pane"/);
});
