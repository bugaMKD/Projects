import type { ReleaseRecord } from '../models/ReleaseRecord';
import { newWorkspaceSession, type WorkspaceSession } from './ReleaseWorkspaceOperations';

/**
 * Create an UNSAVED new Draft BL from another release's planning assumptions.
 * Works equally for source Draft and Established BL releases; never inherits the
 * established snapshot, actual sprint history, source ID or timestamps.
 * This function performs no repository writes and no forecasting calculations.
 */
export function duplicateReleaseToNewSession(
  source: ReleaseRecord,
  newId: string,
  now: string,
): WorkspaceSession {
  const inputs = {
    release: {
      ...source.draft.release,
      releaseName: `${source.draft.release.releaseName} (Copy)`,
    },
    historical: { ...source.draft.historical },
    sprintMembers: source.draft.sprintMembers.map(member => ({ ...member })),
  };
  if (newId === source.id) throw new Error('Duplicate release needs a different ID.');
  return newWorkspaceSession(newId, now, inputs);
}
