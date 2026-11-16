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
