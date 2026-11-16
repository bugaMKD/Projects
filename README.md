# PSP Delivery Simulator — Iteration 5.2: Release Repository & Browser Persistence

## Scope

A versioned storage repository for multiple releases. **No React/UI changes. No modifications to forecasting calculations.**

This patch requires the validated **Iteration 5.1** `src/models/ReleaseRecord.ts` and the Iteration 4 baseline model.

## Apply

Copy the new files into the corresponding locations in your project:

- `src/repositories/ReleaseRepository.ts`
- `src/repositories/LocalStorageReleaseRepository.ts`
- `tests/release-repository.test.mjs`

No existing source files need replacement and no npm dependencies are added.

## Contract

```typescript
const repository = createBrowserReleaseRepository(); // Only call in browser
repository.saveRelease(record); // create or update by stable ID
const all = repository.listReleases(); // newest updatedAt first
const record = repository.getRelease(id); // record or null
const deleted = repository.deleteRelease(id); // boolean
```

`ReleaseRepository` is the abstraction. `LocalStorageReleaseRepository` implements it using `localStorage` via an injectable `KeyValueStorage` interface, allowing Node tests and future server implementations. All data is stored as one versioned JSON collection under `psp-delivery-simulator:releases:v1`.

**Important: Manual Save Draft is a UI behavior, not an automatic storage event.** A draft must be explicitly passed to `saveRelease()` by a future Save Draft button. Similarly, the Establish Baseline action will explicitly call `saveRelease(establishedRecord)` in 5.4. Storage alone does not observe inputs.

**Baseline preservation:** Reloading an established release uses the serialized `establishedBaseline.forecast` snapshot; never re-run the forecasting engine to regenerate the established BL. The repository rejects updates that modify or remove an existing established baseline and also rejects changing the saved baseline's draft assumptions. It allows new completed sprint actuals without changing BL.

**Failure safety:** Corrupted JSON, unsupported schema versions, duplicate IDs and invalid release records produce `ReleaseStorageError` rather than silently clearing/reinitializing the collection. Browser storage read/write failures are surfaced to the caller. Existing unrelated localStorage keys are unaffected. The UI should show the error and let users decide what to do; do not clear storage automatically.

**Limitations:** localStorage is device/browser/origin-specific, is not synchronized across browser tabs or devices, and can be cleared by the browser/user. Export/import will be a later feature. The repository uses a single read-modify-write collection (suitable for the prototype; concurrent edits from two tabs require a future synchronization strategy). No screens or persistence are wired to the current React App yet.

## Verify

```powershell
npm test
npm run build
```

Expected **152 passing tests** if your existing total is 137 after Iteration 5.1; 15 tests are new here. Run the full build in your own checkout. The 15 new tests and 11 existing 5.1 tests passed in an isolated Node fixture, and a strict TypeScript check passed there.

## Next — 5.3 Release Management UI

- Two top-level tabs: **Release Management** (initial) and **Release Workspace** (existing simulator).
- List saved releases; New Release; Open Release; delete confirmation.
- Show an empty-state view when no releases exist.
- The Release Workspace is connected to the repository and Manual Save Draft / Establish BL in 5.4, with unsaved-change protection.
