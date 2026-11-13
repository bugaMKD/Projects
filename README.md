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
