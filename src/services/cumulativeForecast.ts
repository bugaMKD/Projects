/**
 * Step 3.3 — release-level cumulative forecasts.
 *
 * This service is deliberately UI-independent. The input is structurally
 * compatible with SprintForecastScenarios from `forecastScenarios.ts` (3.2).
 * Actual delivery and any chart presentation belong to a later step.
 */
export interface ForecastThroughput {
  optimisticStoryPointsPerSprint: number;
  realisticStoryPointsPerSprint: number;
  pessimisticStoryPointsPerSprint: number;
}

export interface CumulativeForecastPoint {
  sprintNumber: number;
  /** A display-only label: Start, S1, S2, ... (never S0). */
  sprint: string;
  scope: number;
  optimistic: number;
  realistic: number;
  pessimistic: number;
}

export interface ForecastCompletionSprints {
  optimistic: number | null;
  realistic: number | null;
  pessimistic: number | null;
}

export interface CumulativeForecast {
  status: 'forecastable' | 'not-forecastable';
  scopeStoryPoints: number;
  completionSprints: ForecastCompletionSprints;
  points: CumulativeForecastPoint[];
}

/**
 * Optional starting point, included to support a future updated forecast.
 * For original forecasts the defaults are sprint 0 and 0 SP.
 */
export interface ForecastStart {
  startSprint?: number;
  startingCompletedStoryPoints?: number;
}

const MAX_GENERATED_SPRINTS = 10000;

/**
 * Build three cumulative ORIGINAL forecast lines, capped at release scope.
 * - All original lines begin at `Start` = zero delivered SP.
 * - Throughput and cumulative calculations retain full precision.
 * - Completed lines remain flat at the release scope.
 * - The timeline ends when the slowest scenario completes.
 * - If positive scope remains and any throughput is zero, return a
 *   not-forecastable result rather than inventing an ending sprint.
 * - No sprint-level story planning, capacity buckets, or actuals here.
 */
export function generateCumulativeForecast(
  scopeStoryPoints: number,
  throughput: ForecastThroughput,
  start: ForecastStart = {},
): CumulativeForecast {
  const startSprint = start.startSprint ?? 0;
  const startingCompletedStoryPoints = start.startingCompletedStoryPoints ?? 0;

  if (!Number.isFinite(scopeStoryPoints) || scopeStoryPoints < 0) {
    throw new Error('Release scope must be a finite, non-negative number.');
  }
  if (!Number.isSafeInteger(startSprint) || startSprint < 0) {
    throw new Error('Starting sprint must be a non-negative integer.');
  }
  if (!Number.isFinite(startingCompletedStoryPoints) ||
      startingCompletedStoryPoints < 0 ||
      startingCompletedStoryPoints > scopeStoryPoints) {
    throw new Error('Starting completed story points must be between 0 and release scope.');
  }

  const rates = [
    throughput.optimisticStoryPointsPerSprint,
    throughput.realisticStoryPointsPerSprint,
    throughput.pessimisticStoryPointsPerSprint,
  ];
  if (rates.some(rate => !Number.isFinite(rate) || rate < 0)) {
    throw new Error('All scenario throughputs must be finite, non-negative numbers.');
  }

  const remaining = scopeStoryPoints - startingCompletedStoryPoints;
  const initial: CumulativeForecastPoint = {
    sprintNumber: startSprint,
    sprint: startSprint === 0 ? 'Start' : `S${startSprint}`,
    scope: scopeStoryPoints,
    optimistic: startingCompletedStoryPoints,
    realistic: startingCompletedStoryPoints,
    pessimistic: startingCompletedStoryPoints,
  };

  if (remaining === 0) {
    return {
      status: 'forecastable', scopeStoryPoints,
      completionSprints: {
        optimistic: startSprint, realistic: startSprint, pessimistic: startSprint,
      },
      points: [initial],
    };
  }

  if (rates.some(rate => rate === 0)) {
    return {
      status: 'not-forecastable', scopeStoryPoints,
      completionSprints: {
        optimistic: rates[0] === 0 ? null : startSprint + Math.ceil(remaining / rates[0]),
        realistic: rates[1] === 0 ? null : startSprint + Math.ceil(remaining / rates[1]),
        pessimistic: rates[2] === 0 ? null : startSprint + Math.ceil(remaining / rates[2]),
      },
      points: [initial],
    };
  }

  const finish = rates.map(rate => startSprint + Math.ceil(remaining / rate));
  const lastSprint = Math.max(...finish);
  if (!Number.isSafeInteger(lastSprint) || lastSprint - startSprint > MAX_GENERATED_SPRINTS) {
    throw new Error('Forecast is too long to generate safely; review sprint throughput.');
  }

  const points: CumulativeForecastPoint[] = [];
  for (let sprintNumber = startSprint; sprintNumber <= lastSprint; sprintNumber++) {
    const elapsed = sprintNumber - startSprint;
    points.push({
      sprintNumber,
      sprint: sprintNumber === 0 ? 'Start' : `S${sprintNumber}`,
      scope: scopeStoryPoints,
      optimistic: Math.min(scopeStoryPoints, startingCompletedStoryPoints + elapsed * rates[0]),
      realistic: Math.min(scopeStoryPoints, startingCompletedStoryPoints + elapsed * rates[1]),
      pessimistic: Math.min(scopeStoryPoints, startingCompletedStoryPoints + elapsed * rates[2]),
    });
  }

  return {
    status: 'forecastable', scopeStoryPoints,
    completionSprints: {
      optimistic: finish[0], realistic: finish[1], pessimistic: finish[2],
    },
    points,
  };
}
