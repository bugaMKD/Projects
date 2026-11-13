# PSP Delivery Simulator — Step 3.3 (drop-in patch)

**This is an additive patch, not a replacement application.** It depends only on TypeScript/Node and does **not** modify Iterations 1, 2, 3.1, 3.2, or the existing UI.

## Apply

Extract the ZIP, then copy these two new files into the matching folders of your existing working PSP project:

- `src/services/cumulativeForecast.ts`
- `tests/cumulative-forecast.test.mjs`

Run in your project folder:

```powershell
npm test
npm run build
```

If you had 23 passing tests from Step 3.2, there should now be **33 tests** (10 new). No new npm dependencies.

## Calculation

Input: release scope (SP) plus the three sprint throughputs returned by `calculateSprintForecastScenarios()` from Step 3.2. Throughput is per sprint, based on effective SE/QA capacity and historical delivered SP.

For each scenario and each completed sprint `n`:

```
cumulative(n) = min(scope, startCompletedSP + (n - startSprint) * SPperSprint)
completionSprint = startSprint + ceil((scope - startCompletedSP) / SPperSprint)
```

- Original forecasts begin at numeric sprint index `0`, **displayed as `Start`**, then `S1`, `S2`, etc.
- All three lines remain **flat at the scope** after completion.
- Data extends through the latest completion sprint (normally pessimistic).
- The calculation keeps full precision; only the completion-sprint index is rounded up.
- If scope is zero, completion is `0` and the dataset contains only `Start`.
- If scope remains and a rate is zero, `status: 'not-forecastable'`, with a `null` completion sprint for that line; a full dataset cannot be generated. This prevents misleading infinite projections.
- A 10,000-sprint safety limit prevents accidental memory exhaustion from unrealistic positive throughputs.
- Optional starting-sprint and cumulative-completed inputs are included for future capacity-based reforecasting. Do **not** connect updated forecasting yet.

## Expected results with ±15%

| Scope | Realistic SP/sprint | Optimistic finish | Realistic finish | Pessimistic finish |
|---:|---:|---:|---:|---:|
| 100 | 10 | S9 | S10 | S12 |
| 150 | 20 | S7 | S8 | S9 |
| 150 | 7 | S19 | S22 | S26 |

## Usage example (later UI integration)

```ts
import { calculateSprintForecastScenarios } from './services/forecastScenarios';
import { generateCumulativeForecast } from './services/cumulativeForecast';

const scenarios = calculateSprintForecastScenarios(historical, nextSprintMembers, 15);
const original = generateCumulativeForecast(100, scenarios);
// original.points: [{sprintNumber: 0, sprint: 'Start', scope:100,
//   optimistic:0, realistic:0, pessimistic:0}, ...]
// original.completionSprints: {optimistic:9, realistic:10, pessimistic:12}
```

## Deliberately unchanged

- React dashboard and the existing three original **mock** forecast lines
- Actual completed SP and sprint history
- Historical and SE/QA capacity calculators
- Capacity bucket placeholder
- Updated/revised forecast, sprint-specific capacity form, and story-level planning

Step 3.4 will wire **this generated dataset** into the existing burn-up chart and retain the independently recorded actual delivery progress.
