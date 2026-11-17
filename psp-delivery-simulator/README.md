# PSP Delivery Simulator — Iteration 2: Historical Data & Capacity

React + TypeScript + Vite app. **Iteration 1 visuals are preserved**: release burn-up, three fixed original forecasts visible from Sprint 0, actual sprint results, scope and scenario summaries, and the four-bucket **static mock display**.

**Iteration 2 adds** independent historical SE/QA productivity and member-level effective-day capacity, plus release-level deliverable capacity as `min(scope, SE coding capacity, QA testing capacity)`. There is no arbitrary QA weight, and no sprint-level workflow simulation.

## Get started

Extract the ZIP, open the `psp-delivery-simulator-iteration-2` directory in VS Code and run:

```powershell
npm install
npm run dev
```

Open the localhost URL printed by Vite (normally `http://localhost:5173/`). For the build and calculator tests:

```powershell
npm run build
npm test
```

If PowerShell script policy blocks `npm`, use `npm.cmd install` and `npm.cmd run dev` or open a Command Prompt terminal.

## Edit the mock numbers

Only edit `src/mockData.ts` for now:

- `mockRelease`: the **unchanged Iteration 1 burn-up** scope, sprint results and original forecast rates.
- `historicalMock`: delivered SP, historical SE effective days, historical QA effective days.
- `currentTeamMock`: every SE / QA's available days and productivity fractions (`0.75` means 75%).
- `capacityExampleScopeStoryPoints`: the **independent** scope for Iteration 2 validation.
- `capacityBuckets`: an **unchanged mock UI section**. Bucket calculation and integration are deferred.

The bottom of the page contains the new **Historical productivity & delivery capacity** section.

## Validate the agreed example

Historical release: 100 delivered SP, 100 SE effective days, 50 QA effective days.

- Historical SE rate: 1 SP per effective SE day.
- Historical QA rate: 2 SP per effective QA day.
- Current team: 100 effective SE days, 25 effective QA days (SE:QA ratio = 4:1).
- SE capacity: 100 SP; QA capacity: 50 SP; scope: 100 SP.
- **Deliverable: 50 SP; QA is the limiting role.**

These values are initialized as mock data, and can be verified in `npm test`.

## Architecture

```
src/
  App.tsx                                Existing dashboard + additional panel
  mockData.ts                           Static data for both iterations
  components/HistoricalCapacityView.tsx New panel
  models/HistoricalData.ts             Historical input/output types
  models/TeamMember.ts                 Role and member types
  models/DeliveryCapacity.ts           Forecast capacity result
  services/historicalCalculator.ts     Separate SE and QA productivity
  services/capacityCalculator.ts       Effective days + delivery bottleneck
  styles.css                           Shared visual styling
  main.tsx                              React startup
```

## Intentionally deferred

- Converting formulas or importing values from `psp-final.xlsx` (Excel parity not yet claimed).
- Connecting capacity results to the original forecast lines or burn-up.
- Capacity-bucket calculations; the v1 placeholder display is retained only to avoid removing existing UI.
- Date ranges, sprint sequencing, handoffs, scope-change tracking, editable forms, databases and persistence.

The calculation engine is pure TypeScript and can be validated without a running frontend.

## Iteration 2 closure: Excel-validated regression scenarios

The original six unit tests are preserved. Three additional scenarios were compared manually against the cleaned Excel workbook and agreed to match. They are now recorded in `tests/excel-regression.test.mjs`.

| Scenario | Scope | Current SE | Current QA | Expected SE capacity | Expected QA capacity | Deliverable | Constraint |
| --- | ---: | --- | --- | ---: | ---: | ---: | --- |
| 1 — QA-constrained | 150 SP | 90 days × 100% | 30 days × 100% | 90 SP | 60 SP | **60 SP** | QA |
| 2 — SE-constrained | 150 SP | 40 days × 100% | 50 days × 100% | 40 SP | 100 SP | **40 SP** | SE |
| 3 — Partial productivity | 150 SP | 100 days × 80% | 40 days × 75% | 80 SP | 60 SP | **60 SP** | QA |

In all scenarios the **historical baseline stays unchanged:** 100 SP delivered, 100 historical SE effective days, 50 historical QA effective days. This yields historical rates of 1 SP/SE effective day and 2 SP/QA effective day.

Run `npm test` and verify **9 passing tests**. This closes Iteration 2 regression coverage; it **does not** connect capacity to the original burn-up forecast or assert complete numerical parity with every workbook formula. The dashboard and static capacity-bucket display are unchanged.

Suggested Git commit message: `test: lock iteration 2 capacity model with Excel-validated scenarios`


# PSP Delivery Simulator — Iteration 3.1 (patch only)

This ZIP contains **only two new files** to copy into your existing validated Iteration 2 project. It is deliberately **not a replacement application**. No existing source files need to be overwritten or modified.

## Files to add

- `src/services/realisticSprintForecast.ts` — one-sprint realistic throughput calculator.
- `tests/realistic-sprint-forecast.test.mjs` — seven focused automated tests.

## Install / verify

1. Extract this ZIP into the root of your **validated Iteration 2 project**, keeping the folder structure. Make sure the files end up in `src/services` and `tests` inside the existing project.
2. Run `npm test`. Your existing tests should still pass, plus seven new tests.
3. Run `npm run build` to verify TypeScript and the React application still build.
4. Commit these two new files only when results match expectations.

Suggested commit: `feat: calculate realistic sprint throughput from effective capacity`

## What it calculates

From the **whole historical release**:

- SE throughput = historical delivered SP / historical SE effective days.
- QA throughput = historical delivered SP / historical QA effective days.

From the **next sprint's team-member effective days**:

- SE coding potential = SE effective days × SE throughput.
- QA testing potential = QA effective days × QA throughput.
- Realistic throughput (SP per sprint) = minimum of these two quantities.

This does **not** need the number of historical sprints and does **not** use sprint-level work sequencing.

## Quick usage example

```ts
import { calculateRealisticSprintForecast } from './services/realisticSprintForecast';

const forecast = calculateRealisticSprintForecast(
  { deliveredStoryPoints: 100, seEffectiveDays: 100, qaEffectiveDays: 50 },
  [
    { id: 'se-1', name: 'SE 1', role: 'SE', availableDays: 10, productivity: 1 },
    { id: 'qa-1', name: 'QA 1', role: 'QA', availableDays: 5, productivity: 1 },
  ],
);

console.log(forecast.realisticStoryPointsPerSprint); // 10
```

## Explicitly deferred

- Optimistic and pessimistic multipliers (3.2).
- Scope capping, cumulative release forecast points and finish sprints (3.3).
- Wiring the original forecast lines into the burn-up chart (3.4).
- Revised forecasts, sprint-level forms and capacity buckets (later).

The original Iteration 1 and Iteration 2 UI remains untouched and should look **identical** after applying this patch.


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

# PSP Delivery Simulator — Iteration 4.1.1: Draft BL configuration model

## Apply

This patch adds two new files and **does not replace any existing files**:

- `src/models/DraftBaselineConfig.ts`
- `tests/draft-baseline-config.test.mjs`

Unzip into the root of the validated Iteration 3.4 project, preserving the folder structure.

## What's included

- Typed `DraftBaselineConfig`: release name, scope (SP), variation percentage.
- Factory defaults from existing `mockRelease` (Release Alpha, 240 SP, ±15%).
- Pure validation helpers to prevent invalid edits from reaching the calculation engine.
- Variation boundaries (0–30%) matching the agreed slider concept.
- No modification to original release inputs or actual sprint results.
- Seven tests covering defaults, independence, and invalid values.

## Important scope boundary

**4.1.1 is model-only.** The UI and chart must remain unchanged. Step **4.1.2** will connect draft state to the forecasting adapter, and **4.1.3** will add input controls and BL labels. In 4.1.3, use these validation helpers to prevent invalid form values from reaching the chart calculation.

No established baseline or persistence is introduced here; that is reserved for Iteration 4.3.

## Verify

`npm test`

`npm run build`

Expected total: **47** passing tests if all previous 40 tests are present. Only the uploaded four source files were available in this environment; full-project validation needs to run locally.


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


# PSP Delivery Simulator — 4.1.3 Draft BL UI

## Prerequisites

Apply and validate the earlier 4.1.1 and 4.1.2 patches first (54 tests passed in your local application). This patch is based on the **App.tsx** you uploaded before 4.1.1/4.1.2. It relies on `getInitialDraftBaselineConfig()` and `getIntegratedMockData(draft)` introduced in 4.1.2.

## Apply

Copy these files into the same paths in your existing project:

- **Replace** `src/App.tsx`
- **Add** `src/models/DraftBaselineInput.ts`
- **Add** `tests/draft-baseline-input.test.mjs`

No other file is overwritten. No new dependencies. The calculation services are unchanged.

## Functionality

- Editable release name; editing does not change calculations.
- Editable draft scope; changing it recalculates all three BL lines and completion sprints.
- Forecast variation slider, 0–30% in 5% increments (default 15%). Changing it affects BL Optimistic and BL Pessimistic, not BL Realistic.
- Existing historical inputs and per-sprint SE/QA capacity remain mocked (4.2 and 4.3 will make them editable).
- The chart, completion panel and actuals variance table use **one** calculated dataset.
- Labels consistently use Draft BL; chart starts at Start; original lines flatten at scope; actuals can continue past the pessimistic finish.
- All actual delivery SP are separate and unchanged by draft inputs.
- Blank/invalid release name or scope does not send an invalid draft into the forecast generator. Chart retains the last valid draft with a visible validation warning, and resumes updating when all fields are valid.
- Draft values are in component state only; reloading resets to defaults. No established/frozen baseline until 4.3.

