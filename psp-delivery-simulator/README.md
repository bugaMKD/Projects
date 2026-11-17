# PSP Delivery Simulator — Iteration 5.4.10: Actual Sprint Capacity Balance

Apply on top of **validated 5.4.9**. This iteration is **presentation + pure derived calculation only**, no storage/model/forecast changes.

## Files

- Replace: `src/ReleaseWorkspace.tsx`
- Add: `src/services/sprintCapacityBalance.ts`
- Add: `tests/sprint-capacity-balance.test.mjs`
- Add: `tests/sprint-capacity-balance-ui.test.mjs`

> The workspace replacement is based on the distributed 5.4.9 patch. If you made local edits to `ReleaseWorkspace.tsx` after 5.4.9, inspect the diff before replacing. **The scope line is set to your chosen strong red `#DC2626`; check other locally edited styling before replacing.**

## Rules

For each recorded sprint, potential SE and QA throughput = recorded role effective days × (release historical delivered SP / historical effective days of that role). The label is SE limiting, QA limiting, Balanced, No delivery capacity when both potentials are zero, or Not available if historical ratios or actual effective days are missing. Small float differences (relative 1e-9) count as Balanced.

The label is an **estimated capacity balance**, not proof of the cause of the actual delivered SP. It is calculated from the selected release's historical reference (`established.historical` for Established BL). Edits/preview change the label before Save, without changing stored actuals or the established BL.

## Validation

```powershell
cd C:\Projects\psp-delivery-simulator
npm test
npm run build
npm run dev
```

Verify SE limiting, QA limiting, Balanced, No delivery capacity, and old SP-only sprints (Not available). Edit SE/QA effective days and Apply Preview, then Discard or Save. Reopen the release to check persistence; the established BL curves must remain unchanged.

## Git (from C:\Projects)

```powershell
git add psp-delivery-simulator/src/ReleaseWorkspace.tsx psp-delivery-simulator/src/services/sprintCapacityBalance.ts psp-delivery-simulator/tests/sprint-capacity-balance.test.mjs psp-delivery-simulator/tests/sprint-capacity-balance-ui.test.mjs
git commit -m "feat: show actual sprint capacity balance"
```
