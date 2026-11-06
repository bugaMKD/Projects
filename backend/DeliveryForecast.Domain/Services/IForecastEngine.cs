using DeliveryForecast.Domain.Models;
namespace DeliveryForecast.Domain.Services;
public interface IForecastEngine { ForecastResponse Calculate(ForecastRequest request); }
