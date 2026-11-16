import type { DraftBaselineConfig } from './DraftBaselineConfig';
import type { HistoricalData } from './HistoricalData';
import type { TeamMember } from './TeamMember';
import type { EstablishedBaseline } from './EstablishedBaseline';

/** Version for the serialized release record, not the forecasting algorithm. */
export const RELEASE_SCHEMA_VERSION = 1 as const;

export interface ReleaseInputs {
  release: DraftBaselineConfig;
  historical: HistoricalData;
  /** Planned person-days PER FUTURE SPRINT; productivity is a 0..1 fraction. */
  sprintMembers: TeamMember[];
}

export interface ReleaseMetadata {
  id: string;
  schemaVersion: typeof RELEASE_SCHEMA_VERSION;
  createdAt: string; // ISO-8601 UTC, supplied by caller
  updatedAt: string; // ISO-8601 UTC, supplied by caller
  /** Per-sprint incremental completed story points, NOT cumulative. */
  completedSprintPoints: number[];
}

export interface DraftReleaseRecord extends ReleaseMetadata {
  baselineStatus: 'draft';
  draft: ReleaseInputs;
  establishedBaseline: null;
}

export interface EstablishedReleaseRecord extends ReleaseMetadata {
  baselineStatus: 'established';
  /** The most recently committed inputs at the moment of establishment. */
  draft: ReleaseInputs;
  /** Frozen forecast snapshot from Iteration 4.3.4a; never recalculate on load. */
  establishedBaseline: EstablishedBaseline;
}

export type ReleaseRecord = DraftReleaseRecord | EstablishedReleaseRecord;

/** This release-record collection is the intended storage payload for Iteration 5.2. */
export interface ReleaseCollectionV1 {
  schemaVersion: typeof RELEASE_SCHEMA_VERSION;
  releases: ReleaseRecord[];
}

function freezeSnapshot<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeSnapshot(child);
    Object.freeze(value);
  }
  return value;
}

function equalInputs(a: ReleaseInputs, b: EstablishedBaseline): boolean {
  return a.release.releaseName === b.release.releaseName &&
    a.release.scopeStoryPoints === b.release.scopeStoryPoints &&
    a.release.variationPercent === b.release.variationPercent &&
    a.historical.deliveredStoryPoints === b.historical.deliveredStoryPoints &&
    a.historical.seEffectiveDays === b.historical.seEffectiveDays &&
    a.historical.qaEffectiveDays === b.historical.qaEffectiveDays &&
    a.sprintMembers.length === b.sprintMembers.length &&
    a.sprintMembers.every((m, i) => {
      const n = b.sprintMembers[i];
      return m.id === n.id && m.name === n.name && m.role === n.role &&
        m.availableDays === n.availableDays && m.productivity === n.productivity;
    });
}

function cloneInputs(inputs: ReleaseInputs): ReleaseInputs {
  return {
    release: { ...inputs.release },
    historical: { ...inputs.historical },
    sprintMembers: inputs.sprintMembers.map(member => ({ ...member })),
  };
}

function validateMetadata(id: string, now: string): void {
  if (!id.trim()) throw new Error('Release ID must not be empty.');
  if (!Number.isFinite(Date.parse(now))) throw new Error('Invalid release timestamp.');
}

function validateActuals(completed: readonly number[]): void {
  if (completed.some(value => !Number.isFinite(value) || value < 0)) {
    throw new Error('Actual story points must be finite and non-negative.');
  }
}

/** Caller provides a stable unique ID and timestamp; this model has no browser dependency. */
export function createDraftRelease(
  id: string,
  now: string,
  inputs: ReleaseInputs,
  completedSprintPoints: readonly number[] = [],
): DraftReleaseRecord {
  validateMetadata(id, now);
  validateActuals(completedSprintPoints);
  return {
    id,
    schemaVersion: RELEASE_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    completedSprintPoints: [...completedSprintPoints],
    baselineStatus: 'draft',
    draft: cloneInputs(inputs),
    establishedBaseline: null,
  };
}

/** Only an explicit Save Draft action should call this; no automatic on-change writes. */
export function saveDraftRelease(
  record: DraftReleaseRecord,
  now: string,
  committedInputs: ReleaseInputs,
): DraftReleaseRecord {
  validateMetadata(record.id, now);
  return {
    ...record,
    updatedAt: now,
    draft: cloneInputs(committedInputs),
    completedSprintPoints: [...record.completedSprintPoints],
    establishedBaseline: null,
  };
}

/**
 * The caller establishes the snapshot using Iteration 4.3.4a `establishBaseline`.
 * We copy the snapshot to protect against references being mutated elsewhere.
 * Persistence of this returned record happens automatically at the UI action in 5.4.
 */
export function establishRelease(
  record: DraftReleaseRecord,
  now: string,
  baseline: EstablishedBaseline,
): EstablishedReleaseRecord {
  validateMetadata(record.id, now);
  if (!equalInputs(record.draft, baseline)) {
    throw new Error('Cannot establish BL: snapshot inputs differ from the saved draft. Save Draft first.');
  }
  if (!baseline.forecast.points.length) throw new Error('Cannot establish an empty forecast.');
  return {
    ...record,
    updatedAt: now,
    completedSprintPoints: [...record.completedSprintPoints],
    baselineStatus: 'established',
    draft: cloneInputs(record.draft),
    establishedBaseline: freezeSnapshot(structuredClone(baseline)),
  };
}

/** Actual delivery is independent of both Draft and Established BL. */
export function replaceReleaseActuals(
  record: ReleaseRecord,
  now: string,
  completedSprintPoints: readonly number[],
): ReleaseRecord {
  validateMetadata(record.id, now);
  validateActuals(completedSprintPoints);
  return {
    ...record,
    updatedAt: now,
    completedSprintPoints: [...completedSprintPoints],
  };
}
