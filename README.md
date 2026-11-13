# PSP Delivery Simulator — Iteration 4.1.2: Draft BL → Forecast Adapter

## Prerequisite

Your validated 4.1.1 project (47 passing tests). Keep `src/models/DraftBaselineConfig.ts` and all services and tests from previous iterations.

## Apply

Copy the `src` and `tests` folders from this ZIP into your project, preserving paths.

- **NEW** `src/services/draftBaselineDataset.ts`: validates draft inputs, then forwards the scope, variation, historical data, team capacity, and actuals to the **existing** 3.4 chart-data engine. No changes to the forecast math.
- **REPLACE** `src/data/originalReleaseDataset.ts`: adds `getInitialDraftBaselineConfig()`; makes `getIntegratedMockData(draft?)` accept an optional draft. The no-argument call in your current `App.tsx` remains supported and produces the same results as before.
- **NEW** `tests/draft-baseline-dataset.test.mjs`: 7 regression tests.

No edits to `App.tsx`, `mockData.ts`, chart styling, existing service algorithms, or historical capacity UI. The interactive UI is explicitly reserved for **4.1.3**.

## Expected results

- 4.1.1's original 47 tests + 7 new tests = **54 tests**.
- `npm run build` successful.
- No visible UI change yet.

Validation commands:

```powershell
npm test
npm run build
```

## For future 4.1.3

```ts
const initialDraft = getInitialDraftBaselineConfig();
const result = getIntegratedMockData(initialDraft);
```

When draft state changes, invoke `getIntegratedMockData(updatedDraft)` after validation. Avoid calling it with invalid temporary text edits. Naming in the UI should use **BL Optimistic**, **BL Realistic**, **BL Pessimistic**. This step neither creates nor preserves an *established* baseline; that is for 4.3.
