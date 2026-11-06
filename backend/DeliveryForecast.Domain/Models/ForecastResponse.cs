namespace DeliveryForecast.Domain.Models;
public sealed record ForecastResponse(string ProjectName, DateOnly OptimisticDate, DateOnly ExpectedDate, DateOnly ConservativeDate, int RequiredSprints, double EffectiveCapacity, IReadOnlyList<SprintForecast> BurnupData);
