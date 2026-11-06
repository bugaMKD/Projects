# Delivery Forecast Simulator

A runnable MVP that provides solution structure, DTOs, an ASP.NET Core API, a React UI, and mock data. The current engine is intentionally simple so workbook formulas can be migrated incrementally.

## Prerequisites
- .NET 8 SDK
- Node.js 20 or newer

## Run locally
### API
```bash
cd backend/DeliveryForecast.Api
dotnet restore
dotnet run
```
API: http://localhost:5080, Swagger: http://localhost:5080/swagger

### UI
```bash
cd frontend
npm install
npm run dev
```
UI: http://localhost:5173

## Current forecast model
- Baseline capacity = capacity per sprint, or a team-derived fallback.
- Optimistic and conservative capacity adjustments create a delivery range.
- Sprint dates use calendar-day sprint length.
- QA ramp-up reduces effective delivery in early sprints.
- Non-working dates are skipped when determining sprint end dates.

## Workbook migration
Replace one rule at a time in `ForecastEngine.cs`. Add a regression test for each migrated rule using a known workbook input/output pair.
