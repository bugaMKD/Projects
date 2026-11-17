import { RELEASE_SCHEMA_VERSION, type ReleaseCollectionV1, type ReleaseRecord } from '../models/ReleaseRecord';
import { validEffort } from '../models/SprintResult';
import type { KeyValueStorage, ReleaseRepository } from './ReleaseRepository';

export const RELEASES_STORAGE_KEY = 'psp-delivery-simulator:releases:v1';

/** Invalid/unsupported storage is NEVER overwritten automatically. */
export class ReleaseStorageError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'ReleaseStorageError';
    if (options?.cause !== undefined) {
      Object.defineProperty(this, 'cause', {
        value: options.cause,
        enumerable: false,
        configurable: true,
        writable: true,
      });
    }
  }
}

const object = (x: unknown): x is Record<string, unknown> =>
  x !== null && typeof x === 'object' && !Array.isArray(x);
const str = (x: unknown): x is string => typeof x === 'string';
const nonEmpty = (x: unknown): x is string => str(x) && x.trim().length > 0;
const number = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const nonnegative = (x: unknown): x is number => number(x) && x >= 0;
const positive = (x: unknown): x is number => number(x) && x > 0;
const date = (x: unknown): x is string => str(x) && Number.isFinite(Date.parse(x));
const arrayOf = <T>(x: unknown, test: (v: unknown) => v is T): x is T[] =>
  Array.isArray(x) && x.every(test);

function validateInputs(x: unknown): boolean {
  if (!object(x) || !object(x.release) || !object(x.historical) || !Array.isArray(x.sprintMembers)) return false;
  const r = x.release, h = x.historical;
  return nonEmpty(r.releaseName) && nonnegative(r.scopeStoryPoints) &&
    nonnegative(r.variationPercent) && r.variationPercent <= 100 &&
    positive(h.deliveredStoryPoints) && positive(h.seEffectiveDays) && positive(h.qaEffectiveDays) &&
    x.sprintMembers.length > 0 && x.sprintMembers.every(m => object(m) &&
      nonEmpty(m.id) && nonEmpty(m.name) && (m.role === 'SE' || m.role === 'QA') &&
      nonnegative(m.availableDays) && number(m.productivity) && m.productivity >= 0 && m.productivity <= 1) &&
    new Set(x.sprintMembers.map(m => (m as Record<string, unknown>).id)).size === x.sprintMembers.length;
}

function validateBaseline(x: unknown): boolean {
  if (!object(x) || !object(x.forecast) || !validateInputs({
    release: x.release, historical: x.historical, sprintMembers: x.sprintMembers,
  })) return false;
  const forecast = x.forecast;
  if (forecast.forecastStatus !== 'forecastable' && forecast.forecastStatus !== 'not-forecastable') return false;
  const finishes = forecast.forecastFinishes;
  const rates = forecast.scenarioThroughputs;
  if (!object(finishes) || !object(rates) || !Array.isArray(forecast.points) || forecast.points.length < 1) return false;
  for (const scenario of ['optimistic', 'realistic', 'pessimistic']) {
    if (finishes[scenario] !== null && (!Number.isInteger(finishes[scenario]) || (finishes[scenario] as number) < 0)) return false;
    if (!nonnegative(rates[scenario])) return false;
  }
  const scope = (x.release as Record<string, unknown>).scopeStoryPoints;
  return forecast.points.every((p, i) => object(p) && p.sprintNumber === i &&
    p.sprint === (i === 0 ? 'Start' : `S${i}`) && p.scope === scope &&
    ['optimistic', 'realistic', 'pessimistic'].every(k => p[k] === null || nonnegative(p[k])));
}

function sameInputs(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  // Structural values are canonical for a snapshot; object identity is irrelevant.
  return JSON.stringify(a.release) === JSON.stringify(b.release) &&
    JSON.stringify(a.historical) === JSON.stringify(b.historical) &&
    JSON.stringify(a.sprintMembers) === JSON.stringify(b.sprintMembers);
}

function validRelease(x: unknown): x is ReleaseRecord {
  if (!object(x) || x.schemaVersion !== RELEASE_SCHEMA_VERSION || !nonEmpty(x.id) ||
      !date(x.createdAt) || !date(x.updatedAt) ||
      !arrayOf(x.completedSprintPoints, nonnegative) || !validateInputs(x.draft)) return false;
  // v1 records with no sprintResults remain readable; first actuals save adds the richer structure.
  if (x.sprintResults !== undefined && (!Array.isArray(x.sprintResults) ||
    x.sprintResults.length !== x.completedSprintPoints.length ||
    !x.sprintResults.every((r, i) => object(r) && nonnegative(r.completedStoryPoints) &&
      r.completedStoryPoints === (x.completedSprintPoints as number[])[i] &&
      validEffort(r.seEffectiveDays) && validEffort(r.qaEffectiveDays)))) return false;
  if (x.baselineStatus === 'draft') return x.establishedBaseline === null;
  if (x.baselineStatus !== 'established' || !validateBaseline(x.establishedBaseline)) return false;
  return sameInputs(x.draft as Record<string, unknown>, x.establishedBaseline as Record<string, unknown>);
}

