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

test('three complete panel accordions with independently managed state', () => {
  assert.match(s, /const \[releaseConfigOpen, setReleaseConfigOpen\] = useState\(!established\)/);
  assert.match(s, /const \[teamCapacityOpen, setTeamCapacityOpen\] = useState\(!established\)/);
  assert.match(s, /const \[historicalOpen, setHistoricalOpen\] = useState\(!established\)/);
  assert.match(s, /open=\{releaseConfigOpen\} onToggle=\{event => setReleaseConfigOpen\(event.currentTarget.open\)\}/);
  assert.match(s, /open=\{teamCapacityOpen\} onToggle=\{event => setTeamCapacityOpen\(event.currentTarget.open\)\}/);
  assert.match(s, /open=\{historicalOpen\} onToggle=\{event => setHistoricalOpen\(event.currentTarget.open\)\}/);
  assert.equal((s.match(/<details open=/g) ?? []).length, 3);
  assert.equal((s.match(/<\/details>/g) ?? []).length, 3);
});

test('release configuration header includes scope and full set of inputs', () => {
  const body=panelBody('Release configuration details');
  assert.match(body, /<summary[^>]*>[\s\S]*Release Configuration/);
  assert.match(body, /Draft release scope \(SP\)/);
  assert.match(body, /Forecast variation/);
  assert.match(body, /Release name/);
});

test('future capacity accordion includes inputs and impact summary', () => {
  const body=panelBody('Future team capacity details');
  assert.match(body, /<summary[^>]*>[\s\S]*Future SE\/QA Capacity/);
  assert.match(body, /capacityForm\.map/);
  assert.match(body, /\+ Add SE/);
  assert.match(body, /Capacity impact and forecast visibility/);
  assert.match(body, /Expected realistic completion/);
});

test('Save Draft is inside future capacity, and is removed from BL Status', () => {
  assert.equal((s.match(/onClick=\{saveDraft\}/g) ?? []).length, 1);
  assert.match(panelBody('Future team capacity details'), /onClick=\{saveDraft\}/);
  const baselineStart=s.indexOf('aria-label="Baseline establishment"');
  const baselineEnd=s.indexOf('</section>', baselineStart);
  const baseline=s.slice(baselineStart,baselineEnd);
  assert.doesNotMatch(baseline,/onClick=\{saveDraft\}/);
  assert.doesNotMatch(baseline,/onClick=\{establish\}/);
  assert.match(panelBody('Future team capacity details'), /onClick=\{establish\}/);
});

test('historical data has its own complete accordion', () => {
  const body=panelBody('Historical productivity details');
  assert.match(body, /<summary[^>]*>[\s\S]*Historical Productivity/);
  assert.match(body, /historicalForm\[field.key\]/);
  assert.match(s, /mode="historical"/);
});

test('baseline, burn-up chart, and sprint history remain outside accordions', () => {
  const last=s.lastIndexOf('</details>');
  assert.ok(s.indexOf('aria-label="Baseline establishment"') < s.indexOf('aria-label="Historical productivity details"'));
  assert.ok(s.indexOf('className="panel chart-panel"') > s.indexOf('aria-label="Baseline establishment"'));
  assert.match(s,/className="panel sprint-panel"/);
  assert.match(s,/stroke="#dc2626"/);
});
