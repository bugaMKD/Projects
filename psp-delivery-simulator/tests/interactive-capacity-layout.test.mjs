import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const source = readFileSync(resolve(process.cwd(),'src/ReleaseWorkspace.tsx'),'utf8');

test('40/60 split for team capacity and release burn-up',()=>{
  assert.match(source,/className="psp-planning-compare"/);
  assert.match(source,/gridTemplateColumns:'minmax\(0, 2fr\) minmax\(0, 3fr\)'/);
  const a=source.indexOf('aria-label="BL future team capacity"');
  const b=source.indexOf('className="panel chart-panel psp-chart-pane"');
  assert.ok(a>=0 && b>a);
  assert.match(source,/@media \(max-width: 900px\)/);
});
test('compact table uses ADS and PROD, with pencil/remove and row apply/cancel',()=>{
  for(const x of ['Future team capacity table','ADS = Available days / sprint','PROD = Productivity (%)','maxLength={20}','title="Edit member"','title="Remove member"','title="Apply row"','title="Cancel edit"']) assert.ok(source.includes(x),x);
  assert.match(source,/commitDraftSprintCapacityForm\(capacityForm,validSprintMembers\)/);
});
test('capacity balance appears first with subtle balanced/limiting indication',()=>{
  const i=source.indexOf('aria-label="Capacity impact metrics"');
  const tail=source.slice(i,i+3500);
  const fields=['Capacity balance','SE potential throughput','QA potential throughput','Forecasted realistic velocity','Expected realistic completion'];
  let at=-1;
  for(const label of fields) {const next=tail.indexOf('title="'+label+'"');assert.ok(next>at,label);at=next;}
  assert.match(tail,/3px solid #16a34a/);
  assert.match(tail,/3px solid #d97706/);
});
test('baseline actions stay together and immutable baseline path survives',()=>{
  assert.equal((source.match(/onClick=\{saveDraft\}/g)||[]).length,1);
  assert.equal((source.match(/onClick=\{establish\}/g)||[]).length,1);
  assert.ok(source.indexOf('aria-label="Capacity impact summary"')<source.indexOf('aria-label="Baseline actions"'));
  assert.match(source,/buildEstablishedBaselineDataset\(established, completedActuals\)/);
  assert.match(source,/aria-label="Baseline status messages"/);
});