## Validation

```powershell
npm test
npm run build
npm run dev
```

Expected **62 passing tests** if the 54 previously reported tests are present, plus a successful build.

Visual checks:
1. Default page still shows Release Alpha, 240 SP, ±15%, plus all existing sections.
2. Change release name: heading updates, forecast numbers do not.
3. Change scope to 100 SP: three BL lines and completion sprints shorten; actual SP history remains the same.
4. Change variation to ±20%: BL optimistic and pessimistic move; BL realistic stays the same.
5. Clear scope: validation message appears without chart error; restore scope and chart updates.
6. Use scope smaller than actual delivered and verify actuals remain visible and BL lines flatten at new scope.
7. Refresh browser: draft resets to default values (as designed for 4.1).

## Validation note

Eight new isolated input-validation tests were executed successfully and the utility passed an isolated TypeScript type-check. The full React application and all earlier tests are available only in your local project, so the full test/build results must be confirmed there.

Suggested commit: `feat: add editable draft BL release configuration UI`


# Iteration 4.1.3 — Scope update on field exit

Small, targeted UX adjustment to the previously delivered Iteration 4.1.3 patch.

## Apply

Replace only `src/App.tsx` in your current application with this file. All existing 4.1.1, 4.1.2, and 4.1.3 files must remain present. No dependencies or forecasting calculations have changed.

## Behavior

- **Draft release scope (SP)**: type freely; calculations, chart, completion sprints, and metrics remain on the last committed scope while the field has focus. When you **click/tab outside** the field, or **press Enter**, a valid entered scope is applied in one update.
- Invalid or empty scope: last valid forecast stays visible, and validation feedback appears. After correcting and leaving the field, the corrected scope applies.
- Release name: updates immediately, as before.
- Variation slider: updates immediately, as before. Changing it while scope has uncommitted text does **not** accidentally commit that scope.
- Mock completed SP are never altered.

## Verify locally

```powershell
npm test
npm run build
npm run dev
```

Visual test:
1. Starting from 240 SP, focus scope, clear it and type `100`: the chart should **not** change while typing.
2. Click elsewhere or press Enter: three BL lines, completion sprints, and release metrics update together to 100 SP.
3. Enter invalid/empty scope and leave the field: no chart crash and previously committed forecast stays visible.
4. Change the variation slider, including while scope is mid-edit: variation updates from the committed scope; scope still waits for blur.
5. Actual SP remain unchanged.

Test count should remain the same as your current project: this patch only changes React event wiring and explanatory UI text. Full application build cannot be verified without the project's complete dependencies and source tree.



# Iteration 4.2.1 — Historical draft input model

This is a **model-only patch**. Add the two files to the corresponding paths:

- `src/models/DraftHistoricalInput.ts`
- `tests/draft-historical-input.test.mjs`

It does **not** replace App.tsx, the 4.1 draft configuration, existing historical calculations, the chart adapter or actuals. No UI changes yet.

## Historical data semantics

The three values are totals from the historical period:

- historical delivered story points
- historical SE effective days
- historical QA effective days

The historical period's sprint count is irrelevant. Effective days are already aggregated historical effort. Historical productivity remains computed by the pre-existing validated services.

All three inputs are positive finite numbers. Form fields hold strings to support intermediate typing; no invalid historical values are passed to the engine. Decimal precision is preserved.

## Verify

```powershell
npm test
npm run build
```

Expect **69 tests** assuming all 62 Iteration 4.1 tests are present. Next, Step 4.2.2 will thread these validated historical values into the chart adapter; Step 4.2.3 will introduce the UI, committing numeric edits on blur or Enter as with scope.

# PSP Delivery Simulator — Iteration 4.2.2: Historical Data Integration

**Prerequisite:** Your local application has validated Iterations 4.1.1–4.1.4 and 4.2.1 (expected 69 existing tests).

## Apply

Extract the ZIP into the project root, preserving the paths:

- **Replace** `src/data/originalReleaseDataset.ts`.
- **Add** `tests/draft-historical-dataset.test.mjs`.

No changes to `src/App.tsx`, `src/services/draftBaselineDataset.ts`, forecasting mathematics, mock actual sprint history, or the Iteration 2 capacity view. No new packages.

## Integration

`getIntegratedMockData()` remains backward compatible and still uses the mock history.
`getIntegratedMockData(draft)` remains backward compatible with Iteration 4.1.

**New:** `getIntegratedMockData(draft, validatedHistoricalData)` accepts independently configured historical totals. They flow directly into `buildDraftBaselineDataset()` and the existing 3.1–3.3 forecasting services.

For example:

```typescript
const parsed = parseDraftHistoricalFormInput(historicalForm);
if (parsed.historical !== null) {
  const chart = getIntegratedMockData(draftBaselineConfig, parsed.historical);
}
```

In Step **4.2.3**, the UI will keep the current text values separately from the last valid committed historical totals. When leaving an input (or pressing Enter), it will validate and commit a valid number. Invalid edits will keep the previous valid dataset visible; no invalid historical data gets passed to the engine.

## Run

```powershell
npm test
npm run build
```

**Expected:** 76 tests if all previous 69 tests are present, and a successful production build.

## What the seven new regression tests cover

- Previous zero-argument/one-argument adapter calls still behave identically.
- Historical delivered SP changes per-sprint forecast rates and completion sprints.
- SE effective days change SE-constrained forecasts.
- QA effective days change QA-constrained forecasts.
- Historical values and the variation setting combine correctly.
- Actual delivery is independent from historical input changes, including overdue release horizons.
- Parsing historical numeric text prevents invalid input from being applied.

Note: this is **data integration only**. No editable UI fields, baseline establishment, persistence, or updated forecasts yet.


# PSP Delivery Simulator — Iteration 4.2.3: Editable Historical Productivity

This patch is based on your validated **Iteration 4.1.3 scope-on-blur App.tsx**, and expects the **Iteration 4.2.2** integration (two-argument `getIntegratedMockData(draft, historical)`) and 4.2.1 historical validation model to already be present.

## Apply

Copy these files into your existing project, preserving the folders:

- Replace `src/App.tsx`
- Add `src/models/DraftHistoricalCommit.ts`
- Add `tests/draft-historical-commit.test.mjs`

No forecasting services, current mocks, styles, or baseline dataset files need changes.

## Behavior

A new **Historical Productivity** section below Release Configuration has three editable fields:

1. Historical delivered SP (starts at 100)
2. Historical SE effective days (starts at 100)
3. Historical QA effective days (starts at 50)

The values are totals from historical delivery, never per-sprint averages. Numeric inputs stage text during typing; **only blur or Enter commits a valid set**. When committed, the existing Draft BL adapter receives both draft release configuration and historical totals. All three draft baseline forecasts, completion sprints and historical comparisons recalculate. Existing actual delivery is not changed.

If a field contains blank, zero, negative or non-numeric input, errors display and the most recently valid historical data remains in use. All three fields must be valid to commit. Release-scope on-blur behavior and variation slider are unchanged. No persistence or baseline establishment yet; those belong to Iteration 4.3.

## Validate locally

```powershell
npm test
npm run build
npm run dev
```

Expected **83 passing tests** (76 previous + 7 new), assuming no independent test changes.

Visual checks:
- Default history displays 100 SP, 100 SE days and 50 QA days; draft BL matches the previous output.
- Change historical delivered SP from 100 to 200 without leaving field: chart remains the same; leave field: realistic throughput doubles (for the unchanged SE/QA mock capacities).
- Change historical SE days to 200: SE becomes more restrictive and forecast changes accordingly.
- Change historical QA days to 100: QA becomes more restrictive and forecast changes accordingly.
- Clear an input: validation message displays, last valid graph stays visible.
- Confirm all actual sprint values remain unchanged, and draft scope still applies on blur.

The seven new commit tests passed in an isolated Node/TypeScript fixture; the full React app build must be verified locally.


# Iteration 4.3.1 — Future Team Capacity Input Model

This is the first, **model-only** step of Iteration 4.3. It does not alter `App.tsx`, existing forecasting math, or any currently displayed data. It adds an editable form representation for **future capacity per sprint** distinct from Iteration 4.2's historical effective-day totals.

## Files

- New `src/models/DraftSprintCapacityInput.ts`
- New `tests/draft-sprint-capacity-input.test.mjs`

## Behavior

- One row per SE/QA team member; retain `id`, `name` and `role` plus text fields for days available **per sprint** and productivity percentage.
- UI productivity 80% is converted to existing `TeamMember.productivity = 0.8`. No early rounding.
- Example defaults: 10 SE days/sprint at 100% productivity, 5 QA days/sprint at 100%, preserving 4.2 forecasts.
- Validate blank/non-numeric/negative days, percentages outside 0–100, duplicate IDs, missing names and invalid roles.
- Zero-day or zero-productivity scenarios remain valid inputs and can produce a `not-forecastable` outcome downstream rather than a fabricated throughput.
- Historical delivered SP, historical effective days, and completed actual sprint results are **not modified**.
- No established baseline in this step. The 4.3.2 integration will pass committed capacity to the forecast dataset; 4.3.3 will add editable team inputs; 4.3.4 will add explicit baseline establishment/preservation with regression tests.

