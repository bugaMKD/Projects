# PSP Delivery Simulator — starter v0.1

A small **React + TypeScript + Vite** starter for an engineering delivery simulator. It shows a release burn-up chart with **all three original forecast lines from Sprint 0**, actual delivered story points, a four-bucket capacity split, completion forecast summaries, and sprint history.

> **Important:** Forecast rates, sprint output, and capacity numbers are **mock data**. The app does not yet implement or validate the Excel PSP forecasting model. No backend, database, upload, or integration is included.

## Run on Windows / VS Code

1. Install a supported Node.js version (Node 20.19+ or 22.12+ for this toolchain) and VS Code if not already installed.
2. Extract the ZIP. Open the extracted `psp-delivery-simulator-starter` folder in VS Code.
3. Open **Terminal → New Terminal**, ensuring you are inside the folder containing `package.json`.
4. Run:

   ```powershell
   npm install
   npm run dev
   ```

5. Open the localhost address shown in the terminal (usually `http://localhost:5173/`).

If PowerShell blocks npm scripts again, open a **Command Prompt** terminal in VS Code or use `npm.cmd install` / `npm.cmd run dev`. Avoid changing security policy just to run this starter.

## Customize the sample

Open **`src/mockData.ts`**. Update:

- `scopeStoryPoints`: total release scope.
- `sprintCompletedPoints`: actual completed SP in every finished sprint, e.g. `[29,25,34,28,31]`.
- `originalForecast`: the three mock SP-per-sprint rates; they remain fixed across the entire release.
- `forecastSprintCount`: how many future sprints to chart (expanded automatically if the pessimistic line needs longer).
- `capacityBuckets`: four percentages that should add to 100.
- `capacity` and `historical`: informational placeholders for the real PSP engine to follow.

Save the file and Vite automatically refreshes the page.

## Files

```text
src/
  App.tsx       Dashboard, chart and summary UI
  mockData.ts   Static mock numbers + chart calculation
  styles.css   Layout and appearance
  main.tsx     React entry point
```

## What is plotted?

- **Release scope**: horizontal release target (fixed in the mock).
- **Optimistic, Realistic, Pessimistic**: all begin at Sprint 0, proceed at a constant mock throughput, and flatten at release scope. These represent the **original baseline** and never move when actuals change.
- **Actual delivered**: cumulative SP completed; ends at the latest finished sprint. The rest of the timeline is intentionally empty for actuals.

**Next enhancements:** replace mock forecast rates with validated PSP formulas from Excel, add editable sprint results and changes in scope, model actual vs planned team-days, and add a *separate* revised forecast without losing the original baseline.

## Production build

```bash
npm run build
npm run preview
```
