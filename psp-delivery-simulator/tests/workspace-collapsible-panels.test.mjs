import assertPsp from 'node:assert/strict';
import { readFileSync as readPspSource } from 'node:fs';
import { resolve as resolvePspPath } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const s = readFileSync(new URL('../src/ReleaseWorkspace.tsx', import.meta.url), 'utf8');

const panelBody = (label) => {
  const begin = s.indexOf(`aria-label="${label}"`);
  assert.ok(begin >= 0, `Missing ${label}`);
  const end = s.indexOf('</details>', begin);
  assert.ok(end > begin, `Missing closing details for ${label}`);
  return s.slice(begin, end);
};

test('only release configuration and historical productivity are collapsible', () => {
  const s = readFileSync(new URL('../src/ReleaseWorkspace.tsx', import.meta.url), 'utf8');
  assert.match(s, /const \[releaseConfigOpen, setReleaseConfigOpen\] = useState\(!established\)/);
  assert.match(s, /const \[historicalOpen, setHistoricalOpen\] = useState\(!established\)/);
  assert.match(s, /open=\{releaseConfigOpen\}/);
  assert.match(s, /open=\{historicalOpen\}/);
  assert.doesNotMatch(s, /teamCapacityOpen|aria-label="Future team capacity details"/);
  assert.match(s, /className="panel psp-combined-planning"/);
  assert.match(s, /aria-label="Future team capacity table"/);
});

test('release configuration header includes scope and full set of inputs', () => {
  const body=panelBody('Release configuration details');
  assert.match(body, /<summary[^>]*>[\s\S]*Release Configuration/);
  assert.match(body, /Draft release scope \(SP\)/);
  assert.match(body, /Forecast variation/);
  assert.match(body, /Release name/);
});

test('team capacity is always visible in shared planning card', () => {
  const source = readPspSource(resolvePspPath(process.cwd(), 'src/ReleaseWorkspace.tsx'),'utf8');
  assertPsp.match(source,/className="panel psp-combined-planning"/);
  assertPsp.match(source,/aria-label="Future team capacity table"/);
  assertPsp.match(source,/capacityForm\.map/);
  assertPsp.match(source,/className="panel chart-panel psp-chart-pane"/);
  assertPsp.doesNotMatch(source,/aria-label="Future team capacity details"/);
  assertPsp.ok(source.indexOf('aria-label="Capacity impact and forecast visibility"')>source.indexOf('className="panel chart-panel psp-chart-pane"'));
});

test('Save Draft and Establish Baseline are together in full-width impact summary', () => {
  const source = readPspSource(resolvePspPath(process.cwd(), 'src/ReleaseWorkspace.tsx'),'utf8');
  const start=source.indexOf('aria-label="Baseline actions"');
  const status=source.indexOf('aria-label="Baseline status messages"',start);
  assertPsp.ok(start>=0 && status>start, 'Baseline actions must be in summary');
  const actions=source.slice(start,status);
  assertPsp.match(actions,/onClick=\{saveDraft\}/);
  assertPsp.match(actions,/onClick=\{establish\}/);
  assertPsp.equal((source.match(/onClick=\{saveDraft\}/g)||[]).length,1);
  assertPsp.equal((source.match(/onClick=\{establish\}/g)||[]).length,1);
  assertPsp.doesNotMatch(source,/aria-label="Baseline establishment"/);
});

test('historical data has its own complete accordion', () => {
  const body=panelBody('Historical productivity details');
  assert.match(body, /<summary[^>]*>[\s\S]*Historical Productivity/);
  assert.match(body, /historicalForm\[field.key\]/);
  assert.match(s, /mode="historical"/);
});

test('burn-up, capacity summary and sprint history remain visible outside accordions', () => {
  const source = readPspSource(resolvePspPath(process.cwd(), 'src/ReleaseWorkspace.tsx'),'utf8');
  const chart=source.indexOf('className="panel chart-panel psp-chart-pane"');
  const summary=source.indexOf('aria-label="Capacity impact summary"');
  const sprint=source.indexOf('className="panel sprint-panel"');
  assertPsp.ok(chart>=0 && summary>chart && sprint>summary);
  assertPsp.match(source,/stroke="#dc2626"/);
  assertPsp.match(source,/psp-planning-compare/);
});

