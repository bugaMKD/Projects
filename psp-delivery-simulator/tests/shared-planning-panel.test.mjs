import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const s=readFileSync(new URL('../src/ReleaseWorkspace.tsx',import.meta.url),'utf8');

test('single shared planning panel contains both 40/60 panes',()=>{
  const a=s.indexOf('className="panel psp-combined-planning"');
  const b=s.indexOf('className="panel psp-capacity-pane"',a);
  const c=s.indexOf('className="panel chart-panel psp-chart-pane"',b);
  const d=s.indexOf('aria-label="Capacity impact summary"',c);
  assert.ok(a>=0&&b>a&&c>b&&d>c);
  assert.match(s,/gridTemplateColumns:'minmax\(0, 2fr\) minmax\(0, 3fr\)'/);
  assert.match(s,/alignItems:'stretch'/);
});
test('capacity table stays visible without its own accordion',()=>{
  assert.doesNotMatch(s,/aria-label="Future team capacity details"/);
  assert.doesNotMatch(s,/teamCapacityOpen/);
  assert.match(s,/className="psp-capacity-body"/);
  assert.match(s,/aria-label="Future team capacity table"/);
  assert.match(s,/capacityForm\.map/);
});
test('both panes stretch and team rows scroll independently',()=>{
  assert.match(s,/\.psp-combined-planning \.psp-planning-compare > \.panel/);
  assert.match(s,/min-height: 440px; height: 100%/);
  assert.match(s,/max-height: 365px; overflow-y: auto/);
  assert.match(s,/@media \(max-width: 900px\)/);
});
test('preserves unchanged saving and chart model',()=>{
  assert.equal((s.match(/onClick=\{saveDraft\}/g)||[]).length,1);
  assert.equal((s.match(/onClick=\{establish\}/g)||[]).length,1);
  assert.match(s,/buildEstablishedBaselineDataset\(established, completedActuals\)/);
  assert.match(s,/aria-label="Baseline status messages"/);
});
