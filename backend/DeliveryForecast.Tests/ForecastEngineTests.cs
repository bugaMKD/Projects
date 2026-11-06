using DeliveryForecast.Domain.Models; using DeliveryForecast.Domain.Services;
namespace DeliveryForecast.Tests;
public sealed class ForecastEngineTests
{
 [Fact] public void Calculate_ReturnsAThreeDateRange()
 { var e=new ForecastEngine(); var r=e.Calculate(new("Test",new DateOnly(2026,1,1),100,20,14,0,.15,.15,5,2)); Assert.True(r.OptimisticDate<=r.ExpectedDate); Assert.True(r.ExpectedDate<=r.ConservativeDate); Assert.Equal(5,r.RequiredSprints); }
}
