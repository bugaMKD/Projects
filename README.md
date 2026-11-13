# PSP Delivery Simulator — Iteration 3.4.2: Burn-up Chart Integration

## What to copy

Copy the single file `src/App.tsx` from this patch over `src/App.tsx` in your existing PSP project. It is based on the App.tsx you uploaded in this conversation.

**Prerequisite:** The full Iteration 3.4.1 patch must already be installed and passing (`getIntegratedMockData()` exists in `src/data/originalReleaseDataset.ts`).

No other files are replaced. No new dependencies or forecasting algorithms.

## Changes

- `getMockData()` replaced by `getIntegratedMockData()` from 3.4.1.
- Burn-up lines and forecast completion labels use calculated SE/QA-constrained throughputs and cumulative forecasts, not the Iteration 1 mock rates.
- X axis begins at `Start` (no `S0`).
- Scenario lines remain flat once scope is reached, including if actuals run beyond the pessimistic finish.
- Sprint history original-realistic and variance columns use the **same** chart dataset as the plotted line.
- Actuals remain independent; original baseline is unchanged when actuals advance.
- Display formatting rounds to at most two decimal places, without changing calculation precision.
- Null/unforecastable completion and variance values are shown as `Not forecastable` / `N/A` rather than invalid calculations.
- Y axis accommodates any recorded actual delivery beyond scope.
- Existing PSP allocation, HistoricalCapacityView, layout, and styling are preserved.

## Validate in your own project

```powershell
npm test
npm run build
npm run dev
```

Check that the graph shows `Start`, all three original lines and actuals, with calculated completion sprints matching the panel. In `src/mockData.ts`, you may temporarily add more completed sprints than the pessimistic completion sprint to confirm the forecast lines stay flat and actuals continue, then revert the mock changes.

This patch has **not** been built in the complete user project here; verify with your existing build (as with previous iterations).
