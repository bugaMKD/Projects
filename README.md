# PSP Delivery Simulator — 5.4.5c compatibility fix for older UI contract tests

**Test-only change:** No application source code, forecast engine, storage, or chart logic is modified.

Replace these three existing tests:

- `tests/actual-sprint-ui-contract.test.mjs`
- `tests/release-capacity-ui-contract.test.mjs`
- `tests/workspace-ui-integration.test.mjs`

Why:
- 5.4.5c previews actual changes using `completedActuals = actualPreview ?? savedActuals`, so old source-pattern tests looking for direct `savedActuals` are outdated.
- 5.4.5b renamed `Limiting role` to `Capacity balance`.
- Save Draft now guards against pending sprint correction previews as well as invalid draft inputs.

The new assertions still check that the established BL uses the saved snapshot, preview actuals flow to the chart, the Capacity balance panel appears, and Save Draft remains explicit and gated.

Validation of this patch against the 5.4.5c `App.tsx`, `ReleaseWorkspace.tsx` and 5.4.5b capacity panel: **14/14 targeted tests passed**. Then run your entire local suite and build:

```powershell
npm test
npm run build
```

This patch only fixes the 4 failures visible in your pasted error log; it does not guarantee additional failures elsewhere, and it does not replace an actual UI/behavior test.
