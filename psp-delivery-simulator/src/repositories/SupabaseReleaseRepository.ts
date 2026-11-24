import type { SupabaseClient } from '@supabase/supabase-js';
import type { ReleaseRecord } from '../models/ReleaseRecord';
import { parseReleaseCollection } from './LocalStorageReleaseRepository';
import type { AsyncReleaseRepository } from './AsyncReleaseRepository';

/** Step 3B: opt-in remote repository. It does not read, change, or import localStorage. */
export class RemoteReleaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RemoteReleaseError';
  }
}
export class ReleaseConflictError extends RemoteReleaseError {
  constructor(message = 'Release changed remotely (or was deleted). Reload before saving.') {
    super(message);
    this.name = 'ReleaseConflictError';
  }
}

type Versioned = { revision: number; record: ReleaseRecord };
type ReleaseRow = { id: string; owner_id: string; payload: unknown; revision: number };

function validatedRecord(payload: unknown, expectedId: string): ReleaseRecord {
  // Reuse the existing PSP record validator (including established baseline consistency).
  const collection = parseReleaseCollection({ schemaVersion: 1, releases: [payload] });
  const record = collection.releases[0];
  if (record.id !== expectedId) throw new RemoteReleaseError('Database release ID differs from its payload.');
  return structuredClone(record);
}

function versionedRow(row: ReleaseRow, owner: string): Versioned {
  if (row.owner_id !== owner) throw new RemoteReleaseError('Database returned a release belonging to another user.');
  if (!Number.isSafeInteger(row.revision) || row.revision < 1) {
    throw new RemoteReleaseError('Invalid release revision returned from database.');
  }
  return { revision: row.revision, record: validatedRecord(row.payload, row.id) };
}

/**
 * Requires an authenticated Supabase session. Existing records must first be
 * listed/read to obtain a revision. Compare-and-swap updates/deletes reject
 * stale revisions instead of silently overwriting someone else's edits.
 *
 * Create an instance per authenticated workspace; never share it across users.
 */
export class SupabaseReleaseRepository implements AsyncReleaseRepository {
  private readonly known = new Map<string, Versioned>();
  private activeOwner: string | null = null;

  constructor(private readonly client: SupabaseClient) {}

  private async ownerId(): Promise<string> {
    const { data, error } = await this.client.auth.getUser();
    // A transient network/auth-server error does not prove the user signed out.
    // Preserve cached revisions so an offline save cannot turn a later retry
    // into an INSERT for a release that already exists remotely.
    if (error) {
      throw new RemoteReleaseError(`Cannot verify Supabase session: ${error.message}`);
    }
    if (!data.user) {
      this.known.clear();
      this.activeOwner = null;
      throw new RemoteReleaseError('Sign in to access your Supabase releases.');
    }
    if (this.activeOwner !== data.user.id) {
      this.known.clear();
      this.activeOwner = data.user.id;
    }
    return data.user.id;
  }

  async listReleases(): Promise<ReleaseRecord[]> {
    const owner = await this.ownerId();
    const { data, error } = await this.client.from('psp_releases')
      .select('id, owner_id, payload, revision').eq('owner_id', owner);
    if (error) throw new RemoteReleaseError(`Cannot list Supabase releases: ${error.message}`);
    // Validate the entire response before replacing our revision snapshot.
    const loaded = (data ?? []).map(row => versionedRow(row as ReleaseRow, owner));
    const next = new Map<string, Versioned>();
    for (const item of loaded) {
      if (next.has(item.record.id)) throw new RemoteReleaseError('Duplicate release IDs returned by database.');
      next.set(item.record.id, item);
    }
    this.known.clear();
    for (const [id, value] of next) this.known.set(id, value);
    return loaded.map(item => structuredClone(item.record)).sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id));
  }

  async getRelease(id: string): Promise<ReleaseRecord | null> {
    const owner = await this.ownerId();
    const { data, error } = await this.client.from('psp_releases')
      .select('id, owner_id, payload, revision').eq('owner_id', owner).eq('id', id).maybeSingle();
    if (error) throw new RemoteReleaseError(`Cannot read Supabase release: ${error.message}`);
    if (!data) { this.known.delete(id); return null; }
    const found = versionedRow(data as ReleaseRow, owner);
    this.known.set(id, found);
    return structuredClone(found.record);
  }

  async saveRelease(record: ReleaseRecord): Promise<void> {
    const owner = await this.ownerId();
    const candidate = validatedRecord(record, record.id);
    const previous = this.known.get(candidate.id);
    if (!previous) {
      // INSERT only; a duplicate ID is a conflict, never an implicit overwrite.
      const { data, error } = await this.client.from('psp_releases')
        .insert({ id: candidate.id, owner_id: owner, payload: candidate })
        .select('id, owner_id, payload, revision').single();
      if (error) {
        if (error.code === '23505') throw new ReleaseConflictError('Release ID already exists remotely. Load releases before updating it.');
        throw new RemoteReleaseError(`Cannot create Supabase release: ${error.message}`);
      }
      if (!data) throw new RemoteReleaseError('Database did not confirm release creation. Reload to verify.');
      this.known.set(candidate.id, versionedRow(data as ReleaseRow, owner));
      return;
    }
    if (candidate.createdAt !== previous.record.createdAt) {
      throw new RemoteReleaseError('Release creation metadata cannot change.');
    }
    if (previous.record.baselineStatus === 'established' && (
      candidate.baselineStatus !== 'established' ||
      JSON.stringify(candidate.draft) !== JSON.stringify(previous.record.draft) ||
      JSON.stringify(candidate.establishedBaseline) !== JSON.stringify(previous.record.establishedBaseline)
    )) throw new RemoteReleaseError('Cannot modify or unlock an established baseline.');

    const { data, error } = await this.client.from('psp_releases')
      .update({ payload: candidate })
      .eq('owner_id', owner).eq('id', candidate.id).eq('revision', previous.revision)
      .select('id, owner_id, payload, revision').maybeSingle();
    if (error) throw new RemoteReleaseError(`Cannot update Supabase release: ${error.message}`);
    if (!data) throw new ReleaseConflictError();
    this.known.set(candidate.id, versionedRow(data as ReleaseRow, owner));
  }

  async deleteRelease(id: string): Promise<boolean> {
    const owner = await this.ownerId();
    let previous = this.known.get(id);
    if (!previous) {
      // Do not delete unknown releases: load the current revision first.
      const existing = await this.getRelease(id);
      if (!existing) return false;
      previous = this.known.get(id);
    }
    if (!previous) throw new RemoteReleaseError('Cannot determine release revision.');
    const { data, error } = await this.client.from('psp_releases')
      .delete().eq('owner_id', owner).eq('id', id).eq('revision', previous.revision)
      .select('id');
    if (error) throw new RemoteReleaseError(`Cannot delete Supabase release: ${error.message}`);
    if (!data || data.length === 0) throw new ReleaseConflictError('Release was modified or deleted remotely. Reload before deleting.');
    this.known.delete(id);
    return true;
  }
}