## Apply and validate

Copy both new files into your existing project and run:

```powershell
npm test
npm run build
```

Expected: **91 tests** if your previous 83 are still present, and successful build.

# PSP Delivery Simulator — Iteration 4.3.2: Connect Future Team Capacity to Draft BL

Data integration only. The application UI and validated forecasting calculations are untouched. Follow the established incremental workflow.

## Apply

Copy the patch contents into the corresponding folders of your existing application:

- **Replace** `src/data/originalReleaseDataset.ts`.
- **Add** `tests/draft-sprint-capacity-dataset.test.mjs`.

Prerequisite: 4.3.1's `src/models/DraftSprintCapacityInput.ts` exists. `DEFAULT_SPRINT_CAPACITY_MEMBERS` is now the single source for the static initial future per-sprint capacity, so your previous chart numbers remain the same.

## API

`getIntegratedMockData(draft?, historical?, sprintMembers?)`

- The new optional third argument is a list of **validated TeamMember objects**, with available days *per future sprint* and `productivity` as a 0–1 fraction.
- Existing 0-, 1-, and 2-argument calls work unchanged.
- The UI in 4.3.3 must use `parseDraftSprintCapacityForm()` first and pass its `members` **only when non-null**. Invalid edits must not replace the last valid team or cause a chart recalculation.
- Future draft capacity is independent from historical SE/QA effective-day totals and sprint actuals.
- No established baseline, persistence, or new mathematical formulas are introduced here.

## Check

```powershell
npm test
npm run build
```

Expected **101 passing tests**, if the existing 91 tests from 4.3.1 are all present; plus a successful build. The 10 new tests cover backwards compatibility, SE/QA bottlenecks, productivity percentage conversion, multiple members, zero capacity, unchanged actuals, overdue release display, invalid form input and input immutability.

The 10 new tests passed in an isolated integration fixture, and TypeScript checks passed there. Run the full-project validation locally.

Next: **4.3.3 — Team Capacity UI**, with changes applied on blur/Enter as with historical inputs and release scope.


# PSP Delivery Simulator — Iteration 4.3.3: Future SE/QA Capacity UI

## Files

- Replace `src/App.tsx` (based on 4.2.3 validated UI).
- Add `src/models/DraftSprintCapacityCommit.ts`.
- Add `tests/draft-sprint-capacity-commit.test.mjs`.

Prerequisites: 4.3.1 model (`DraftSprintCapacityInput.ts`) and 4.3.2 adapter (`getIntegratedMockData(draft,historical,sprintMembers)`) already installed. No changes to forecasting calculations or chart integration services.

## UI

A new section **Future SE/QA Capacity** follows **Historical Productivity**, before the metrics and burn-up chart. Supports multiple people of either role, adding/removing a person, editing names/roles, available days **per future sprint**, and productivity percentage 0–100. Current default is a synthetic SE with 10 days/100% and QA with 5 days/100%, preserving the previous baseline forecast values.

Typing numeric input or a name changes only the form; on **blur or Enter**, a fully valid team is committed and the chart, completion forecasts, delivery metrics, and variance table recalculate together. A role selection or add/remove action is immediate. Invalid inputs preserve the last valid team and show errors. If the last team member is removed, the empty form reports an error and the previous valid team remains in use. Zero capacity is allowed and should show Not forecastable (it is different from invalid input).

Actual completed sprint data and historical effective-day totals remain independent; no 'Establish Baseline' yet (planned 4.3.4). The four PSP allocation buckets are preserved untouched.

## Validate locally

```powershell
npm test
npm run build
npm run dev
```

Expected **109 tests** (101 + 8) if all prior tests are installed.

Visual checks: modify available days, verify chart unchanged while typing then updates when leaving; try 75% productivity; add SE and QA and observe role bottleneck; clear a field and confirm last valid chart remains; change capacity to zero and confirm Not forecastable; remove a member and check new forecast; confirm historical inputs, scope on blur, and actual SP stay independent.

This patch was tested with an isolated Node TypeScript fixture. The complete React app build must be verified in your own checkout.


# Iteration 4.3.4a — Established BL snapshot foundation

This is the first of two deliberately small stages for Iteration 4.3.4.

## Apply

Copy these **new** files into your existing validated 4.3.3 project:

- `src/models/EstablishedBaseline.ts`
- `src/services/establishedBaselineDataset.ts`
- `tests/established-baseline.test.mjs`

Do not replace `App.tsx` yet. The Establish Baseline button/locking UX will follow in **4.3.4b** after this data contract is validated. No changes to existing calculations.

## What the model guarantees

- Establishment copies and freezes the **committed release configuration**, historical productivity, team member capacity and **three forecast lines, completion sprint values and throughput**.
- The saved baseline does **not** contain actual delivered SP; actuals can be merged independently at any time.
- The baseline stays fixed even if the editable draft objects are later mutated.
- An active release can continue delivering **beyond the pessimistic baseline completion sprint**. Forecast lines stay flat at original scope while actuals progress.
- A mismatching release scope is rejected, and invalid actuals are rejected.
- This is an **in-memory** snapshot model; persistence between browser reloads is not yet implemented. We should resolve persistence alongside the UI in 4.3.4b rather than falsely present a reload-sensitive snapshot as durable.

## Validate

```
npm test
npm run build
```

Expected test count **118** (109 prior + 9 new) if the prior tests are all present.

The nine new tests were run successfully in a Node TypeScript test fixture, and an isolated TypeScript compile succeeded. The full project build still requires local verification.

# PSP Delivery Simulator — Iteration 4.3.4b: Establish Baseline UI

## Requirements

This patch assumes you have installed and validated **4.3.4a** (118 tests passing), including:

- `src/models/EstablishedBaseline.ts`
- `src/services/establishedBaselineDataset.ts`

## Apply

1. Replace `src/App.tsx` with the supplied file. It is based on 4.3.3.
2. Add `src/models/BaselineEstablishmentEligibility.ts`.
3. Add `tests/baseline-establishment-eligibility.test.mjs`.

No existing forecasting services need replacement. No additional npm packages are needed.

## Behavior

- Before establishment, all three BL forecast lines remain editable via the existing Draft BL inputs.
- An **Establish Baseline** button appears in a **Baseline status** section after the three configuration panels.
- If a release, historical or capacity field is invalid or edited but not yet committed on blur/Enter, establishment is **disabled** with an explanatory message. The baseline cannot silently capture stale inputs.
- Clicking Establish Baseline creates the immutable snapshot from **4.3.4a**, then shows **Established BL** status.
- Every release, historical and future capacity input is disabled after establishment, including Add/Remove team actions and the variation slider.
- The burn-up and the completion forecast panel use the frozen snapshot via `buildEstablishedBaselineDataset`; the three original BL lines and completion sprints do not change as actuals advance.
- Actual delivered points remain independent, including actuals beyond the pessimistic BL completion sprint.

### Important persistence limitation

**This step is in-memory only.** Reloading the page returns the UI to Draft BL and the initial mock defaults. This is prominently noted in the new UI. Do not treat an in-memory baseline as permanent. Persistence across reloads will be handled in a separate follow-up before Iteration 4 is declared complete.

### Validation

```powershell
npm test
npm run build
npm run dev
```

Expected **126 passing tests** if all 118 earlier tests are installed. Eight new unit tests for establishment eligibility passed in an isolated Node/TypeScript fixture; the complete app build must be checked locally.

Visual checks:

1. All inputs editable in Draft BL; Establish Baseline enabled when all fields are committed and valid.
2. Type a new scope but **do not** leave field: establishment must be blocked until the edit is applied.
3. Clear/invalid historical or capacity value: establishment blocked with a reason.
4. With valid applied inputs, click Establish Baseline: button disappears, status becomes Established BL, all form controls lock.
5. BL optimistic/realistic/pessimistic lines, completion sprints, release scope and current actuals do not jump on establishment.
6. Reload: the page returns to Draft BL (expected **only for this patch**; persistence is the next step).

Do not commit baseline storage expectations until persistence is implemented.

# PSP Delivery Simulator — Iteration 5.1: Multi-Release Data Model

## Scope

Data model only. No React changes, browser storage, authentication, navigation or forecasting calculations are introduced in this step. This patch builds upon the validated Iteration 4.3.4 baseline model.

**Decisions:**
- **Release** is the primary entity. Each release has an ID, schema version, timestamps, committed draft inputs, incremental sprint actuals, and optional Established BL.
- A release begins with baseline status `draft`, and can transition once to `established`.
- **Save Draft is manual**: `saveDraftRelease(...)` is invoked only when the user chooses Save Draft (UI integration planned for 5.4).
- **Establish BL is an explicit action**: the established snapshot is supplied from the existing `establishBaseline()` method in 4.3.4a. In 5.4, the UI will save the current valid draft as part of establishing BL, then persist the result automatically.
- **Established BL is immutable**: preserve the previously calculated three forecast lines and completion sprints. Never derive saved BL data from a newer forecasting-engine version on load.
- **Actual delivery remains mutable independently**: `replaceReleaseActuals(...)` returns a new release record but carries over its stored baseline unchanged.
- **Schema version 1** is available for future storage/migrations and JSON export.

## Files to apply

Add the following to your existing application without replacing anything:

- `src/models/ReleaseRecord.ts`
- `tests/release-record.test.mjs`

Dependencies are existing files from Iteration 4:
`src/models/DraftBaselineConfig.ts`, `HistoricalData.ts`, `TeamMember.ts`, and `EstablishedBaseline.ts`.

