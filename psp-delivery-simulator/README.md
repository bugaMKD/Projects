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
