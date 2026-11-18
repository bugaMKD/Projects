import fs from 'node:fs';
import path from 'node:path';

// Test-only migration. Refuses to modify anything unless all nine known
// obsolete contracts are present and the 5.6.0 UI markers are in place.
const root=process.cwd();
const workspace=path.join(root,'src','ReleaseWorkspace.tsx');
if (!fs.existsSync(workspace)) throw Error('Run from psp-delivery-simulator root.');
const src=fs.readFileSync(workspace,'utf8');
for(const marker of ['psp-planning-compare','psp-chart-pane','Future team capacity table','aria-label="Capacity impact summary"','aria-label="Baseline status messages"']) {
  if(!src.includes(marker)) throw Error(`Expected applied 5.6.0 workspace marker missing: ${marker}. No files changed.`);
}

const files = {
 'baseline-status-consolidation.test.mjs': [
  ['five metrics, scope line, chart and sprint history stay intact', String.raw`test('five metrics, scope line, chart and sprint history stay intact', () => {
  const source = readPspSource(resolvePspPath(process.cwd(), 'src/ReleaseWorkspace.tsx'),'utf8');
  for (const title of ['Capacity balance','SE potential throughput','QA potential throughput','Forecasted realistic velocity','Expected realistic completion']) {
    assertPsp.ok(source.includes('title="'+title+'"'), 'Missing '+title);
  }
  assertPsp.match(source, /stroke="#dc2626"/);
  assertPsp.match(source, /className="panel chart-panel psp-chart-pane"/);
  assertPsp.match(source, /className="panel sprint-panel"/);
});`]
 ],
 'capacity-impact-action-layout.test.mjs': [
  ['five capacity-impact tiles are in the required order', String.raw`test('five capacity-impact tiles are in the required order', () => {
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
});`]
 ],
 'capacity-impact-ui.test.mjs': [
  ['capacity impact is displayed with editable future team capacity', String.raw`test('capacity impact is displayed with editable future team capacity', () => {
  const source = readPspSource(resolvePspPath(process.cwd(), 'src/ReleaseWorkspace.tsx'),'utf8');
  const team=source.indexOf('aria-label="BL future team capacity"');
  const chart=source.indexOf('className="panel chart-panel psp-chart-pane"');
  const impact=source.indexOf('aria-label="Capacity impact and forecast visibility"');
  const actions=source.indexOf('aria-label="Baseline actions"');
  const status=source.indexOf('aria-label="Baseline status messages"');
  assertPsp.ok(team>=0 && chart>team, 'Team capacity and chart must share planning layout');
  assertPsp.ok(impact>chart && actions>impact && status>actions, 'Full-width metrics, actions and status must follow chart');
  assertPsp.doesNotMatch(source,/aria-label="Baseline establishment"/);
});`],
  ['capacity editing still uses blur Enter staged commit, with invalid states explained', String.raw`test('capacity editing uses explicit row apply/cancel with validation', () => {
  const source = readPspSource(resolvePspPath(process.cwd(), 'src/ReleaseWorkspace.tsx'),'utf8');
  for(const marker of ['title="Edit member"','title="Apply row"','title="Cancel edit"','title="Remove member"','capacityRowError','aria-invalid={!!errors.availableDaysText}','aria-invalid={!!errors.productivityPercentText}']) {
    assertPsp.ok(source.includes(marker), 'Missing '+marker);
  }
  assertPsp.match(source,/commitDraftSprintCapacityForm\(capacityForm,validSprintMembers\)/);
  assertPsp.match(source,/if\(result\.applied\) \{setValidSprintMembers\(result\.members\)/);
  assertPsp.match(source,/setCapacityForm\(createDraftSprintCapacityForm\(validSprintMembers\)\)/);
  assertPsp.match(source,/capacityValidation\.members===null/);
});`]
 ],
 'workspace-collapsible-panels.test.mjs': [
  ['future capacity accordion includes inputs and impact summary', String.raw`test('capacity accordion contains compact editable table, while impact summary is full-width', () => {
  const source = readPspSource(resolvePspPath(process.cwd(), 'src/ReleaseWorkspace.tsx'),'utf8');
  const start=source.indexOf('aria-label="Future team capacity details"');
  const end=source.indexOf('</details>',start);
  assertPsp.ok(start>=0 && end>start, 'Capacity details must remain collapsible');
  const details=source.slice(start,end);
  assertPsp.match(details,/Future SE\/QA Capacity/);
  assertPsp.match(details,/Future team capacity table/);
  assertPsp.match(details,/capacityForm\.map/);
  assertPsp.match(source,/\+ Add SE/);
  assertPsp.doesNotMatch(details,/aria-label="Capacity impact and forecast visibility"/);
  assertPsp.ok(source.indexOf('aria-label="Capacity impact and forecast visibility"')>end);
});`],
  ['Save Draft is inside future capacity, and is removed from BL Status', String.raw`test('Save Draft and Establish Baseline are together in full-width impact summary', () => {
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
});`],
  ['baseline, burn-up chart, and sprint history remain outside accordions', String.raw`test('burn-up, capacity summary and sprint history remain visible outside accordions', () => {
  const source = readPspSource(resolvePspPath(process.cwd(), 'src/ReleaseWorkspace.tsx'),'utf8');
  const chart=source.indexOf('className="panel chart-panel psp-chart-pane"');
  const summary=source.indexOf('aria-label="Capacity impact summary"');
  const sprint=source.indexOf('className="panel sprint-panel"');
  assertPsp.ok(chart>=0 && summary>chart && sprint>summary);
  assertPsp.match(source,/stroke="#dc2626"/);
  assertPsp.match(source,/psp-planning-compare/);
});`]
 ],
 'workspace-history-tabs.test.mjs': [
  ['release planning retains baseline actions and monitoring after BL Status removal', String.raw`test('release planning retains baseline actions and monitoring after BL Status removal', () => {
  const source = readPspSource(resolvePspPath(process.cwd(), 'src/ReleaseWorkspace.tsx'),'utf8');
  const markers=['aria-label="BL future team capacity"','className="panel chart-panel psp-chart-pane"','aria-label="Capacity impact summary"','aria-label="Baseline actions"','aria-label="Baseline status messages"','className="panel sprint-panel"'];
  let previous=-1;
  for(const marker of markers) {
    const index=source.indexOf(marker);
    assertPsp.ok(index>previous, 'Missing or out-of-order: '+marker);
    previous=index;
  }
  assertPsp.match(source,/id="historical-data-panel"/);
  assertPsp.doesNotMatch(source,/aria-label="Baseline establishment"/);
});`]
 ],
 'workspace-panel-order.test.mjs': [
  ['5.4.6 burn-up is immediately followed by actual sprint history', String.raw`test('5.6.0 capacity-and-chart comparison precedes metrics and sprint history', () => {
  const source = readPspSource(resolvePspPath(process.cwd(), 'src/ReleaseWorkspace.tsx'),'utf8');
  const markers=['className="psp-planning-compare"','aria-label="BL future team capacity"','className="panel chart-panel psp-chart-pane"','aria-label="Capacity impact summary"','className="panel sprint-panel"'];
  let previous=-1;
  for(const marker of markers) {
    const index=source.indexOf(marker);
    assertPsp.ok(index>previous, 'Missing or out-of-order: '+marker);
    previous=index;
  }
  assertPsp.match(source,/gridTemplateColumns:'minmax\(0, 2fr\) minmax\(0, 3fr\)'/);
});`]
 ]
};