## API

- `createDraftRelease(id, now, inputs, completedSprintPoints?)`
- `saveDraftRelease(draftRecord, now, committedInputs)`
- `establishRelease(draftRecord, now, establishedBaselineSnapshot)`
- `replaceReleaseActuals(record, now, completedSprintPoints)`
- `RELEASE_SCHEMA_VERSION`, `ReleaseCollectionV1`, `ReleaseRecord`, `ReleaseInputs` and discriminated `DraftReleaseRecord` / `EstablishedReleaseRecord` types.

The record ID and ISO timestamp are supplied by the caller, keeping models independent of browsers, UUID generators and persistence. `establishRelease` rejects snapshots based on inputs different from the saved draft. The UI should therefore apply and validate all edits, update the release's saved draft, and then establish its snapshot as one explicit user action.

## Validate

```powershell
npm test
npm run build
```

If your current 4.3.4b total is 126 tests, the new expected total is **137**. The 11 new tests passed in an isolated TypeScript fixture, and an isolated strict TypeScript compile passed. Verify the actual total and full Vite build in your checkout.

## Tests cover

Release identity and schema, independent releases, defensive data copying, explicit draft saving, immutable established BL snapshot, rejection of mismatched assumptions, independent actual delivery, actuals beyond BL horizon, invalid actuals/metadata, and JSON serialization.

## Next: Iteration 5.2

Introduce the `ReleaseRepository` interface and browser-local storage implementation with schema validation, malformed/legacy storage detection, and tests. Do not modify forecasting math.

# PSP Delivery Simulator — Iteration 5.2: Release Repository & Browser Persistence

## Scope

A versioned storage repository for multiple releases. **No React/UI changes. No modifications to forecasting calculations.**

This patch requires the validated **Iteration 5.1** `src/models/ReleaseRecord.ts` and the Iteration 4 baseline model.

## Apply

Copy the new files into the corresponding locations in your project:

- `src/repositories/ReleaseRepository.ts`
- `src/repositories/LocalStorageReleaseRepository.ts`
- `tests/release-repository.test.mjs`

No existing source files need replacement and no npm dependencies are added.

## Contract

```typescript
const repository = createBrowserReleaseRepository(); // Only call in browser
repository.saveRelease(record); // create or update by stable ID
const all = repository.listReleases(); // newest updatedAt first
const record = repository.getRelease(id); // record or null
const deleted = repository.deleteRelease(id); // boolean
```

`ReleaseRepository` is the abstraction. `LocalStorageReleaseRepository` implements it using `localStorage` via an injectable `KeyValueStorage` interface, allowing Node tests and future server implementations. All data is stored as one versioned JSON collection under `psp-delivery-simulator:releases:v1`.

**Important: Manual Save Draft is a UI behavior, not an automatic storage event.** A draft must be explicitly passed to `saveRelease()` by a future Save Draft button. Similarly, the Establish Baseline action will explicitly call `saveRelease(establishedRecord)` in 5.4. Storage alone does not observe inputs.

**Baseline preservation:** Reloading an established release uses the serialized `establishedBaseline.forecast` snapshot; never re-run the forecasting engine to regenerate the established BL. The repository rejects updates that modify or remove an existing established baseline and also rejects changing the saved baseline's draft assumptions. It allows new completed sprint actuals without changing BL.

**Failure safety:** Corrupted JSON, unsupported schema versions, duplicate IDs and invalid release records produce `ReleaseStorageError` rather than silently clearing/reinitializing the collection. Browser storage read/write failures are surfaced to the caller. Existing unrelated localStorage keys are unaffected. The UI should show the error and let users decide what to do; do not clear storage automatically.

**Limitations:** localStorage is device/browser/origin-specific, is not synchronized across browser tabs or devices, and can be cleared by the browser/user. Export/import will be a later feature. The repository uses a single read-modify-write collection (suitable for the prototype; concurrent edits from two tabs require a future synchronization strategy). No screens or persistence are wired to the current React App yet.

## Verify

```powershell
npm test
npm run build
```

Expected **152 passing tests** if your existing total is 137 after Iteration 5.1; 15 tests are new here. Run the full build in your own checkout. The 15 new tests and 11 existing 5.1 tests passed in an isolated Node fixture, and a strict TypeScript check passed there.

## Next — 5.3 Release Management UI

- Two top-level tabs: **Release Management** (initial) and **Release Workspace** (existing simulator).
- List saved releases; New Release; Open Release; delete confirmation.
- Show an empty-state view when no releases exist.
- The Release Workspace is connected to the repository and Manual Save Draft / Establish BL in 5.4, with unsaved-change protection.


# PSP Delivery Simulator — Iteration 5.3: Two-Tab Release Management UI

## IMPORTANT: preserve the current validated workspace

This patch provides a *new* top-level `src/App.tsx` application shell. It **does not include a copy of your current Iteration 4 workspace**, because your local `App.tsx` is the validated source of truth and must remain intact.

**Apply in this order:**

1. On your Iteration 5 Git branch, verify `npm test` and `npm run build` already pass. Commit/backup your validated code.
2. **Move/rename your existing `src/App.tsx` to `src/ReleaseWorkspace.tsx`**. Keep its contents unchanged, including its default-exported function (`export default function App()` is fine; the exported local function name need not change).
3. Copy the new `src/App.tsx` from this patch into your project.
4. Add `src/components/ReleaseManagement.tsx`, `src/navigation/ReleaseNavigation.ts` and `tests/release-navigation.test.mjs` from this patch.
5. Run `npm test`, `npm run build`, and `npm run dev`.

**Do not overwrite your existing `src/App.tsx` before renaming it.** That file contains all the working forecasting controls and must survive intact in `src/ReleaseWorkspace.tsx`.

## Scope / behavior

- Two top-level tabs: **Release Management** (startup default) and **Release Workspace**.
- Management lists the actual persisted releases from the 5.2 repository, including release status, scope, delivered SP (sum of per-sprint actuals), and the saved BL Realistic completion sprint (where established).
- Displays an empty state if no releases have been saved yet.
- `New Release` switches to the Workspace tab, marked as a new unsaved configuration preview.
- `Open release` selects its stable ID and opens the Workspace tab; it does **NOT yet hydrate the simulator from the stored inputs**. A clear notice explains this, rather than pretending the stored release is loaded.
- `Delete` requires native confirmation, deletes only the selected record, and refreshes the list.
- Local-storage errors appear in an error message; invalid stored data is never wiped automatically.
- The existing simulator is imported as `ReleaseWorkspace` and is **not modified**.

### Deliberate boundary: Iteration 5.4

This is the navigation and management-list iteration, **not** the workspace integration iteration.

- Do not consider the preview below the notice to be the opened release's data. It still uses the previously validated simulator's internal state/mock inputs.
- Draft editing, `Save Draft`, establishing a BL to the repository, loading saved draft or established BL into the workspace, and unsaved-change guards will be implemented in 5.4.
- The current 4.x workspace header will appear nested under the new application header until the workspace layout is refined in 5.4; the forecasting logic itself stays untouched.
- Switching tabs currently remounts the preview; do not use the preview for unsaved production data. UI warns about preview status.

## Validation

```powershell
npm test
npm run build
npm run dev
```

Expected **161 tests** (152 validated through 5.2 + 9 new tests), assuming prior test count matches.

The 9 new navigation/summary tests passed in an isolated Node test run, and the navigation types passed strict TypeScript checking. The complete React app and runtime UI must be verified in your own checkout.

### Visual test checklist

1. Initial tab is Release Management; no releases displays empty state.
2. Both tabs are visible and can be selected.
3. The Release Workspace contains your unchanged previous simulator (inputs, burn-up chart, establishment UI).
4. Clicking New Release selects Workspace and displays the preview warning.
5. Any releases already saved through the 5.2 repository appear after refreshing/reopening the management tab.
6. Clicking Open on a saved release shows its name in the warning (do not expect data hydration until 5.4).
7. Cancel Delete leaves the record intact; confirm Delete removes only that record.
8. Invalid browser storage surfaces an error and is not cleared.

## Next: Iteration 5.4 — Release Workspace integration

Connect the selected release/new release state to the actual configurable form state. Implement explicit Save Draft, establish-and-save BL, hydrating saved releases, actual delivery updates, and unsaved-change protection. Keep the established BL immutable and the forecasting engine unchanged.


# PSP Delivery Simulator — Iteration 5.4.1: Release Workspace integration service

This is the **first, model/service-level stage of 5.4**, not the final UI. All changes are additive. No forecasting engine, App.tsx, ReleaseWorkspace.tsx, or navigation component is replaced.

## Install

- Add `src/services/ReleaseWorkspaceOperations.ts`.
- Add `tests/release-workspace-operations.test.mjs`.

Prerequisites: validated 5.1 ReleaseRecord, 5.2 repository, and 5.3 UI.

## Contract

- `newWorkspaceSession(id, now, inputs)` — create a new **unsaved** release in memory; caller should provide a new unique ID.
- `openWorkspaceSession(repository, id)` — hydrate an actual saved release's configuration and its frozen BL snapshot (if established).
- `editWorkspaceSession(session, committedInputs)` — update **only** the in-memory draft (not browser storage). Cannot edit an established BL.
- `hasUnsavedDraftChanges(session)` — indicates unsaved draft edits, or an unpersisted new release.
- `persistWorkspaceDraft(repository, session, now)` — **manual Save Draft**, one repository write; returns updated session only after successful save.
- `persistWorkspaceBaseline(repository, session, now, existingBaselineSnapshot)` — single explicit action: save committed inputs and established BL **in one repository write**; rejects mismatched snapshots. Existing validation of staged/uncommitted form text from Iteration 4 must run before calling this function.
- `persistWorkspaceActuals(repository, session, now, sprintValues)` — persist actual sprint SP separately, preserving BL identity; require saved release and no unsaved draft changes.

