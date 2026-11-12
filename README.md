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
