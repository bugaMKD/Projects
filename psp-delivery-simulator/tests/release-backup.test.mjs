import test from 'node:test';
import assert from 'node:assert/strict';
import { createDraftRelease, establishRelease, replaceReleaseSprintResults } from '../src/models/ReleaseRecord.ts';
import { LocalStorageReleaseRepository, RELEASES_STORAGE_KEY } from '../src/repositories/LocalStorageReleaseRepository.ts';
import { createReleaseBackup, parseReleaseBackup, serializeReleaseBackup } from '../src/services/ReleaseBackup.ts';

const timestamp = '2026-11-19T10:30:00.000Z';
const inputs = {
  release: { releaseName: 'Release Backup Test', scopeStoryPoints: 100, variationPercent: 15 },
  historical: { deliveredStoryPoints: 100, seEffectiveDays: 100, qaEffectiveDays: 50 },
  sprintMembers: [
    { id: 'se', name: 'Engineer', role: 'SE', availableDays: 10, productivity: 0.5 },
    { id: 'qa', name: 'QA', role: 'QA', availableDays: 10, productivity: 1 },
  ],
};
const forecast = {
  forecastStatus: 'forecastable',
  forecastFinishes: { optimistic: 9, realistic: 10, pessimistic: 12 },
  scenarioThroughputs: { optimistic: 11.5, realistic: 10, pessimistic: 8.5 },
  points: Array.from({ length: 13 }, (_, i) => ({
    sprintNumber: i, sprint: i === 0 ? 'Start' : `S${i}`, scope: 100,
    optimistic: Math.min(100, i * 11.5), realistic: Math.min(100, i * 10), pessimistic: Math.min(100, i * 8.5),
  })),
};
class Storage {
  values = new Map(); writes = 0;
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.writes++; this.values.set(key, value); }
  removeItem(key) { this.values.delete(key); }
}
function setup() {
  const storage = new Storage();
  const repo = new LocalStorageReleaseRepository(storage);
  const draft = createDraftRelease('draft', timestamp, inputs);
  const established = establishRelease(createDraftRelease('established', timestamp, inputs), timestamp, {
    ...inputs, forecast,
  });
  repo.saveRelease(draft);
  repo.saveRelease(replaceReleaseSprintResults(established, timestamp, [
    { completedStoryPoints: 12, seEffectiveDays: 5, qaEffectiveDays: 7 },
    { completedStoryPoints: 15, seEffectiveDays: null, qaEffectiveDays: 8 },
  ]));
  return { storage, repo };
}

test('backup is read-only, PSP-specific, and retains every release field', () => {
  const { storage, repo } = setup();
  const before = storage.getItem(RELEASES_STORAGE_KEY);
  const writes = storage.writes;
  const backup = createReleaseBackup(repo, timestamp);
  const parsed = parseReleaseBackup(JSON.parse(serializeReleaseBackup(backup)));
  assert.deepEqual(parsed.collection.releases, repo.listReleases());
  assert.deepEqual(parsed.collection.releases.find(r => r.id === 'established').sprintResults[1],
    { completedStoryPoints: 15, seEffectiveDays: null, qaEffectiveDays: 8 });
  assert.deepEqual(parsed.collection.releases.find(r => r.id === 'established').establishedBaseline.forecast, forecast);
  assert.equal(storage.getItem(RELEASES_STORAGE_KEY), before);
  assert.equal(storage.writes, writes);
});

test('backup can be reconstructed in isolated storage without modifying the source', () => {
  const { storage, repo } = setup();
  const backup = parseReleaseBackup(JSON.parse(serializeReleaseBackup(createReleaseBackup(repo, timestamp))));
  const restored = new LocalStorageReleaseRepository(new Storage());
  for (const record of backup.collection.releases) restored.saveRelease(record);
  assert.deepEqual(restored.listReleases(), repo.listReleases());
  assert.equal(storage.writes, 2);
});

test('invalid backup format, schema, duplicate IDs and invalid baselines are rejected', () => {
  const { repo } = setup();
  const backup = createReleaseBackup(repo, timestamp);
  assert.throws(() => parseReleaseBackup({ ...backup, backupVersion: 2 }), /unsupported/);
  assert.throws(() => parseReleaseBackup({ ...backup, collection: { ...backup.collection, schemaVersion: 2 } }), /unsupported schema/);
  assert.throws(() => parseReleaseBackup({ ...backup, collection: { ...backup.collection,
    releases: [...backup.collection.releases, backup.collection.releases[0]] } }), /duplicate IDs/);
  const malformed = JSON.parse(JSON.stringify(backup));
  malformed.collection.releases.find(r => r.id === 'established').establishedBaseline.forecast.points[1].realistic = -1;
  assert.throws(() => parseReleaseBackup(malformed), /malformed/);
});

test('no repository writes occur when backup validation fails', () => {
  const { storage, repo } = setup();
  const writes = storage.writes;
  assert.throws(() => parseReleaseBackup({ format: 'nope' }));
  assert.equal(storage.writes, writes);
  assert.equal(repo.listReleases().length, 2);
});
