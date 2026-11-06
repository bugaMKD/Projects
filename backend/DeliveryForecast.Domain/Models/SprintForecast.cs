namespace DeliveryForecast.Domain.Models;
public sealed record SprintForecast(int SprintNumber, DateOnly SprintEndDate, double DeliveredPoints, double CumulativePoints, double RemainingPoints);
