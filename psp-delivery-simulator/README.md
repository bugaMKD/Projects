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
