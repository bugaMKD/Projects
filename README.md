# PSP Delivery Simulator — Iteration 4.3.3: Future SE/QA Capacity UI

## Files

- Replace `src/App.tsx` (based on 4.2.3 validated UI).
- Add `src/models/DraftSprintCapacityCommit.ts`.
- Add `tests/draft-sprint-capacity-commit.test.mjs`.

Prerequisites: 4.3.1 model (`DraftSprintCapacityInput.ts`) and 4.3.2 adapter (`getIntegratedMockData(draft,historical,sprintMembers)`) already installed. No changes to forecasting calculations or chart integration services.

## UI

A new section **Future SE/QA Capacity** follows **Historical Productivity**, before the metrics and burn-up chart. Supports multiple people of either role, adding/removing a person, editing names/roles, available days **per future sprint**, and productivity percentage 0–100. Current default is a synthetic SE with 10 days/100% and QA with 5 days/100%, preserving the previous baseline forecast values.

Typing numeric input or a name changes only the form; on **blur or Enter**, a fully valid team is committed and the chart, completion forecasts, delivery metrics, and variance table recalculate together. A role selection or add/remove action is immediate. Invalid inputs preserve the last valid team and show errors. If the last team member is removed, the empty form reports an error and the previous valid team remains in use. Zero capacity is allowed and should show Not forecastable (it is different from invalid input).

Actual completed sprint data and historical effective-day totals remain independent; no 'Establish Baseline' yet (planned 4.3.4). The four PSP allocation buckets are preserved untouched.

## Validate locally

```powershell
npm test
npm run build
npm run dev
```

Expected **109 tests** (101 + 8) if all prior tests are installed.

Visual checks: modify available days, verify chart unchanged while typing then updates when leaving; try 75% productivity; add SE and QA and observe role bottleneck; clear a field and confirm last valid chart remains; change capacity to zero and confirm Not forecastable; remove a member and check new forecast; confirm historical inputs, scope on blur, and actual SP stay independent.

This patch was tested with an isolated Node TypeScript fixture. The complete React app build must be verified in your own checkout.
