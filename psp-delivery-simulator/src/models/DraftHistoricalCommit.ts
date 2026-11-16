import type { HistoricalData } from './HistoricalData';
import { parseDraftHistoricalFormInput } from './DraftHistoricalInput';
import type { DraftHistoricalFormInput, DraftHistoricalFormErrors } from './DraftHistoricalInput';

/** Apply historical draft data only when all fields parse successfully. */
export function commitDraftHistoricalForm(
  input: DraftHistoricalFormInput,
  previous: HistoricalData,
): { historical: HistoricalData; errors: DraftHistoricalFormErrors; applied: boolean } {
  const parsed = parseDraftHistoricalFormInput(input);
  if (parsed.historical === null) {
    return { historical: previous, errors: parsed.errors, applied: false };
  }
  return { historical: parsed.historical, errors: {}, applied: true };
}
