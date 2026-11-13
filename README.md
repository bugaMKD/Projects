# PSP Delivery Simulator — Iteration 4.1.1: Draft BL configuration model

## Apply

This patch adds two new files and **does not replace any existing files**:

- `src/models/DraftBaselineConfig.ts`
- `tests/draft-baseline-config.test.mjs`

Unzip into the root of the validated Iteration 3.4 project, preserving the folder structure.

## What's included

- Typed `DraftBaselineConfig`: release name, scope (SP), variation percentage.
- Factory defaults from existing `mockRelease` (Release Alpha, 240 SP, ±15%).
- Pure validation helpers to prevent invalid edits from reaching the calculation engine.
- Variation boundaries (0–30%) matching the agreed slider concept.
- No modification to original release inputs or actual sprint results.
- Seven tests covering defaults, independence, and invalid values.

## Important scope boundary

**4.1.1 is model-only.** The UI and chart must remain unchanged. Step **4.1.2** will connect draft state to the forecasting adapter, and **4.1.3** will add input controls and BL labels. In 4.1.3, use these validation helpers to prevent invalid form values from reaching the chart calculation.

No established baseline or persistence is introduced here; that is reserved for Iteration 4.3.

## Verify

`npm test`

`npm run build`

Expected total: **47** passing tests if all previous 40 tests are present. Only the uploaded four source files were available in this environment; full-project validation needs to run locally.