All these are **pure UI integration helpers with explicit repository calls**, not a replacement forecast engine. They do not read browser globals and do not access localStorage directly.

## UI integration to follow in 5.4.2

The validated `src/ReleaseWorkspace.tsx` in the user's local checkout is needed to safely wire forms, chart actuals and Establish Baseline. The source was not present in the working attachment set (only an older Iteration 3.4 `App.tsx` was available). Since the user also fixed a local 5.3 issue, we deliberately DO NOT provide a guessed replacement that could overwrite those working changes.

In 5.4.2, keep the two-tab UI and 4.3.4 controls, initialize workspace from the selected/new release session, use **last valid committed inputs** when saving, display unsaved changes and guard navigation, and pass the frozen BL to `buildEstablishedBaselineDataset` with this release's `completedSprintPoints`. The existing `mockRelease.sprintCompletedPoints` must no longer drive saved release actuals.

After installation, run:

```powershell
npm test
npm run build
```

Expected **176 tests** if the previous full count was 161. In an isolated TypeScript fixture, 15 new workspace-operation tests and a strict type-check passed. The isolated fixture used an equivalent stub of the existing `establishBaseline` function, not the full application build; validate all existing tests in the real project.

## Limitations

No UI changes or automatic saving yet. No draft autosave. No browser unload warning. Storage is browser-local and is not a backup system.


# PSP Delivery Simulator — Iteration 5.4.2: Connect saved releases to Release Workspace

## Source files

This patch was built from the **two files you uploaded after validating Iteration 5.3**, including your local App.tsx fix. It deliberately does not replace any forecasting engine, data model, repository, or management-list file.

## Prerequisite

Iteration 5.4.1 installed and locally validated. The new App.tsx calls its `ReleaseWorkspaceOperations` service.

## Apply

On your Iteration 5 branch, commit the working tree or make a backup first. Then:

1. **Replace** `src/App.tsx` with the supplied `src/App.tsx`.
2. **Replace** `src/ReleaseWorkspace.tsx` with the supplied `src/ReleaseWorkspace.tsx`.
3. **Add** `tests/workspace-ui-integration.test.mjs`.
4. Run `npm test`, `npm run build`, and `npm run dev`.

No dependencies or package configuration changes. The `src/components/ReleaseManagement.tsx` file remains unchanged.

## Behavior delivered in 5.4.2

- Application still **starts in Release Management**.
- `New Release` opens a **new unsaved** session with default assumptions and **zero completed sprints**. It does not write storage until `Save Draft` or `Establish Baseline`.
- `Open release` retrieves a stored record by ID, hydrates release name, scope, variation, historical productivity, member capacity and actual sprint results. Re-opening a saved release resets the form instance, including when the same ID was opened previously.
- Draft edits stay local. Inputs staged while typing remain separate from committed numeric values. `Save Draft` requires **fully valid, applied inputs** and uses the 5.4.1 repository operation.
- `Establish Baseline` takes the current validated engine's forecast, freezes its inputs and all three BL scenarios, and persists it with **one repository write**. An established release reopens with locked inputs and saved BL forecast points, rather than recalculating them.
- The displayed actual history is taken from the selected release's saved incremental SP by sprint, **not from `mockRelease.sprintCompletedPoints`**. The existing historical-capacity example and PSP allocation placeholder are still independent illustrative panels.
- Unsaved changes are indicated, including uncommitted or invalid text; switching to Release Management, choosing another release, or browser refresh prompts before losing edits.
- Save/storage errors display an error and leave the current unsaved draft intact.

## Scope boundary

**Recording/editing a completed sprint via UI is not implemented in this patch.** Previously stored actuals display properly, and the 5.4.1 service already supports saving actual changes independently. Connecting the actuals editor is the next focused UI task. No forecast math is changed here.

This is browser-local persistence, not cloud sync. No import/export yet.

## Automated checks

The six tests in `tests/workspace-ui-integration.test.mjs` are **source-level wiring contracts**: they verify that the intended session, save, BL restoration, actual source and navigation guards are present. All six passed. Both modified TSX files also passed a TypeScript syntax/transpilation check. These checks **do not replace** a complete application build or browser tests.

Expected total: **182 tests** if your previous validated total was 176, all existing tests are included, and the test runner discovers the new `.mjs` test.

## Visual validation checklist

1. Launch app: Release Management is selected.
2. Click New Release: workspace shows defaults, `Completed sprint 0`, `Unsaved changes` and an active `Save Draft`. Release list remains empty until saved.
3. Edit scope, history and capacity (blur/Enter to apply): chart follows valid inputs, not keystrokes. Save Draft, then return to Release Management: a record appears.
4. Open the saved draft: exact saved scope, history and member values load. Refresh browser, reopen: data persists.
5. Edit an existing draft but switch tabs: confirm warning; Cancel stays on workspace. Discard returns to management and saved version remains intact.
6. Type invalid data or an unapplied scope change: Save Draft and Establish Baseline disabled; no storage change.
7. Open a saved draft, establish BL: status changes to Established BL; settings lock and the three forecast lines/sprint completions do not jump.
8. Refresh browser and reopen established release: BL stays established and locked, with the same forecast and actual history.
9. Create another release and save it: both releases remain separate, can be opened and deleted individually.
10. Run full `npm test` and `npm run build`; report any errors with filenames and line numbers so they can be fixed without resetting validated features.

### Existing display copy

`ReleaseManagement.tsx` from 5.3 may still say that Save Draft is coming in 5.4. This patch deliberately does not overwrite that component. You can change that descriptive text to "Create a release, then use Save Draft in the workspace." after validating 5.4.2.


# PSP Delivery Simulator — Iteration 5.4.3: Release-Specific Historical Productivity & Capacity

This patch builds on **the validated 5.4.2 workspace**. It replaces the old static bottom `HistoricalCapacityView` rendering with an explicitly release-aware, read-only panel. Forecast calculations and persistence remain untouched.

## Apply

Copy files into the corresponding project paths:

1. **Replace** `src/ReleaseWorkspace.tsx`.
2. **Add** `src/components/ReleaseHistoricalCapacityView.tsx`.
3. **Add** `src/services/releaseCapacitySummary.ts`.
4. **Add** `tests/release-capacity-summary.test.mjs`.
5. **Add** `tests/release-capacity-ui-contract.test.mjs`.

Do **not** delete `src/components/HistoricalCapacityView.tsx` yet; it may be used elsewhere. The new workspace no longer renders it. No `App.tsx`, repository, release record, or forecasting engine files are modified.

## Behavior

- The bottom Historical Productivity & Delivery Capacity panel now reflects the **selected release** rather than illustrative mock capacity.
- For Draft BL, it shows **committed** historical productivity and future SE/QA capacity. The panel updates when valid input is applied on blur/Enter, not while partially typing.
- For Established BL, it reads the **frozen snapshot** (`established.historical` and `established.sprintMembers`). Reopening an established release keeps its original assumptions.
- Displays historical total delivered SP, total historical SE/QA effective days, historical delivered SP per effective role day, planned available and effective person-days **per future sprint**, potential role throughput, combined realistic throughput, and limiting role (SE, QA, or both).
- Future effective days per role = sum of member available days per sprint × member productivity. Potential SP per role = historical SP / historical effective role days × future effective days per sprint. The bottleneck is the role with lower potential, precisely as the previously validated forecast engine does.
- The panel is read-only. The configuration panels remain the only editing surface.
- No mock data are read by the new panel, and no changes are made to the forecast engine. If historical effective days are unavailable/zero, the summary shows N/A rather than dividing by zero.

## Validate

```powershell
npm test
npm run build
npm run dev
```

**14 new tests**, so if 5.4.2 ended with 182 tests, expect **196 tests**. The 14 tests passed locally in an isolated Node fixture, and the standalone summary service passed a strict TypeScript check. The full React build must still be run in your checkout.

### Manual checks

1. Create a release. Default historical totals should be 100 delivered SP, 100 historical SE effective days, and 50 historical QA effective days (only if you retain the previously agreed defaults).
2. Modify Historical delivered SP or historical role days; after blur, confirm the bottom panel changes along with the forecast.
3. Modify a SE or QA member's available days and productivity; verify the future **effective days / sprint**, role potential, and bottleneck reflect the changes.
4. Add multiple members of a role, and confirm their contributions are aggregated. Set one role to zero effective days and verify throughput is zero.
5. Save Draft; navigate away and reopen. The bottom panel should show that particular release's saved inputs.
6. Establish BL; reopen from Release Management. The panel should show its frozen original assumptions, and established BL lines must remain unchanged.
7. Open a second release with different inputs and confirm there is no carryover from the first.
8. Confirm the **PSP allocation** panel remains unchanged (its original buckets are still mock placeholders; replacing them is out of scope).

The actual sprint entry UI remains a separate upcoming step.

# PSP Delivery Simulator — Iteration 5.4.4: Duplicate Release

Prerequisites: validated **5.4.3**. No forecasting engine changes. **Do not replace `ReleaseWorkspace.tsx`**; the 5.4.3 panel remains exactly as validated.

