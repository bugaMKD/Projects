namespace DeliveryForecast.Domain.Models;
public sealed record HistoricalMetrics(double SeCapacity, double QaCapacity, double AvgVelocity, double OptimisticVariance, double ConservativeVariance, double Contingency);
