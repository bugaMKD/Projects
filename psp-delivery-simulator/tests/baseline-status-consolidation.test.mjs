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

test('draft, established, and error status survive independent of collapsed inputs', () => {
  const collapsedAt = capacity.indexOf('</details>');
  const statusesAt = capacity.indexOf('aria-label="Baseline status messages"');
  assert.ok(collapsedAt !== -1 && statusesAt > collapsedAt);
  for (const term of ['All draft changes saved','Unsaved changes','Baseline established · Inputs locked', 'actionError', 'eligibility.reason']) {
    assert.ok(capacity.indexOf(term, statusesAt) > statusesAt, `Missing: ${term}`);
  }
});

test('five metrics, scope line, chart and sprint history stay intact', () => {
  for (const term of ['SE potential throughput','QA potential throughput','Forecasted realistic velocity','Capacity balance','Expected realistic completion']) assert.ok(source.includes(term));
  assert.match(source, /stroke="#dc2626"/);
  assert.match(source, /className="panel chart-panel"/);
  assert.match(source, /className="panel sprint-panel"/);
});
