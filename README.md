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