const all=[];
for(const [file, changes] of Object.entries(files)) {
  const p=path.join(root,'tests',file);
  if(!fs.existsSync(p)) throw Error('Required test file missing: '+p+'. No files changed.');
  const before=fs.readFileSync(p,'utf8');
  let after=before;
  const testRx=/^test\(\s*(['"])(.*?)\1\s*,/gm;
  for(const [name, newTest] of changes) {
    const candidates=[...after.matchAll(testRx)];
    const candidate=candidates.find(x=>x[2]===name);
    if(!candidate) throw Error(`Cannot find obsolete test '${name}' in ${file}. No files changed.`);
    const next=candidates.find(x=>x.index>candidate.index);
    const end=next?next.index:after.length;
    after=after.slice(0,candidate.index)+newTest+'\n\n'+after.slice(end);
  }
  if(after===before)throw Error('No changes made to '+file);
  // Unique aliases avoid disturbing any existing imports or helpers.
  const imports="import assertPsp from 'node:assert/strict';\nimport { readFileSync as readPspSource } from 'node:fs';\nimport { resolve as resolvePspPath } from 'node:path';\n";
  after=imports+after;
  all.push({path:p,before,after});
}
// Back up all before changing anything, and refuse to overwrite backups.
for(const entry of all) if(fs.existsSync(entry.path+'.before-5.6.0.mjs.bak')) throw Error('Test backup already exists: '+entry.path+'. No files changed.');
for(const entry of all){fs.writeFileSync(entry.path+'.before-5.6.0.mjs.bak',entry.before);fs.writeFileSync(entry.path,entry.after);}
console.log('Updated nine obsolete UI contracts across six files. Original tests backed up beside each file.');
