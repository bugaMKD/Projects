import type { ReleaseRecord } from '../models/ReleaseRecord';
import { LocalStorageReleaseRepository } from '../repositories/LocalStorageReleaseRepository';
import type { KeyValueStorage } from '../repositories/ReleaseRepository';
import { parseReleaseBackup } from './ReleaseBackup';

/** In-memory storage used exclusively to verify a prospective restore. */
class TemporaryStorage implements KeyValueStorage {
  private readonly data = new Map<string, string>();
  getItem(key: string): string | null { return this.data.get(key) ?? null; }
  setItem(key: string, value: string): void { this.data.set(key, value); }
  removeItem(key: string): void { this.data.delete(key); }
}

export interface BackupVerificationReport {
  valid: true;
  releaseCount: number;
  draftCount: number;
  establishedCount: number;
  sprintActualCount: number;
  legacySprintActualCount: number;
  /** All records successfully reconstructed and compared by their complete JSON values. */
  identicalAfterRoundTrip: true;
}

const byId = (a: ReleaseRecord, b: ReleaseRecord): number => a.id.localeCompare(b.id);

/**
 * Validates a backup and tests complete restoration using *temporary memory only*.
 * This does not read or write browser localStorage, and it performs no real import.
 */
export function verifyReleaseBackupRoundTrip(input: unknown): BackupVerificationReport {
  const backup = parseReleaseBackup(input);
  const original = backup.collection.releases;
  const isolatedRepository = new LocalStorageReleaseRepository(new TemporaryStorage());
  for (const record of original) isolatedRepository.saveRelease(record);

  const reconstructed = isolatedRepository.listReleases();
  const originalCanonical = JSON.stringify([...original].sort(byId));
  const reconstructedCanonical = JSON.stringify([...reconstructed].sort(byId));
  if (originalCanonical !== reconstructedCanonical) {
    throw new Error('Backup round-trip verification failed: reconstructed releases differ from backup.');
  }

  return {
    valid: true,
    releaseCount: original.length,
    draftCount: original.filter(record => record.baselineStatus === 'draft').length,
    establishedCount: original.filter(record => record.baselineStatus === 'established').length,
    sprintActualCount: original.reduce((total, record) => total + record.completedSprintPoints.length, 0),
    legacySprintActualCount: original.filter(record => record.sprintResults === undefined).length,
    identicalAfterRoundTrip: true,
  };
}
