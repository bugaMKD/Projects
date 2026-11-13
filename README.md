# PSP Delivery Simulator — Iteration 3.4.1: Chart data integration

This **additive patch** prepares Recharts-compatible data using the validated services from Iterations 2, 3.1, 3.2, and 3.3. It **does not modify** the app dashboard, burn-up chart, original mockData.ts or underlying math.

## Apply

Unzip and copy these three new files into the corresponding paths of your validated 3.3 app:

- `src/services/releaseChartData.ts` — composes realistic/optimistic/pessimistic forecasts and sprint actuals.
- `src/data/originalReleaseDataset.ts` — static per-sprint mock team capacity and the adapter function `getIntegratedMockData()`.
- `tests/release-chart-data.test.mjs` — 7 new tests including overdue releases.

The new data adapter **is not yet used by `App.tsx`**. Step 3.4.2 will switch from `getMockData()` to `getIntegratedMockData()` and adapt summary display. Do **not** change the chart during Step 3.4.1.

Run:

```powershell
npm test
npm run build
```

Expected: **40 passing tests** if your previous 33 are all present; a successful build.

## Data flow

`historicalMock + originalSprintMembers (effective days per sprint) -> calculateSprintForecastScenarios -> generateCumulativeForecast -> merge with mockRelease.sprintCompletedPoints -> chartData`

`chartData` has the existing keys `sprint`, `scope`, `optimistic`, `realistic`, `pessimistic`, `actual`. `sprintNumber` is also included for robust indexing. `Start` is the label for numeric index 0.

Original capacity assumptions are static and independent of actual delivery. The new per-sprint example assumes 10 available SE effective days and 5 QA effective days, under the validated mock history (100 SP delivered from 100 SE and 50 QA effective days). This produces 10 realistic SP/sprint with ±15% scenarios. The *example* scope and actuals are read from the existing `mockRelease` object. These values are independent from Iteration 2's `currentTeamMock`, which represents a release-level capacity example.

## Important edge cases

- The chart horizon is `max(last forecast point, last completed sprint)`. If actuals extend past pessimistic completion, original lines stay at the original scope while actuals continue.
- Forecasts never change as actual sprint results change.
- Actuals only extend to the latest completed sprint; later points have `actual: null`.
- If zero capacity makes a forecast unforecastable, the result is flagged and no fictitious future forecast is generated.
- If actual completed story points exceed original scope, actuals are still shown and `remaining` is floored at zero, without rewriting the original scope.

## Scope boundary

This is **data-only integration**. UI and any changes to display labels, marks, capacity buckets, charts, and completion summaries belong to **Step 3.4.2**. No sprint-level story planning, revised forecast or per-sprint capacity input forms.

Suggested commit: `feat: merge original forecast and actuals into burn-up dataset`
