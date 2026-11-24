import type { ReleaseRecord } from '../models/ReleaseRecord';
import type { ReleaseRepository } from './ReleaseRepository';

/**
 * Async boundary for future database-backed persistence.
 *
 * Keep the existing synchronous ReleaseRepository intact until the UI has been
 * deliberately migrated to async operations. In particular, the adapter below
 * does not migrate or modify any stored records on construction or reads.
 */
export interface AsyncReleaseRepository {
  listReleases(): Promise<ReleaseRecord[]>;
  getRelease(id: string): Promise<ReleaseRecord | null>;
  saveRelease(record: ReleaseRecord): Promise<void>;
  deleteRelease(id: string): Promise<boolean>;
}

/**
 * Adapts the validated localStorage repository to the future async contract.
 * Errors reject the Promise; they must never be converted to success values.
 */
export function asAsyncReleaseRepository(repository: ReleaseRepository): AsyncReleaseRepository {
  return {
    async listReleases() { return repository.listReleases(); },
    async getRelease(id) { return repository.getRelease(id); },
    async saveRelease(record) { repository.saveRelease(record); },
    async deleteRelease(id) { return repository.deleteRelease(id); },
  };
}
