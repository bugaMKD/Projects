# PSP Delivery Simulator — 4.1.3 Draft BL UI

## Prerequisites

Apply and validate the earlier 4.1.1 and 4.1.2 patches first (54 tests passed in your local application). This patch is based on the **App.tsx** you uploaded before 4.1.1/4.1.2. It relies on `getInitialDraftBaselineConfig()` and `getIntegratedMockData(draft)` introduced in 4.1.2.

## Apply

Copy these files into the same paths in your existing project:

- **Replace** `src/App.tsx`
- **Add** `src/models/DraftBaselineInput.ts`
- **Add** `tests/draft-baseline-input.test.mjs`

No other file is overwritten. No new dependencies. The calculation services are unchanged.

## Functionality

- Editable release name; editing does not change calculations.
- Editable draft scope; changing it recalculates all three BL lines and completion sprints.
- Forecast variation slider, 0–30% in 5% increments (default 15%). Changing it affects BL Optimistic and BL Pessimistic, not BL Realistic.
- Existing historical inputs and per-sprint SE/QA capacity remain mocked (4.2 and 4.3 will make them editable).
- The chart, completion panel and actuals variance table use **one** calculated dataset.
- Labels consistently use Draft BL; chart starts at Start; original lines flatten at scope; actuals can continue past the pessimistic finish.
- All actual delivery SP are separate and unchanged by draft inputs.
- Blank/invalid release name or scope does not send an invalid draft into the forecast generator. Chart retains the last valid draft with a visible validation warning, and resumes updating when all fields are valid.
- Draft values are in component state only; reloading resets to defaults. No established/frozen baseline until 4.3.

## Validation

```powershell
npm test
npm run build
npm run dev
```

Expected **62 passing tests** if the 54 previously reported tests are present, plus a successful build.

Visual checks:
1. Default page still shows Release Alpha, 240 SP, ±15%, plus all existing sections.
2. Change release name: heading updates, forecast numbers do not.
3. Change scope to 100 SP: three BL lines and completion sprints shorten; actual SP history remains the same.
4. Change variation to ±20%: BL optimistic and pessimistic move; BL realistic stays the same.
5. Clear scope: validation message appears without chart error; restore scope and chart updates.
6. Use scope smaller than actual delivered and verify actuals remain visible and BL lines flatten at new scope.
7. Refresh browser: draft resets to default values (as designed for 4.1).

## Validation note

Eight new isolated input-validation tests were executed successfully and the utility passed an isolated TypeScript type-check. The full React application and all earlier tests are available only in your local project, so the full test/build results must be confirmed there.

Suggested commit: `feat: add editable draft BL release configuration UI`
