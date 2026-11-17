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
