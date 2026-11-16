import test from 'node:test';
import assert from 'node:assert/strict';
import { createDraftRelease, establishRelease } from '../src/models/ReleaseRecord.ts';
import { duplicateReleaseToNewSession } from '../src/services/DuplicateRelease.ts';

const now = '2026-11-16T15:00:00.000Z';
const then = '2026-11-14T12:00:00.000Z';
const inputs = () => ({
  release: { releaseName: 'Release Alpha', scopeStoryPoints: 240, variationPercent: 15 },
  historical: { deliveredStoryPoints: 100, seEffectiveDays: 100, qaEffectiveDays: 50 },
  sprintMembers: [
    { id: 'se', name: 'SE 1', role: 'SE', availableDays: 10, productivity: 0.8 },
    { id: 'qa', name: 'QA 1', role: 'QA', availableDays: 5, productivity: 0.9 },
  ],
});
const draft = () => createDraftRelease('source', then, inputs(), [29, 25, 34]);
const baseline = (r) => ({
  release: { ...r.draft.release }, historical: { ...r.draft.historical },
  sprintMembers: r.draft.sprintMembers.map(m => ({ ...m })),
  forecast: {
    forecastStatus: 'forecastable', forecastFinishes: { optimistic: 15, realistic: 18, pessimistic: 21 },
    scenarioThroughputs: { optimistic: 13, realistic: 11, pessimistic: 9 },
    points: [{ sprint: 'Start', sprintNumber: 0, scope: 240, optimistic: 0, realistic: 0, pessimistic: 0 }],
  },
});

test('5.4.4 copy is a new unsaved Draft BL with separate ID and dates', () => {
  const result = duplicateReleaseToNewSession(draft(), 'new-id', now);
  assert.equal(result.saved.id, 'new-id');
  assert.equal(result.saved.createdAt, now);
  assert.equal(result.saved.updatedAt, now);
  assert.equal(result.saved.baselineStatus, 'draft');
  assert.equal(result.persisted, false);
});
test('copy includes release scope and variation with a new suggested name', () => {
  const r = duplicateReleaseToNewSession(draft(), 'copy', now);
  assert.deepEqual(r.committed.release, { releaseName: 'Release Alpha (Copy)', scopeStoryPoints: 240, variationPercent: 15 });
});
test('copy preserves historical totals and future member capacity', () => {
  const source = draft();
  const result = duplicateReleaseToNewSession(source, 'copy', now);
  assert.deepEqual(result.committed.historical, source.draft.historical);
  assert.deepEqual(result.committed.sprintMembers, source.draft.sprintMembers);
});
test('copy resets actual sprint results', () => {
  assert.deepEqual(duplicateReleaseToNewSession(draft(), 'copy', now).saved.completedSprintPoints, []);
});
test('copy of established BL becomes editable Draft BL with no snapshot', () => {
  const source = draft();
  const established = establishRelease(source, then, baseline(source));
  const copy = duplicateReleaseToNewSession(established, 'copy', now);
  assert.equal(copy.saved.baselineStatus, 'draft');
  assert.equal(copy.saved.establishedBaseline, null);
  assert.deepEqual(copy.saved.completedSprintPoints, []);
  assert.equal(copy.committed.release.scopeStoryPoints, 240);
});
test('copy never mutates the source release or its frozen baseline', () => {
  const source = draft();
  const established = establishRelease(source, then, baseline(source));
  const before = JSON.stringify(established);
  const copied = duplicateReleaseToNewSession(established, 'copy', now);
  copied.committed.release.scopeStoryPoints = 400;
  copied.committed.historical.seEffectiveDays = 20;
  copied.committed.sprintMembers[0].availableDays = 99;
  assert.equal(JSON.stringify(established), before);
});
test('saved record and editable committed input objects remain independent', () => {
  const copy = duplicateReleaseToNewSession(draft(), 'copy', now);
  copy.committed.release.scopeStoryPoints = 300;
  assert.equal(copy.saved.draft.release.scopeStoryPoints, 240);
});
test('cannot duplicate using the source release ID', () => {
  assert.throws(() => duplicateReleaseToNewSession(draft(), 'source', now), /different ID/);
});
test('rejects blank identity and invalid timestamp using model validation', () => {
  assert.throws(() => duplicateReleaseToNewSession(draft(), ' ', now), /ID/);
  assert.throws(() => duplicateReleaseToNewSession(draft(), 'new', 'invalid'), /timestamp/);
});
