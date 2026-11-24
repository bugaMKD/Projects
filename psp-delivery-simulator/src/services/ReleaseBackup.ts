import { RELEASE_SCHEMA_VERSION, type ReleaseCollectionV1 } from '../models/ReleaseRecord';
import { parseReleaseCollection } from '../repositories/LocalStorageReleaseRepository';
import type { ReleaseRepository } from '../repositories/ReleaseRepository';

export const PSP_BACKUP_FORMAT = 'psp-delivery-simulator-release-backup' as const;
export const PSP_BACKUP_VERSION = 1 as const;

/** Portable, PSP-only backup. No browser storage keys or unrelated origin data. */
export interface PSPReleaseBackup {
  format: typeof PSP_BACKUP_FORMAT;
  backupVersion: typeof PSP_BACKUP_VERSION;
  exportedAt: string;
  collection: ReleaseCollectionV1;
}

/** Read-only: does not write to, delete from, or migrate the source repository. */
export function createReleaseBackup(repository: ReleaseRepository, exportedAt: string): PSPReleaseBackup {
  if (!Number.isFinite(Date.parse(exportedAt))) throw new Error('Invalid backup timestamp.');
  const collection = parseReleaseCollection({
    schemaVersion: RELEASE_SCHEMA_VERSION,
    releases: repository.listReleases(),
  });
  // JSON round-trip ensures the backup contains independent, serializable values.
  return JSON.parse(JSON.stringify({
    format: PSP_BACKUP_FORMAT,
    backupVersion: PSP_BACKUP_VERSION,
    exportedAt,
    collection,
  })) as PSPReleaseBackup;
}

/** Validate a future import without changing current storage. No restore is performed. */
export function parseReleaseBackup(input: unknown): PSPReleaseBackup {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Invalid PSP backup file.');
  }
  const value = input as Record<string, unknown>;
  if (value.format !== PSP_BACKUP_FORMAT || value.backupVersion !== PSP_BACKUP_VERSION ||
      typeof value.exportedAt !== 'string' || !Number.isFinite(Date.parse(value.exportedAt))) {
    throw new Error('Unrecognized or unsupported PSP backup format.');
  }
  const collection = parseReleaseCollection(value.collection);
  return {
    format: PSP_BACKUP_FORMAT,
    backupVersion: PSP_BACKUP_VERSION,
    exportedAt: value.exportedAt,
    collection: JSON.parse(JSON.stringify(collection)) as ReleaseCollectionV1,
  };
}

export function serializeReleaseBackup(backup: PSPReleaseBackup): string {
  return JSON.stringify(parseReleaseBackup(backup), null, 2);
}