## Copy these files

- **Replace** `src/App.tsx` — based on the validated 5.4.2 App shell; 5.4.3 changed only ReleaseWorkspace and its capacity panel.
- **Replace** `src/components/ReleaseManagement.tsx` — adds a Duplicate action beside Open/Delete for every saved release.
- **Add** `src/services/DuplicateRelease.ts` — pure duplication logic (no storage or recalculation).
- **Add** `tests/duplicate-release.test.mjs` — 9 focused model tests.
- **Add** `tests/duplicate-release-ui-contract.test.mjs` — 3 UI wiring contract tests.

If you made additional unshared changes to `App.tsx` or `ReleaseManagement.tsx`, compare rather than overwriting them. The previously reported small 5.3 fix was not supplied as a new `ReleaseManagement.tsx`.

## Behavior

1. In **Release Management**, click **Duplicate** on any saved Draft or Established BL release.
2. If the current workspace contains unsaved edits, the usual discard-changes confirmation appears first.
3. The application reads the original from the repository, creates a **new unsaved Draft BL** using a fresh ID and timestamp, and navigates directly to **Release Workspace**.
4. The name is suggested as `<Original name> (Copy)`. Scope, variation, historical productivity, and all future SE/QA member settings carry over.
5. Actual sprint history is empty, and any established BL snapshot is discarded. The original release stays unchanged.
6. Modify inputs as desired and explicitly click **Save Draft**. Until then the copy does not appear in Release Management and leaving the workspace warns about unsaved changes.

## Validate

```powershell
npm test
npm run build
npm run dev
```

Expected new tests: **12**. If your most recent full test count was 196, expect **208** in total. The 9 model and 3 UI contract tests passed in a local isolated test fixture. The model passed a strict TypeScript check; you must run the complete project build on your machine.

### Manual scenarios

- Create a saved draft with modified scope/team, duplicate it, and confirm the new name and settings; no actual sprints; status Draft BL.
- Establish a release BL, duplicate it, and verify the new copy is editable without a frozen BL; source remains locked.
- Return to Management without saving the copy: expect a warning and no duplicate in saved list.
- Duplicate again and **Save Draft**: return to Management and verify both distinct releases exist.
- Reopen both, ensure no shared edits or altered baseline; ensure historical capacity panel correctly follows the selected release.
- Trigger a duplicate while an existing draft has unsaved changes and cancel the warning: existing workspace remains intact.

Next suggested step: 5.4.5 — Actual Sprint Entry.


# PSP Delivery Simulator — 5.4.5a: Actual Sprint Entry

**Prerequisites:** 5.4.4 validated and committed, including the 5.4.3 Historical Capacity panel. This patch does NOT change any forecast calculation, storage schema, baseline snapshot or management UI.

## Apply

- **Replace** `src/App.tsx` (based on validated 5.4.4).
- **Replace** `src/ReleaseWorkspace.tsx` (based on validated 5.4.3; 5.4.4 did not change it).
- **Add** `src/services/ActualSprintEntry.ts`.
- **Add** the three files in `tests/`.

## Behavior

- Once the release is saved, the bottom **Completed sprint history** panel has an input for **Sprint N+1**, where N is the number of already saved sprints.
- Type the **incremental** SP delivered *during that sprint*, not the cumulative SP.
- Click **Save Sprint N+1** (or press Enter) to append one sprint. A zero-SP sprint is valid; negative, empty and non-finite values are invalid.
- Save uses the existing `persistWorkspaceActuals` repository function. The action is explicit, atomic from the UI's point of view, and reports storage errors without clearing the input.
- Before actuals may be entered, the release must have been saved and all Draft BL changes must be saved. Established BL inputs remain locked, but actuals may continue evolving.
- After saving, actual delivered, remaining SP, variance against BL, sprint count, and burn-up chart update from saved actuals.
- Pending, unsubmitted actual input is protected by the unsaved-changes navigation warning.
- The 3 BL forecast lines and completion sprints are unchanged, including when actuals extend beyond the baseline completion horizon.
- At this stage, only **appending new sprints** is available; editing previously saved sprint entries is deferred. This guards against accidental historical rewrites.

## Validation

```
npm test
npm run build
npm run dev
```

New tests: **17** (10 parser/append tests, 3 storage workflow tests, 4 wiring contract tests). They passed in isolated Node/TypeScript fixtures; the new service passed a strict TypeScript check. Full React build and UI need local validation. If previous count is 208, expect **225 tests**.

Visual cases:

1. New unsaved release: no sprint entry allowed. Save Draft; Sprint 1 becomes available.
2. Enter 20 SP for Sprint 1, save; then 15 SP for Sprint 2; cumulative is 35, not 15.
3. Save zero SP for Sprint 3; it still advances completed sprint count.
4. Refresh and reopen; values and chart persist; release-specific data only.
5. Establish BL, record next sprint, verify forecast lines and completion sprints do not shift.
6. Enter an amount but navigate to Management: discard warning appears; saving clears the warning.
7. With unsaved Draft BL edits, Save Sprint is disabled until the draft is saved.

## Separate Git commits

Commit this **5.4.5a** patch first. Only afterward apply **5.4.5b** (capacity wording), so each remains independently reversible.


# PSP Delivery Simulator — 5.4.5b: Capacity Balance Wording

This is an **independent, display-only refinement** on top of validated 5.4.3 capacity summary. The forecasting engine and storage logic remain unchanged. Can be applied after 5.4.5a or separately.

## Apply

- **Replace** `src/services/releaseCapacitySummary.ts`.
- **Replace** `src/components/ReleaseHistoricalCapacityView.tsx`.
- **Replace** `tests/release-capacity-summary.test.mjs` (the 5.4.3 test file; expected Balanced instead of Both, plus one new case).

## Wording

- SE potential is lower: **Capacity balance: SE limiting**.
- QA potential is lower: **Capacity balance: QA limiting**.
- Both potentials match above zero: **Capacity balance: Balanced** — neither role is individually limiting.
- Both potential throughputs are zero: **Capacity balance: No delivery capacity**.
- Historical productivity is undefined: **Unavailable**, as before.

No numerical changes, except for labels and classification of equal-zero capacity. The calculation of realistic throughput remains exactly the same.

## Validate

```
npm test
npm run build
npm run dev
```

The revised capacity summary suite passed **11 tests** (10 existing cases, one extra). As the existing 10-test file is replaced, this patch increases the overall full-project count by **1**, to **226** if the previous total after 5.4.5a was 225.

Visually check a balanced SE=10 SP/sprint / QA=10 SP/sprint scenario, one SE-limited, one QA-limited, and a both-zero scenario.

Commit separately, for example: `refactor: describe balanced capacity without implying both roles are limiting`.


# PSP Delivery Simulator — Iteration 5.4.5c: Edit Completed Sprint Results

**Scope:** existing sprint corrections using **Edit → Apply Preview → Save Changes / Discard Preview**. No change to established baseline, forecasting engine, repository schema, capacity wording or new-sprint append logic.

## Prerequisite

Install and validate 5.4.5a first (Actual Sprint Entry). This patch's `App.tsx` and `ReleaseWorkspace.tsx` are based on 5.4.5a. The 5.4.5b terminology patch changes different files and can be installed independently.

## Files

- Replace `src/App.tsx`
- Replace `src/ReleaseWorkspace.tsx`
- Add `src/services/EditSprintActuals.ts`
- Add `tests/edit-sprint-actuals.test.mjs`
- Add `tests/edit-sprint-ui-contract.test.mjs`

## Behavior

1. Open a **saved** release and select **Edit** on an existing sprint row.
2. Enter a non-negative number of **incremental SP completed in that sprint**. Pressing Enter does **not** apply or save it. Click **Apply Preview** explicitly. Cancel abandons only the current edit field.
3. The burn-up **Actual delivered** line, total actual SP, remaining scope, cumulative table, and variance vs BL update from the preview in memory. Multiple sprint edits can be previewed together.
4. An **Unsaved actuals preview** banner appears with **Save Changes** (persists the complete corrected actuals array) and **Discard Preview** (reverts all changes to recorded actuals).
5. If a preview restores all recorded numbers, it is no longer considered dirty and no save is needed.
6. Changing stored actuals does not change BL Optimistic/Realistic/Pessimistic lines, their completion sprints, or established planning assumptions.
7. The existing app navigation and browser reload warning protect unsaved previews (and currently active edit fields). Appending the next sprint is disabled while there is an active correction/changed preview.
8. Editing is disabled for unsaved new releases and Draft BLs with uncommitted/unsaved configuration changes. Actuals can still be edited for saved Established BL releases.
9. Storage errors do not discard the preview; successful persistence clears it. The new service rejects invalid values, incorrect indices and changes in the number of completed sprints.

**Important:** This is correction/what-if preview for actual SP, not an updated completion forecast. Only the actuals line and actuals-derived measures change; our forecast remains the established BL.

## Validate locally

```
npm test
npm run build
npm run dev
```

There are **19 new tests**: 14 numerical/service tests and 5 UI contract tests. If the full validated 5.4.5a + 5.4.5b test count was 226, expect **245** passing tests. If you have applied 5.4.5a but not 5.4.5b, expect **244** tests.

