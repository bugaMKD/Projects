import type { ReleaseRecord } from '../models/ReleaseRecord';

export type AppTab = 'management' | 'workspace';
export type WorkspaceSelection =
  | { kind: 'none' }
  | { kind: 'new' }
  | { kind: 'saved'; releaseId: string };

export interface NavigationState {
  tab: AppTab;
  selection: WorkspaceSelection;
}

export const INITIAL_NAVIGATION: NavigationState = {
  tab: 'management',
  selection: { kind: 'none' },
};

export function navigateToManagement(state: NavigationState): NavigationState {
  return { ...state, tab: 'management' };
}

export function navigateToNewRelease(): NavigationState {
  return { tab: 'workspace', selection: { kind: 'new' } };
}

export function navigateToSavedRelease(releaseId: string, records: readonly ReleaseRecord[]): NavigationState {
  if (!records.some(record => record.id === releaseId)) {
    throw new Error('Release does not exist. Refresh the list and try again.');
  }
  return { tab: 'workspace', selection: { kind: 'saved', releaseId } };
}

export function reconcileDeletedRelease(state: NavigationState, deletedId: string): NavigationState {
  if (state.selection.kind === 'saved' && state.selection.releaseId === deletedId) {
    return INITIAL_NAVIGATION;
  }
  return state;
}

export function releaseSummary(record: ReleaseRecord): {
  id: string;
  name: string;
  status: 'Draft BL' | 'Established BL';
  scope: number;
  actualStoryPoints: number;
  realisticFinishSprint: number | null;
  updatedAt: string;
} {
  return {
    id: record.id,
    name: record.draft.release.releaseName,
    status: record.baselineStatus === 'established' ? 'Established BL' : 'Draft BL',
    scope: record.draft.release.scopeStoryPoints,
    actualStoryPoints: record.completedSprintPoints.reduce((sum, n) => sum + n, 0),
    realisticFinishSprint: record.establishedBaseline?.forecast.forecastFinishes.realistic ?? null,
    updatedAt: record.updatedAt,
  };
}
