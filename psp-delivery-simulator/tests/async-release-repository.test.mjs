import test from 'node:test';
import assert from 'node:assert/strict';
import { asAsyncReleaseRepository } from '../src/repositories/AsyncReleaseRepository.ts';
import { LocalStorageReleaseRepository, RELEASES_STORAGE_KEY } from '../src/repositories/LocalStorageReleaseRepository.ts';
import { createDraftRelease, establishRelease, replaceReleaseActuals } from '../src/models/ReleaseRecord.ts';

const now = '2026-11-19T10:00:00.000Z';
const later = '2026-11-19T12:00:00.000Z';
const inputs = {
  release: { releaseName: 'Release Alpha', scopeStoryPoints: 100, variationPercent: 15 },
  historical: { deliveredStoryPoints: 100, seEffectiveDays: 100, qaEffectiveDays: 50 },
  sprintMembers: [
    { id: 'se', name: 'SE', role: 'SE', availableDays: 10, productivity: 1 },
    { id: 'qa', name: 'QA', role: 'QA', availableDays: 5, productivity: 1 },
  ],
};
const baseline = {
  ...inputs,
  forecast: {
    forecastStatus: 'forecastable',
    forecastFinishes: { optimistic: 9, realistic: 10, pessimistic: 12 },
    scenarioThroughputs: { optimistic: 11.5, realistic: 10, pessimistic: 8.5 },
    points: Array.from({length: 13}, (_, i) => ({
      sprintNumber: i, sprint: i === 0 ? 'Start' : `S${i}`, scope: 100,
      optimistic: Math.min(100, i * 11.5),
      realistic: Math.min(100, i * 10),
      pessimistic: Math.min(100, i * 8.5),
    })),
  },
};
class MemoryStorage {
  data = new Map(); writes = 0;
  getItem(key) { return this.data.get(key) ?? null; }
  setItem(key, value) { this.writes += 1; this.data.set(key, value); }
  removeItem(key) { this.data.delete(key); }
}
function setup() {
  const storage = new MemoryStorage();
  const local = new LocalStorageReleaseRepository(storage);
  return { storage, local, asyncRepo: asAsyncReleaseRepository(local) };
}

test('adapter reads localStorage without writing and preserves the existing schema', async () => {
  const {storage, asyncRepo} = setup();
  assert.deepEqual(await asyncRepo.listReleases(), []);
  assert.equal(await asyncRepo.getRelease('missing'), null);
  assert.equal(storage.writes, 0);
  assert.equal(storage.getItem(RELEASES_STORAGE_KEY), null);
});

test('adapter supports multiple releases and reports deletion correctly', async () => {
  const {asyncRepo, local} = setup();
  await asyncRepo.saveRelease(createDraftRelease('a', now, inputs));
  await asyncRepo.saveRelease(createDraftRelease('b', now, {...inputs, release: {...inputs.release, releaseName:'Release Beta'}}));
  assert.deepEqual((await asyncRepo.listReleases()).map(x=>x.id), ['a','b']);
  assert.equal((await asyncRepo.getRelease('b')).draft.release.releaseName, 'Release Beta');
  assert.equal(await asyncRepo.deleteRelease('a'), true);
  assert.equal(await asyncRepo.deleteRelease('a'), false);
  assert.equal(local.getRelease('b').id, 'b');
});

test('established baseline and corrected actuals round trip unchanged', async () => {
  const {asyncRepo, storage} = setup();
  const draft = createDraftRelease('a', now, inputs);
  const established = establishRelease(draft, later, baseline);
  const withActuals = replaceReleaseActuals(established, later, [12, 15]);
  await asyncRepo.saveRelease(withActuals);
  assert.deepEqual(await asyncRepo.getRelease('a'), withActuals);
  assert.deepEqual(JSON.parse(storage.getItem(RELEASES_STORAGE_KEY)).releases[0], withActuals);
});

test('invalid save errors reject Promise and leave previous release untouched', async () => {
  const {asyncRepo} = setup();
  const valid = createDraftRelease('a', now, inputs);
  await asyncRepo.saveRelease(valid);
  const bad = {...valid, completedSprintPoints: [-1]};
  await assert.rejects(asyncRepo.saveRelease(bad), /Invalid release record/);
  assert.deepEqual(await asyncRepo.getRelease('a'), valid);
});

test('malformed localStorage rejects reads and writes without resetting it', async () => {
  const {asyncRepo, storage} = setup();
  storage.setItem(RELEASES_STORAGE_KEY, '{bad-json');
  await assert.rejects(asyncRepo.listReleases(), /invalid JSON/);
  await assert.rejects(asyncRepo.saveRelease(createDraftRelease('a', now, inputs)), /invalid JSON/);
  assert.equal(storage.getItem(RELEASES_STORAGE_KEY), '{bad-json');
});

test('cannot replace an established baseline through async adapter', async () => {
  const {asyncRepo} = setup();
  const draft = createDraftRelease('a', now, inputs);
  const frozen = establishRelease(draft, later, baseline);
  await asyncRepo.saveRelease(frozen);
  await assert.rejects(asyncRepo.saveRelease(draft), /Cannot overwrite or unlock/);
  assert.deepEqual(await asyncRepo.getRelease('a'), frozen);
});
