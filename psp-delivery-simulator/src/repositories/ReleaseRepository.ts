import type { ReleaseRecord } from '../models/ReleaseRecord';

/** Storage boundary: no React or browser dependencies. */
export interface ReleaseRepository {
  listReleases(): ReleaseRecord[];
  getRelease(id: string): ReleaseRecord | null;
  /** Creates or replaces a record by stable ID. Draft saves are initiated explicitly by the UI. */
  saveRelease(record: ReleaseRecord): void;
  deleteRelease(id: string): boolean;
}

/** Minimal Storage interface also implemented by browser localStorage. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
