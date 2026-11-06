namespace DeliveryForecast.Domain.Models;

public sealed record ForecastRequest(
 string ProjectName, DateOnly StartDate, double TotalScopeSp, double CapacityPerSprint,
 int SprintLengthDays, int QaZeroSprint, double OptimisticAdjustment,
 double ConservativeAdjustment, int Developers, int QaEngineers,
 double ProductiveCapacityPercent = 100, IReadOnlyList<DateOnly>? NonWorkingDates = null);
