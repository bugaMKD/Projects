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
