# Iteration 4.3.4a — Established BL snapshot foundation

This is the first of two deliberately small stages for Iteration 4.3.4.

## Apply

Copy these **new** files into your existing validated 4.3.3 project:

- `src/models/EstablishedBaseline.ts`
- `src/services/establishedBaselineDataset.ts`
- `tests/established-baseline.test.mjs`

Do not replace `App.tsx` yet. The Establish Baseline button/locking UX will follow in **4.3.4b** after this data contract is validated. No changes to existing calculations.

## What the model guarantees

- Establishment copies and freezes the **committed release configuration**, historical productivity, team member capacity and **three forecast lines, completion sprint values and throughput**.
- The saved baseline does **not** contain actual delivered SP; actuals can be merged independently at any time.
- The baseline stays fixed even if the editable draft objects are later mutated.
- An active release can continue delivering **beyond the pessimistic baseline completion sprint**. Forecast lines stay flat at original scope while actuals progress.
- A mismatching release scope is rejected, and invalid actuals are rejected.
- This is an **in-memory** snapshot model; persistence between browser reloads is not yet implemented. We should resolve persistence alongside the UI in 4.3.4b rather than falsely present a reload-sensitive snapshot as durable.

## Validate

```
npm test
npm run build
```

Expected test count **118** (109 prior + 9 new) if the prior tests are all present.

The nine new tests were run successfully in a Node TypeScript test fixture, and an isolated TypeScript compile succeeded. The full project build still requires local verification.
