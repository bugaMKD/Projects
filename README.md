# PSP Delivery Simulator — Iteration 3.2 (drop-in patch)

This is **only Step 3.2**: calculate optimistic and pessimistic story points per sprint as configurable percentage variations around the validated Step 3.1 realistic throughput.

## Apply to your existing project

Your working tree must already contain the validated Iteration 2 code and the Step 3.1 patch.

Copy the patch's two files to the corresponding paths in your existing project (do not replace the entire project):

- `src/services/forecastScenarios.ts` — new forecasting service
- `tests/forecast-scenarios.test.mjs` — new regression tests

Run:

```powershell
npm test
npm run build
```

The original 9 tests and Step 3.1's 7 tests should remain, and this patch adds 7 tests (**23 total** if everything is present).

## Calculation

First call `calculateRealisticSprintForecast()` from Step 3.1, which already uses historical effective SE/QA productivity and the limiting role for **one future sprint**.

For a realistic throughput `R` and uncertainty assumption `p` (%):

- optimistic = `R * (1 + p / 100)`
- realistic = `R`
- pessimistic = `R * (1 - p / 100)`

Default uncertainty assumption is **±15%**, adjustable to 10%, 20% or another finite percentage in `[0,100)`. This is a *planning sensitivity*, not a statistical confidence interval.

**Important:** All calculations preserve full precision. The old PSP workbook may round an intermediate SE:QA ratio down to one decimal, leading to a 21 vs approximately 21.8 SP difference in one earlier scenario. That difference is already understood and **not** introduced by 3.2. We intentionally do not round intermediate rates, and scope capping and display rounding are deferred to later steps.

## Example

Historical: 100 SP delivered, 100 SE effective days, 50 QA effective days. Upcoming sprint: 10 SE effective days and 5 QA effective days. Realistic = 10 SP/sprint; with default ±15%: optimistic = 11.5, realistic = 10, pessimistic = 8.5 SP/sprint.

## Not changed

- Existing dashboard, burn-up chart and fixed original forecast series
- Actual delivered SP and sprint history
- Iteration 2 or 3.1 calculation code
- Capacity buckets (deferred)
- No scope-capped cumulative sprint projections, dates, or updated forecasts (later iterations)

Suggested commit: `feat: add optimistic and pessimistic sprint throughput scenarios`
