# PSP Delivery Simulator — Iteration 5.4.3: Release-Specific Historical Productivity & Capacity

This patch builds on **the validated 5.4.2 workspace**. It replaces the old static bottom `HistoricalCapacityView` rendering with an explicitly release-aware, read-only panel. Forecast calculations and persistence remain untouched.

## Apply

Copy files into the corresponding project paths:

1. **Replace** `src/ReleaseWorkspace.tsx`.
2. **Add** `src/components/ReleaseHistoricalCapacityView.tsx`.
3. **Add** `src/services/releaseCapacitySummary.ts`.
4. **Add** `tests/release-capacity-summary.test.mjs`.
5. **Add** `tests/release-capacity-ui-contract.test.mjs`.

Do **not** delete `src/components/HistoricalCapacityView.tsx` yet; it may be used elsewhere. The new workspace no longer renders it. No `App.tsx`, repository, release record, or forecasting engine files are modified.

## Behavior

- The bottom Historical Productivity & Delivery Capacity panel now reflects the **selected release** rather than illustrative mock capacity.
- For Draft BL, it shows **committed** historical productivity and future SE/QA capacity. The panel updates when valid input is applied on blur/Enter, not while partially typing.
- For Established BL, it reads the **frozen snapshot** (`established.historical` and `established.sprintMembers`). Reopening an established release keeps its original assumptions.
- Displays historical total delivered SP, total historical SE/QA effective days, historical delivered SP per effective role day, planned available and effective person-days **per future sprint**, potential role throughput, combined realistic throughput, and limiting role (SE, QA, or both).
- Future effective days per role = sum of member available days per sprint × member productivity. Potential SP per role = historical SP / historical effective role days × future effective days per sprint. The bottleneck is the role with lower potential, precisely as the previously validated forecast engine does.
- The panel is read-only. The configuration panels remain the only editing surface.
- No mock data are read by the new panel, and no changes are made to the forecast engine. If historical effective days are unavailable/zero, the summary shows N/A rather than dividing by zero.

## Validate

```powershell
npm test
npm run build
npm run dev
```

**14 new tests**, so if 5.4.2 ended with 182 tests, expect **196 tests**. The 14 tests passed locally in an isolated Node fixture, and the standalone summary service passed a strict TypeScript check. The full React build must still be run in your checkout.

### Manual checks

1. Create a release. Default historical totals should be 100 delivered SP, 100 historical SE effective days, and 50 historical QA effective days (only if you retain the previously agreed defaults).
2. Modify Historical delivered SP or historical role days; after blur, confirm the bottom panel changes along with the forecast.
3. Modify a SE or QA member's available days and productivity; verify the future **effective days / sprint**, role potential, and bottleneck reflect the changes.
4. Add multiple members of a role, and confirm their contributions are aggregated. Set one role to zero effective days and verify throughput is zero.
5. Save Draft; navigate away and reopen. The bottom panel should show that particular release's saved inputs.
6. Establish BL; reopen from Release Management. The panel should show its frozen original assumptions, and established BL lines must remain unchanged.
7. Open a second release with different inputs and confirm there is no carryover from the first.
8. Confirm the **PSP allocation** panel remains unchanged (its original buckets are still mock placeholders; replacing them is out of scope).

The actual sprint entry UI remains a separate upcoming step.