export function parseReleaseCollection(value: unknown): ReleaseCollectionV1 {
  if (!object(value) || value.schemaVersion !== RELEASE_SCHEMA_VERSION ||
      !arrayOf(value.releases, validRelease)) {
    throw new ReleaseStorageError('Saved releases are malformed or use an unsupported schema version. Storage was not modified.');
  }
  const releases = value.releases;
  if (new Set(releases.map(r => r.id)).size !== releases.length) {
    throw new ReleaseStorageError('Saved releases contain duplicate IDs. Storage was not modified.');
  }
  return { schemaVersion: RELEASE_SCHEMA_VERSION, releases };
}

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }

/**
 * One versioned JSON collection, one atomic storage setItem per mutation.
 * Deletion does not clear unrelated browser storage. No implicit migration/reset.
 */
export class LocalStorageReleaseRepository implements ReleaseRepository {
  private readonly storage: KeyValueStorage;
  private readonly storageKey: string;

  constructor(storage: KeyValueStorage, storageKey: string = RELEASES_STORAGE_KEY) {
    this.storage = storage;
    this.storageKey = storageKey;
  }

  private load(): ReleaseCollectionV1 {
    let raw: string | null;
    try { raw = this.storage.getItem(this.storageKey); }
    catch (error) { throw new ReleaseStorageError('Cannot read browser release storage.', { cause: error }); }
    if (raw === null) return { schemaVersion: RELEASE_SCHEMA_VERSION, releases: [] };
    let decoded: unknown;
    try { decoded = JSON.parse(raw); }
    catch (error) { throw new ReleaseStorageError('Saved releases contain invalid JSON. Storage was not modified.', { cause: error }); }
    return parseReleaseCollection(decoded);
  }

  private persist(value: ReleaseCollectionV1): void {
    try { this.storage.setItem(this.storageKey, JSON.stringify(value)); }
    catch (error) { throw new ReleaseStorageError('Cannot save releases (storage blocked or full).', { cause: error }); }
  }

  listReleases(): ReleaseRecord[] {
    return clone(this.load().releases).sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id));
  }

  getRelease(id: string): ReleaseRecord | null {
    const found = this.load().releases.find(release => release.id === id);
    return found ? clone(found) : null;
  }

  saveRelease(record: ReleaseRecord): void {
    // Validate before writing; never persist a broken or unsupported release record.
    const candidate = clone(record);
    if (!validRelease(candidate)) {
      throw new ReleaseStorageError('Invalid release record; nothing was saved.');
    }
    const collection = this.load();
    const index = collection.releases.findIndex(item => item.id === candidate.id);
    if (index === -1) collection.releases.push(candidate);
    else {
      const existing = collection.releases[index];
      if (candidate.createdAt !== existing.createdAt) {
        throw new ReleaseStorageError('Cannot replace a release with different creation metadata.');
      }
      if (existing.baselineStatus === 'established' &&
          (candidate.baselineStatus !== 'established' ||
           JSON.stringify(candidate.establishedBaseline) !== JSON.stringify(existing.establishedBaseline) ||
           JSON.stringify(candidate.draft) !== JSON.stringify(existing.draft))) {
        throw new ReleaseStorageError('Cannot overwrite or unlock an established baseline.');
      }
      collection.releases[index] = candidate;
    }
    this.persist(collection);
  }

  deleteRelease(id: string): boolean {
    const collection = this.load();
    const survivors = collection.releases.filter(record => record.id !== id);
    if (survivors.length === collection.releases.length) return false;
    this.persist({ schemaVersion: RELEASE_SCHEMA_VERSION, releases: survivors });
    return true;
  }
}

/** Call from UI only; do not read window.localStorage at module import time. */
export function createBrowserReleaseRepository(): ReleaseRepository {
  if (typeof window === 'undefined') throw new ReleaseStorageError('Browser storage is unavailable.');
  try { return new LocalStorageReleaseRepository(window.localStorage); }
  catch (error) { throw new ReleaseStorageError('Browser storage is unavailable.', { cause: error }); }
}
