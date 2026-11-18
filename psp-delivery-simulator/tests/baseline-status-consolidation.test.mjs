import assertPsp from 'node:assert/strict';
import { readFileSync as readPspSource } from 'node:fs';
import { resolve as resolvePspPath } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/ReleaseWorkspace.tsx', import.meta.url), 'utf8');
const capacityStart = source.indexOf('aria-label="BL future team capacity"');
const capacityEnd = source.indexOf('aria-label="Release metrics"', capacityStart);
const capacity = source.slice(capacityStart, capacityEnd);

test('old BL Status panel is gone', () => {
  assert.doesNotMatch(source, /aria-label="Baseline establishment"/);
  assert.doesNotMatch(source, /<h2>\{established \? 'Established BL' : 'Draft BL'\}<\/h2>/);
});

test('the two baseline actions remain together in capacity panel', () => {
  assert.match(capacity, /aria-label="Baseline actions"/);
  assert.match(capacity, /onClick=\{saveDraft\}/);
  assert.match(capacity, /onClick=\{establish\}/);
  assert.equal((source.match(/onClick=\{saveDraft\}/g) ?? []).length, 1);
  assert.equal((source.match(/onClick=\{establish\}/g) ?? []).length, 1);
});

test('manual save and immutable BL explanation follow the actions', () => {
  assert.match(capacity, /Save Draft is manual\. Establish Baseline automatically saves the immutable snapshot\./);
  assert.match(capacity, /Saved releases can be reopened from Release Management\./);
});

test('baseline status remains outside capacity inputs in shared planning layout', () => {
  const s = readFileSync(new URL('../src/ReleaseWorkspace.tsx', import.meta.url), 'utf8');
  const shared = s.indexOf('className="panel psp-combined-planning"');
  const capacity = s.indexOf('aria-label="Future team capacity table"', shared);
  const chart = s.indexOf('className="panel chart-panel psp-chart-pane"', capacity);
  const actions = s.indexOf('aria-label="Baseline actions"', chart);
  const status = s.indexOf('aria-label="Baseline status messages"', actions);
  assert.ok(shared >= 0 && capacity > shared && chart > capacity && actions > chart && status > actions);
  assert.doesNotMatch(s, /aria-label="Future team capacity details"/);
  for (const marker of ['All draft changes saved', 'Unsaved changes', 'Baseline established · Inputs locked', 'actionError', 'eligibility.reason']) {
    assert.ok(s.indexOf(marker, status) > status, 'Missing baseline status: ' + marker);
  }
});

test('five metrics, scope line, chart and sprint history stay intact', () => {
  const source = readPspSource(resolvePspPath(process.cwd(), 'src/ReleaseWorkspace.tsx'),'utf8');
  for (const title of ['Capacity balance','SE potential throughput','QA potential throughput','Forecasted realistic velocity','Expected realistic completion']) {
    assertPsp.ok(source.includes('title="'+title+'"'), 'Missing '+title);
  }
  assertPsp.match(source, /stroke="#dc2626"/);
  assertPsp.match(source, /className="panel chart-panel psp-chart-pane"/);
  assertPsp.match(source, /className="panel sprint-panel"/);
});

