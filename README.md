# PSP Delivery Simulator — Iteration 5.1: Multi-Release Data Model

## Scope

Data model only. No React changes, browser storage, authentication, navigation or forecasting calculations are introduced in this step. This patch builds upon the validated Iteration 4.3.4 baseline model.

**Decisions:**
- **Release** is the primary entity. Each release has an ID, schema version, timestamps, committed draft inputs, incremental sprint actuals, and optional Established BL.
- A release begins with baseline status `draft`, and can transition once to `established`.
- **Save Draft is manual**: `saveDraftRelease(...)` is invoked only when the user chooses Save Draft (UI integration planned for 5.4).
- **Establish BL is an explicit action**: the established snapshot is supplied from the existing `establishBaseline()` method in 4.3.4a. In 5.4, the UI will save the current valid draft as part of establishing BL, then persist the result automatically.
- **Established BL is immutable**: preserve the previously calculated three forecast lines and completion sprints. Never derive saved BL data from a newer forecasting-engine version on load.
- **Actual delivery remains mutable independently**: `replaceReleaseActuals(...)` returns a new release record but carries over its stored baseline unchanged.
- **Schema version 1** is available for future storage/migrations and JSON export.

## Files to apply

Add the following to your existing application without replacing anything:

- `src/models/ReleaseRecord.ts`
- `tests/release-record.test.mjs`

Dependencies are existing files from Iteration 4:
`src/models/DraftBaselineConfig.ts`, `HistoricalData.ts`, `TeamMember.ts`, and `EstablishedBaseline.ts`.

## API

- `createDraftRelease(id, now, inputs, completedSprintPoints?)`
- `saveDraftRelease(draftRecord, now, committedInputs)`
- `establishRelease(draftRecord, now, establishedBaselineSnapshot)`
- `replaceReleaseActuals(record, now, completedSprintPoints)`
- `RELEASE_SCHEMA_VERSION`, `ReleaseCollectionV1`, `ReleaseRecord`, `ReleaseInputs` and discriminated `DraftReleaseRecord` / `EstablishedReleaseRecord` types.

The record ID and ISO timestamp are supplied by the caller, keeping models independent of browsers, UUID generators and persistence. `establishRelease` rejects snapshots based on inputs different from the saved draft. The UI should therefore apply and validate all edits, update the release's saved draft, and then establish its snapshot as one explicit user action.

## Validate

```powershell
npm test
npm run build
```

If your current 4.3.4b total is 126 tests, the new expected total is **137**. The 11 new tests passed in an isolated TypeScript fixture, and an isolated strict TypeScript compile passed. Verify the actual total and full Vite build in your checkout.

## Tests cover

Release identity and schema, independent releases, defensive data copying, explicit draft saving, immutable established BL snapshot, rejection of mismatched assumptions, independent actual delivery, actuals beyond BL horizon, invalid actuals/metadata, and JSON serialization.

## Next: Iteration 5.2

Introduce the `ReleaseRepository` interface and browser-local storage implementation with schema validation, malformed/legacy storage detection, and tests. Do not modify forecasting math.