Manual verification:
- Record Sprint 1 and Sprint 2 and save. Edit Sprint 1, apply preview: downstream cumulative totals and graph move; stored values remain unchanged until Save Changes.
- Discard Preview: previous values return. Edit again and Save Changes: reopening and refreshing preserve the new value.
- Edit two sprint values before saving: both changes persist together.
- Invalid value, Escape/Cancel, accidental Enter: no save occurs.
- With established BL, check all three BL lines and finish sprints remain fixed.
- Attempt to leave with an unsaved correction: the navigation warning appears.
- Test with 0 SP and with actuals beyond the pessimistic BL completion sprint.

Focused tests passed in Node isolated fixture and both TSX files passed TypeScript syntax transpilation. Run full project build and visual verification locally.


# PSP Delivery Simulator — 5.4.5c compatibility fix for older UI contract tests

**Test-only change:** No application source code, forecast engine, storage, or chart logic is modified.

Replace these three existing tests:

- `tests/actual-sprint-ui-contract.test.mjs`
- `tests/release-capacity-ui-contract.test.mjs`
- `tests/workspace-ui-integration.test.mjs`

Why:
- 5.4.5c previews actual changes using `completedActuals = actualPreview ?? savedActuals`, so old source-pattern tests looking for direct `savedActuals` are outdated.
- 5.4.5b renamed `Limiting role` to `Capacity balance`.
- Save Draft now guards against pending sprint correction previews as well as invalid draft inputs.

The new assertions still check that the established BL uses the saved snapshot, preview actuals flow to the chart, the Capacity balance panel appears, and Save Draft remains explicit and gated.

Validation of this patch against the 5.4.5c `App.tsx`, `ReleaseWorkspace.tsx` and 5.4.5b capacity panel: **14/14 targeted tests passed**. Then run your entire local suite and build:

```powershell
npm test
npm run build
```

This patch only fixes the 4 failures visible in your pasted error log; it does not guarantee additional failures elsewhere, and it does not replace an actual UI/behavior test.



# PSP Delivery Simulator — Iteration 5.4.6: Workspace Panel Reordering

## Purpose

This is a **layout-only change** based on the validated 5.4.5c ReleaseWorkspace implementation (including sprint editing and preview). No forecasting engine, repository, baseline model, event handler, or actual sprint logic is modified.

The new order in **Release Workspace** is:

1. Release configuration / historical inputs / future team capacity / BL establishment (unchanged)
2. Release metrics (unchanged)
3. Release burn-up chart
4. **Completed sprint history** (record, edit, preview, save and discard)
5. **PSP allocation and BL Delivery Outlook**, side by side in the existing `lower-grid`
6. Historical Productivity & Delivery Capacity (unchanged)

The displayed section numbers are adjusted: Actual delivery 02, PSP allocation 03, BL outlook 04.

## Apply

- **Replace** `src/ReleaseWorkspace.tsx` with this patch's file.
- **Add** `tests/workspace-panel-order.test.mjs`.
- Do not change `src/App.tsx` or any other file.

If you made additional local edits to ReleaseWorkspace after applying 5.4.5c, compare/diff before replacing this file; alternatively, move the `<section className="panel sprint-panel"> ... </section>` block from after `lower-grid` to immediately after the burn-up `</section>`, then adjust the three section labels.

## Validation

```powershell
npm test
npm run build
npm run dev
```

Four new focused layout/source-contract tests have passed with the patch. If the previous validated total was **245**, expected suite total is **249**. The full application build still requires local validation.

Visually verify that the Sprint History grid appears right under the burn-up, the PSP allocation and BL outlook remain side by side, and all sprint edit/preview/save controls still work. Confirm that forecast lines, history values and established BL remain unchanged.

## Suggested separate commit

```powershell
git add src/ReleaseWorkspace.tsx tests/workspace-panel-order.test.mjs
git commit -m "refactor(ui): place sprint actuals below release burn-up"
```

Next independent iteration: collapsible configuration panels.


# PSP Delivery Simulator — Iteration 5.4.7: BL Status Capacity Summary

## Scope
Move the existing headline **Realistic capacity** and **Capacity balance** indicators from the bottom Historical Productivity & Delivery Capacity panel into **Baseline status**. The lower panel retains historical statistics and the per-role future capacity breakdown.

- Draft BL uses the current valid draft historical productivity and SE/QA sprint members.
- Established BL uses its locked historical and team-capacity assumptions.
- 0 / 0 throughput displays **No delivery capacity**; missing historical rates display **Unavailable**, using the established summary service.
- Existing `summarizeReleaseCapacity` calculations are reused unchanged. No persistence, forecasts, or sprint editing changes.

## Apply
Replace the two source files from this ZIP in `C:\Projects\psp-delivery-simulator`:

- `src/ReleaseWorkspace.tsx` (based on the Iteration 5.4.6 patch)
- `src/components/ReleaseHistoricalCapacityView.tsx` (based on 5.4.5b)

Add `tests/bl-capacity-status-ui.test.mjs` and **replace** `tests/release-capacity-ui-contract.test.mjs` (the old assertion still expected the balance headline in the historical panel).

Because you now work within the parent `C:\Projects` Git repository, commit **only these three files** from its root; avoid `git add .` (which could stage local backups or patches).

## Test

```powershell
cd C:\Projects\psp-delivery-simulator
npm test
npm run build
npm run dev
```

Five new focused UI contract tests are supplied, plus the updated existing capacity panel contract test. Verify Draft inputs update the two indicators; established BL keeps them frozen; and the bottom panel no longer duplicates them.

## Commit (from Git repository root)

```powershell
cd C:\Projects
git add psp-delivery-simulator/src/ReleaseWorkspace.tsx psp-delivery-simulator/src/components/ReleaseHistoricalCapacityView.tsx psp-delivery-simulator/tests/bl-capacity-status-ui.test.mjs psp-delivery-simulator/tests/release-capacity-ui-contract.test.mjs
git commit -m "refactor(ui): move capacity summary into BL status"
```


# PSP Delivery Simulator — 5.4.8: Historical Data / Release Planning Tabs

## What changes
- Adds two tabs **inside the selected Release Workspace**: `Release Planning` (default) and `Historical Data`.
- Release Planning: release config, future team capacity, BL status/realistic capacity, burn-up, sprint actuals, PSP allocation, BL outlook, and detailed future SE/QA capacity.
- Historical Data: *that selected release's* editable historical delivered SP, historical SE/QA effective days and read-only historical productivity statistics.
- Keeps existing application-wide **Release Management / Release Workspace** navigation unchanged.
- Keeps both tab panels mounted and hides the inactive panel, retaining in-progress draft inputs while switching tabs.
- No changes to ReleaseRecord, stored values, forecasts, baselines, actuals, repository, or calculations. Establishment still freezes historical data. Historical data is never shared among releases.

## Files
Replace:
- `src/ReleaseWorkspace.tsx`
- `src/components/ReleaseHistoricalCapacityView.tsx`

Add:
- `tests/workspace-history-tabs.test.mjs`

Both source files start from the distributed **5.4.7** patch, so apply only on top of a validated 5.4.7 checkout. Review against any subsequent local edits before replacing.

## Check
```powershell
cd C:\Projects\psp-delivery-simulator
npm test
npm run build
npm run dev
```

Manual checks:
1. Open a Draft release: Release Planning is selected by default, containing the original planning controls, chart and sprint history.
2. Switch to Historical Data: historical input values and rates appear; future role breakdown is on Release Planning.
3. Edit historical days (commit on blur), switch back to planning, confirm forecast changed; **Save Draft** from Release Planning, reopen the release and confirm values persist.
4. Edit a historical input but don't save; switch tabs and confirm navigation warns about unsaved changes.
5. Open an Established BL: Historical Data is read-only and displays the release's frozen reference assumptions; its BL lines stay unchanged.
6. Open another release and confirm its historical values are independent of the first one.

For current **5.4.8**, historical data remains release-specific and only historical inputs are collected. Adding actual SE/QA effective days per sprint is reserved for **5.4.9**.

## Focused checks performed
- Five new tab-contract tests pass.
- 13 previously distributed 5.4.6/5.4.7 UI contract tests plus five new tests: **18/18 pass**.
- Both updated TSX files pass TypeScript transpilation syntax checks.
- The full app build/test suite cannot be executed in this package-only environment; run locally.

## Git
Your Git root is `C:\Projects`, so stage just this iteration's files:
```powershell
cd C:\Projects
git add psp-delivery-simulator/src/ReleaseWorkspace.tsx psp-delivery-simulator/src/components/ReleaseHistoricalCapacityView.tsx psp-delivery-simulator/tests/workspace-history-tabs.test.mjs
git commit -m "feat(ui): separate release planning and historical data tabs"
```

# PSP Delivery Simulator — Iteration 5.4.9: Actual SE/QA Effective Days

**Apply on top of validated 5.4.8.** This patch changes release persistence, so keep a copy of your release data before applying. The storage key and schema version remain `v1`; existing SP-only records are accepted without an automatic destructive rewrite.

## Behavior

- **New sprint:** Completed SP + actual SE effective days + actual QA effective days are required, non-negative (zero is valid); explicitly **Save Sprint**. Enter does not auto-save.
- **Existing sprint:** **Edit** any of the three fields -> **Apply Preview** -> **Save Changes** or **Discard Preview**. Editing does not alter release scope or established BL.
- **Old releases:** Stored `completedSprintPoints` is retained; missing SE/QA days display **Not recorded** rather than `0`. An existing sprint can be edited to backfill days. Empty effort edits on legacy rows preserve `null`.
- **Storage:** A single `sprintResults` array holds `{completedStoryPoints, seEffectiveDays, qaEffectiveDays}` objects for each sprint. The legacy `completedSprintPoints` array is kept as a validated SP-only mirror for the existing chart and older code. Repository rejects mismatched arrays; each edit writes one whole release record.
- **BL:** All three established BL forecast lines and historical/planned assumptions remain unchanged. Actual SP line uses only completedStoryPoints.
- **Out of scope:** Updated/reforecast lines, time-varying future capacity, productivity-analysis charts, and collapsible panels.

