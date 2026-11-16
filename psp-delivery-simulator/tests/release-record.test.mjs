import test from 'node:test';
import assert from 'node:assert/strict';
import { createDraftRelease, saveDraftRelease, establishRelease, replaceReleaseActuals, RELEASE_SCHEMA_VERSION } from '../src/models/ReleaseRecord.ts';

const t1 = '2026-11-13T17:00:00.000Z';
const t2 = '2026-11-13T18:00:00.000Z';
const inputs = () => ({
  release: { releaseName: 'Release A', scopeStoryPoints: 240, variationPercent: 15 },
  historical: { deliveredStoryPoints: 100, seEffectiveDays: 100, qaEffectiveDays: 50 },
  sprintMembers: [
    { id: 'SE1', name: 'SE 1', role: 'SE', availableDays: 10, productivity: 1 },
    { id: 'QA1', name: 'QA 1', role: 'QA', availableDays: 5, productivity: 0.8 },
  ],
});
const baselineFrom = draft => ({
  release: structuredClone(draft.release),
  historical: structuredClone(draft.historical),
  sprintMembers: structuredClone(draft.sprintMembers),
  forecast: {
    forecastStatus: 'forecastable',
    forecastFinishes: { optimistic: 22, realistic: 25, pessimistic: 30 },
    scenarioThroughputs: { optimistic: 11.5, realistic: 10, pessimistic: 8.5 },
    points: [{ sprint: 'Start', sprintNumber: 0, scope: 240, optimistic: 0, realistic: 0, pessimistic: 0 }],
  },
});

test('5.1 create release is a draft with version, stable ID and timestamps', () => {
  const r = createDraftRelease('rel-001', t1, inputs());
  assert.equal(r.id, 'rel-001');
  assert.equal(r.schemaVersion, RELEASE_SCHEMA_VERSION);
  assert.equal(r.baselineStatus, 'draft');
  assert.equal(r.establishedBaseline, null);
  assert.equal(r.createdAt, t1);
  assert.equal(r.updatedAt, t1);
});
test('two releases have independent IDs and data', () => {
  const a = createDraftRelease('A', t1, inputs());
  const b = createDraftRelease('B', t1, inputs());
  b.draft.release.scopeStoryPoints = 10;
  assert.equal(a.draft.release.scopeStoryPoints, 240);
});
test('creating a release copies incoming arrays and nested inputs', () => {
  const original = inputs();
  const r = createDraftRelease('A', t1, original, [3, 5]);
  original.release.scopeStoryPoints = 999;
  original.sprintMembers[0].availableDays = 0;
  assert.equal(r.draft.release.scopeStoryPoints, 240);
  assert.equal(r.draft.sprintMembers[0].availableDays, 10);
  assert.deepEqual(r.completedSprintPoints, [3,5]);
});
test('explicit save replaces draft inputs and updates timestamp while retaining createdAt', () => {
  const r = createDraftRelease('A', t1, inputs());
  const changes = inputs(); changes.release.scopeStoryPoints = 300;
  const saved = saveDraftRelease(r, t2, changes);
  assert.equal(saved.draft.release.scopeStoryPoints, 300);
  assert.equal(saved.updatedAt, t2);
  assert.equal(saved.createdAt, t1);
  assert.equal(r.draft.release.scopeStoryPoints, 240);
});
test('establish creates immutable-by-contract independent baseline snapshot', () => {
  const r = createDraftRelease('A', t1, inputs());
  const baseline = baselineFrom(r.draft);
  const established = establishRelease(r, t2, baseline);
  assert.equal(established.baselineStatus, 'established');
  assert.equal(Object.isFrozen(established.establishedBaseline.forecast.points[0]), true);
  assert.equal(established.establishedBaseline.forecast.forecastFinishes.realistic, 25);
  baseline.forecast.points[0].realistic = 777;
  assert.equal(established.establishedBaseline.forecast.points[0].realistic, 0);
  assert.equal(r.baselineStatus, 'draft');
});
test('establish rejects stale saved draft assumptions', () => {
  const r = createDraftRelease('A', t1, inputs());
  const baseline = baselineFrom(r.draft);
  baseline.release.scopeStoryPoints = 999;
  assert.throws(() => establishRelease(r, t2, baseline), /Save Draft first/);
});
test('actuals update without affecting established baseline forecasts or completion sprints', () => {
  const r = createDraftRelease('A', t1, inputs());
  const established = establishRelease(r, t2, baselineFrom(r.draft));
  const after = replaceReleaseActuals(established, t2, [29,25,34,28,40]);
  assert.deepEqual(after.completedSprintPoints, [29,25,34,28,40]);
  assert.deepEqual(after.establishedBaseline, established.establishedBaseline);
  assert.equal(after.establishedBaseline.forecast.forecastFinishes.realistic, 25);
});
test('actual sprint list can extend beyond the baseline forecast horizon', () => {
  const r = createDraftRelease('A', t1, inputs());
  const established = establishRelease(r, t2, baselineFrom(r.draft));
  const after = replaceReleaseActuals(established, t2, Array(50).fill(1));
  assert.equal(after.completedSprintPoints.length, 50);
});
test('negative or non-finite actuals rejected', () => {
  assert.throws(() => createDraftRelease('A', t1, inputs(), [-1]));
  const r = createDraftRelease('A', t1, inputs());
  assert.throws(() => replaceReleaseActuals(r, t2, [Infinity]));
  assert.throws(() => replaceReleaseActuals(r, t2, [NaN]));
});
test('invalid ID or timestamp rejected', () => {
  assert.throws(() => createDraftRelease(' ', t1, inputs()));
  assert.throws(() => createDraftRelease('A', 'invalid', inputs()));
});
test('records are JSON serializable, including the established snapshot', () => {
  const r = createDraftRelease('A', t1, inputs());
  const established = establishRelease(r, t2, baselineFrom(r.draft));
  assert.deepEqual(JSON.parse(JSON.stringify(established)), established);
});
