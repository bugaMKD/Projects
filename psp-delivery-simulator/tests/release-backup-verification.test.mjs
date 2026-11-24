import test from 'node:test';
import assert from 'node:assert/strict';
import { createDraftRelease, establishRelease, replaceReleaseSprintResults } from '../src/models/ReleaseRecord.ts';
import { createReleaseBackup } from '../src/services/ReleaseBackup.ts';
import { verifyReleaseBackupRoundTrip } from '../src/services/ReleaseBackupVerification.ts';
import { LocalStorageReleaseRepository, RELEASES_STORAGE_KEY } from '../src/repositories/LocalStorageReleaseRepository.ts';

const now = '2026-11-19T12:00:00.000Z';
const inputs = {
  release: { releaseName: 'Release One', scopeStoryPoints: 100, variationPercent: 15 },
  historical: { deliveredStoryPoints: 100, seEffectiveDays: 100, qaEffectiveDays: 50 },
  sprintMembers: [
    { id: 'se', name: 'Dev', role: 'SE', availableDays: 10, productivity: 0.5 },
    { id: 'qa', name: 'QA', role: 'QA', availableDays: 10, productivity: 1 },
  ],
};
const forecast = {
  forecastStatus: 'forecastable',
  forecastFinishes: { optimistic: 9, realistic: 10, pessimistic: 12 },
  scenarioThroughputs: { optimistic: 11.5, realistic: 10, pessimistic: 8.5 },
  points: Array.from({ length: 13 }, (_, i) => ({
    sprintNumber: i, sprint: i ? `S${i}` : 'Start', scope: 100,
    optimistic: Math.min(100, i * 11.5), realistic: Math.min(100, i * 10), pessimistic: Math.min(100, i * 8.5),
  })),
};
class Storage {
  values = new Map(); writes = 0;
  getItem(k) { return this.values.get(k) ?? null; }
  setItem(k, v) { this.writes++; this.values.set(k, v); }
  removeItem(k) { this.values.delete(k); }
}
function fixture() {
  const storage = new Storage();
  const repository = new LocalStorageReleaseRepository(storage);
  const draft = createDraftRelease('draft', now, inputs);
  const established = establishRelease(createDraftRelease('est', now, inputs), now, { ...inputs, forecast });
  repository.saveRelease(draft);
  repository.saveRelease(replaceReleaseSprintResults(established, now, [
    { completedStoryPoints: 9, seEffectiveDays: 2.5, qaEffectiveDays: 5 },
    { completedStoryPoints: 11, seEffectiveDays: null, qaEffectiveDays: 4 },
  ]));
  return { storage, repository };
}

test('isolated restore verification counts records and preserves full established baseline', () => {
  const { storage, repository } = fixture();
  const before = storage.getItem(RELEASES_STORAGE_KEY);
  const writesBefore = storage.writes;
  const backup = JSON.parse(JSON.stringify(createReleaseBackup(repository, now)));
  assert.deepEqual(verifyReleaseBackupRoundTrip(backup), {
    valid: true, releaseCount: 2, draftCount: 1, establishedCount: 1,
    sprintActualCount: 2, legacySprintActualCount: 0, identicalAfterRoundTrip: true,
  });
  assert.equal(storage.getItem(RELEASES_STORAGE_KEY), before);
  assert.equal(storage.writes, writesBefore);
});

test('legacy records without sprintResults remain valid and unchanged', () => {
  const { repository } = fixture();
  const backup = createReleaseBackup(repository, now);
  delete backup.collection.releases.find(r => r.id === 'draft').sprintResults;
  const report = verifyReleaseBackupRoundTrip(backup);
  assert.equal(report.legacySprintActualCount, 1);
  assert.equal(report.identicalAfterRoundTrip, true);
});

test('verification rejects damaged backups instead of importing or repairing them', () => {
  const { repository } = fixture();
  const backup = createReleaseBackup(repository, now);
  const damaged = structuredClone(backup);
  damaged.collection.releases.find(r => r.id === 'est').establishedBaseline.forecast.points[1].realistic = -1;
  assert.throws(() => verifyReleaseBackupRoundTrip(damaged), /malformed/);
  const duplicate = structuredClone(backup);
  duplicate.collection.releases.push(duplicate.collection.releases[0]);
  assert.throws(() => verifyReleaseBackupRoundTrip(duplicate), /duplicate IDs/);
});

test('empty valid backup restores to an empty collection without browser access', () => {
  const { repository } = fixture();
  const backup = createReleaseBackup(repository, now);
  backup.collection.releases = [];
  const report = verifyReleaseBackupRoundTrip(backup);
  assert.equal(report.releaseCount, 0);
});