## Files

Replace:
- `src/models/ReleaseRecord.ts`
- `src/repositories/LocalStorageReleaseRepository.ts`
- `src/services/ReleaseWorkspaceOperations.ts`
- `src/App.tsx`
- `src/ReleaseWorkspace.tsx`
- `tests/actual-sprint-ui-contract.test.mjs` (updates outdated source-pattern test)
- `tests/edit-sprint-ui-contract.test.mjs` (updates outdated source-pattern test)

Add:
- `src/models/SprintResult.ts`
- `tests/sprint-results.test.mjs`
- `tests/sprint-results-storage.test.mjs`
- `tests/sprint-results-ui.test.mjs`

## Validate

```powershell
cd C:\Projects\psp-delivery-simulator
npm test
npm run build
npm run dev
```

Manual checks:
1. **Before editing**, export/back up browser localStorage for the simulator origin (especially if you have important test releases). Do not clear browser storage.
2. Open an existing release with SP-only sprints. All old completed SP values and charts should remain; SE/QA days should say **Not recorded**.
3. Edit an old sprint to add SE and QA days; **Apply Preview**, check numbers, then **Discard Preview**. Reopen to ensure no changes were persisted.
4. Edit again, **Save Changes**, switch releases and reopen; verify both effort values persist.
5. Record a new sprint with SP, SE and QA days, including zeros; confirm incremental completed SP and burn-up match prior behavior.
6. Enter a negative or blank new effort value; Save Sprint should be disabled. Pressing Enter in the SP field should not save.
7. In an Established BL release, record/edit a sprint and verify BL lines and frozen historical reference remain exactly unchanged.
8. Open another release and ensure sprint results are independent.

**Compatibility:** Existing source-pattern UI tests for actuals and edit-preview are updated by this patch because their variable-name assumptions are obsolete. Other tests remain unchanged.

## Testing completed in patch-only environment

- 6 model tests passed in a temporary Node TypeScript-extension compatibility copy.
- 3 repository compatibility/validation tests passed in a temporary copy.
- 3 new UI-contract tests passed.
- 9 updated legacy UI-contract tests passed.
- Six modified TypeScript/TSX source files passed TypeScript transpilation syntax checks.

The **full repository test suite and application build have not been executed** here; run both in your local checkout. No lockfile, dependencies, styles or forecast calculations are changed.

## Commit

From Git root (`C:\Projects`):

```powershell
git add psp-delivery-simulator/src psp-delivery-simulator/tests
git commit -m "feat: record actual SE and QA effective days per sprint"
```

# PSP Delivery Simulator — Iteration 5.4.10: Actual Sprint Capacity Balance

Apply on top of **validated 5.4.9**. This iteration is **presentation + pure derived calculation only**, no storage/model/forecast changes.

## Files

- Replace: `src/ReleaseWorkspace.tsx`
- Add: `src/services/sprintCapacityBalance.ts`
- Add: `tests/sprint-capacity-balance.test.mjs`
- Add: `tests/sprint-capacity-balance-ui.test.mjs`

> The workspace replacement is based on the distributed 5.4.9 patch. If you made local edits to `ReleaseWorkspace.tsx` after 5.4.9, inspect the diff before replacing. **The scope line is set to your chosen strong red `#DC2626`; check other locally edited styling before replacing.**

## Rules

For each recorded sprint, potential SE and QA throughput = recorded role effective days × (release historical delivered SP / historical effective days of that role). The label is SE limiting, QA limiting, Balanced, No delivery capacity when both potentials are zero, or Not available if historical ratios or actual effective days are missing. Small float differences (relative 1e-9) count as Balanced.

The label is an **estimated capacity balance**, not proof of the cause of the actual delivered SP. It is calculated from the selected release's historical reference (`established.historical` for Established BL). Edits/preview change the label before Save, without changing stored actuals or the established BL.

## Validation

```powershell
cd C:\Projects\psp-delivery-simulator
npm test
npm run build
npm run dev
```

Verify SE limiting, QA limiting, Balanced, No delivery capacity, and old SP-only sprints (Not available). Edit SE/QA effective days and Apply Preview, then Discard or Save. Reopen the release to check persistence; the established BL curves must remain unchanged.

## Git (from C:\Projects)

```powershell
git add psp-delivery-simulator/src/ReleaseWorkspace.tsx psp-delivery-simulator/src/services/sprintCapacityBalance.ts psp-delivery-simulator/tests/sprint-capacity-balance.test.mjs psp-delivery-simulator/tests/sprint-capacity-balance-ui.test.mjs
git commit -m "feat: show actual sprint capacity balance"
```



# PSP Delivery Simulator — Iteration 5.4.10: Actual Sprint Capacity Balance

Apply on top of **validated 5.4.9**. This iteration is **presentation + pure derived calculation only**, no storage/model/forecast changes.

## Files

- Replace: `src/ReleaseWorkspace.tsx`
- Add: `src/services/sprintCapacityBalance.ts`
- Add: `tests/sprint-capacity-balance.test.mjs`
- Add: `tests/sprint-capacity-balance-ui.test.mjs`

> The workspace replacement is based on the distributed 5.4.9 patch. If you made local edits to `ReleaseWorkspace.tsx` after 5.4.9, inspect the diff before replacing. **The scope line is set to your chosen strong red `#DC2626`; check other locally edited styling before replacing.**

## Rules

For each recorded sprint, potential SE and QA throughput = recorded role effective days × (release historical delivered SP / historical effective days of that role). The label is SE limiting, QA limiting, Balanced, No delivery capacity when both potentials are zero, or Not available if historical ratios or actual effective days are missing. Small float differences (relative 1e-9) count as Balanced.

The label is an **estimated capacity balance**, not proof of the cause of the actual delivered SP. It is calculated from the selected release's historical reference (`established.historical` for Established BL). Edits/preview change the label before Save, without changing stored actuals or the established BL.

## Validation

```powershell
cd C:\Projects\psp-delivery-simulator
npm test
npm run build
npm run dev
```

Verify SE limiting, QA limiting, Balanced, No delivery capacity, and old SP-only sprints (Not available). Edit SE/QA effective days and Apply Preview, then Discard or Save. Reopen the release to check persistence; the established BL curves must remain unchanged.

## Git (from C:\Projects)

```powershell
git add psp-delivery-simulator/src/ReleaseWorkspace.tsx psp-delivery-simulator/src/services/sprintCapacityBalance.ts psp-delivery-simulator/tests/sprint-capacity-balance.test.mjs psp-delivery-simulator/tests/sprint-capacity-balance-ui.test.mjs
git commit -m "feat: show actual sprint capacity balance"
```


# PSP Delivery Simulator — Iteration 5.4.11: Capacity Impact & Forecast Visibility

Based on the distributed and validated **5.4.10** workspace. This patch changes only the Release Workspace display: no persisted-data, forecast-engine, baseline, or sprint-result changes.

## Apply

From the ZIP, replace `src/ReleaseWorkspace.tsx` and add `tests/capacity-impact-ui.test.mjs` in the PSP project. Review diffs if you edited the workspace after 5.4.10.

## Behavior

- A compact **Capacity impact · Forecast visibility** summary appears directly below the editable future SE/QA members, and above BL Status.
- Shows SE and QA potential SP/sprint, forecasted realistic velocity, capacity balance, and expected realistic completion sprint.
- The completion sprint comes from `data.forecastFinishes.realistic` (the existing forecast calculation). The velocity and role potentials come from the established release capacity summary.
- **Draft BL:** values change after a valid field is committed by blur or Enter; the chart is driven by those same applied inputs. Changes still require Save Draft to persist.
- **Delta:** displayed realistic velocity compared to the saved/opened release team setup with the **same currently applied historical productivity**. This isolates future team changes; it is not a comparison against recorded sprint actuals or a revised forecast. After saving, this comparison is relative to the newly saved inputs when workspace state is refreshed. Pending invalid input leaves the previous valid results in place.
- **Established BL:** values use the locked snapshot. No draft delta is displayed.
- Zero realistic throughput shows *No delivery capacity*, unavailable ratios show *Not available*.
- Numeric entry remains unchanged. No sliders or duplicate burn-up chart.

## Validate

```powershell
cd C:\Projects\psp-delivery-simulator
npm test
npm run build
npm run dev
```

Suggested UI checks: change one QA member productivity from 100 to 50, leave the field, inspect QA potential and realistic velocity plus forecasted finish, then restore. Verify that SE-limited changes do not erroneously lower realistic velocity. Save/reopen Draft BL and check the reference delta. Verify Established BL remains read-only and its three forecast lines never change. Confirm an invalid numeric field holds the last valid capacity and shows validation feedback.

## Commit

```powershell
cd C:\Projects
git add psp-delivery-simulator/src/ReleaseWorkspace.tsx psp-delivery-simulator/tests/capacity-impact-ui.test.mjs
git commit -m "feat(ui): show capacity impact and forecast velocity near team inputs"
```

