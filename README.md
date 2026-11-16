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
