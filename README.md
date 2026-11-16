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
