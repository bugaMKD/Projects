import assertPsp from 'node:assert/strict';
import { readFileSync as readPspSource } from 'node:fs';
import { resolve as resolvePspPath } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const s = readFileSync(new URL('../src/ReleaseWorkspace.tsx', import.meta.url), 'utf8');
const impactStart = s.indexOf('aria-label="Capacity impact and forecast visibility"');
const impactEnd = s.indexOf('aria-label="Baseline status messages"', impactStart);
assert.ok(impactStart >= 0 && impactEnd > impactStart, 'Capacity panel and status boundary must exist');
const impact = s.slice(impactStart, impactEnd);
const metrics = ['SE potential throughput', 'QA potential throughput', 'Forecasted realistic velocity', 'Capacity balance', 'Expected realistic completion'];

test('five capacity-impact tiles are in the required order', () => {
  const source = readPspSource(resolvePspPath(process.cwd(), 'src/ReleaseWorkspace.tsx'),'utf8');
  const start = source.indexOf('aria-label="Capacity impact metrics"');
  const end = source.indexOf('aria-label="Baseline actions"',start);
  assertPsp.ok(start>=0 && end>start, 'Full-width impact summary must precede baseline actions');
  const metrics = source.slice(start,end);
  const ordered = ['Capacity balance','SE potential throughput','QA potential throughput','Forecasted realistic velocity','Expected realistic completion'];
  let previous=-1;
  for(const name of ordered) {
    const index=metrics.indexOf('title="'+name+'"');
    assertPsp.ok(index>previous, 'Missing or out of order: '+name);
    previous=index;
  }
  assertPsp.equal((metrics.match(/<Metric title=/g)||[]).length,5);
});

test('five tiles occupy a single grid row with horizontal overflow on narrow screens', () => {
  assert.match(impact, /gridTemplateColumns:'repeat\(5, minmax\(160px, 1fr\)\)'/);
  assert.match(impact, /overflowX:'auto'/);
});

test('Save Draft is left, Establish Baseline right on the same action row', () => {
  const start = impact.indexOf('aria-label="Baseline actions"');
  assert.ok(start >= 0);
  const end = impact.indexOf('</div>', start);
  const actions = impact.slice(start, end);
  assert.match(actions, /justifyContent:'space-between'/);
  assert.ok(actions.indexOf('onClick={saveDraft}') < actions.indexOf('onClick={establish}'));
  assert.equal((s.match(/onClick=\{saveDraft\}/g) ?? []).length, 1);
  assert.equal((s.match(/onClick=\{establish\}/g) ?? []).length, 1);
  assert.doesNotMatch(s, /aria-label="Baseline establishment"/); // removed panel must stay removed
});

test('existing draft safety guards and established-baseline behavior are unchanged', () => {
  assert.match(impact, /disabled=\{!eligibility.allowed \|\| actualPreviewDirty \|\| pendingSprintCorrection\} onClick=\{saveDraft\}/);
  assert.match(impact, /disabled=\{!eligibility.allowed \|\| actualPreviewDirty \|\| pendingSprintCorrection\} onClick=\{establish\}/);
  assert.match(s, /buildEstablishedBaselineDataset\(established, completedActuals\)/);
  assert.match(s, /stroke="#dc2626"/);
});
