import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const workspace=readFileSync(new URL('../src/ReleaseWorkspace.tsx',import.meta.url),'utf8');
const component=readFileSync(new URL('../src/components/ReleaseHistoricalCapacityView.tsx',import.meta.url),'utf8');
test('5.4.3 workspace stops rendering static HistoricalCapacityView',()=>{
  assert.doesNotMatch(workspace,/<HistoricalCapacityView\s*\/?\s*>/);
  assert.match(workspace,/<ReleaseHistoricalCapacityView /);
});
test('established releases display immutable BL inputs, draft displays committed inputs',()=>{
  assert.match(workspace,/historical=\{established\?\.historical \?\? validHistorical\}/);
  assert.match(workspace,/sprintMembers=\{established\?\.sprintMembers \?\? validSprintMembers\}/);
});
test('new display component does not import mock data or forecasting services',()=>{
  assert.doesNotMatch(component,/mockData|buildReleaseChartDataset|forecastScenarios/);
  assert.match(component,/summarizeReleaseCapacity\(historical, sprintMembers\)/);
});
test('capacity panel explicitly distinguishes historical totals and future per-sprint effort',()=>{
  assert.match(component,/Historical SE effective days/);
  assert.match(component,/Effective days \/ sprint/);
  assert.match(workspace,/title="Capacity balance"/);
  assert.doesNotMatch(component,/<strong>Capacity balance:<\/strong>/);
});
