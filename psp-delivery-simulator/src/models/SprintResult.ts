/** One sprint's actual delivery and actual effective effort. Null means not recorded, never zero. */
export interface SprintResult {
  completedStoryPoints: number;
  seEffectiveDays: number | null;
  qaEffectiveDays: number | null;
}

export function validEffort(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0);
}

export function validateSprintResults(rows: readonly SprintResult[]): void {
  if (rows.some(r => !r || !Number.isFinite(r.completedStoryPoints) || r.completedStoryPoints < 0 ||
    !validEffort(r.seEffectiveDays) || !validEffort(r.qaEffectiveDays))) {
    throw new Error('Sprint actuals must be finite, non-negative or Not recorded for historical effective days.');
  }
}

/** Legacy releases have only completedSprintPoints; never reinterpret missing effort as zero. */
export function getSprintResults(record: {completedSprintPoints: readonly number[]; sprintResults?: readonly SprintResult[]}): SprintResult[] {
  if (record.sprintResults) {
    validateSprintResults(record.sprintResults);
    if (record.sprintResults.length !== record.completedSprintPoints.length ||
      record.sprintResults.some((r, i) => r.completedStoryPoints !== record.completedSprintPoints[i])) {
      throw new Error('Stored sprint results are inconsistent with completed SP history.');
    }
    return record.sprintResults.map(r => ({...r}));
  }
  return record.completedSprintPoints.map(completedStoryPoints => ({
    completedStoryPoints, seEffectiveDays: null, qaEffectiveDays: null,
  }));
}

/** Explicitly entered new sprint values must include both effort figures. */
export function parseSprintResult(spText: string, seText: string, qaText: string): SprintResult {
  const parse = (s: string, label: string) => {
    if (!s.trim()) throw new Error(`${label} is required.`);
    const n = Number(s);
    if (!Number.isFinite(n) || n < 0) throw new Error(`${label} must be a finite, non-negative number.`);
    return n;
  };
  return {
    completedStoryPoints: parse(spText, 'Completed SP'),
    seEffectiveDays: parse(seText, 'Actual SE effective days'),
    qaEffectiveDays: parse(qaText, 'Actual QA effective days'),
  };
}

/** Corrections retain sprint count, can fill legacy missing effort, and never mutate originals. */
export function updateSprintResult(rows: readonly SprintResult[], index: number, row: SprintResult): SprintResult[] {
  validateSprintResults(rows);
  validateSprintResults([row]);
  if (!Number.isInteger(index) || index < 0 || index >= rows.length) throw new Error('Choose a recorded sprint.');
  const next = rows.map(r => ({...r}));
  next[index] = {...row};
  return next;
}

export function hasSprintResultChanges(saved: readonly SprintResult[], preview: readonly SprintResult[] | null): boolean {
  return preview !== null && (saved.length !== preview.length || preview.some((r,i) =>
    r.completedStoryPoints !== saved[i]?.completedStoryPoints ||
    r.seEffectiveDays !== saved[i]?.seEffectiveDays || r.qaEffectiveDays !== saved[i]?.qaEffectiveDays));
}
