using DeliveryForecast.Domain.Models; using DeliveryForecast.Domain.Services; using Microsoft.AspNetCore.Mvc;
namespace DeliveryForecast.Api.Controllers;
[ApiController, Route("api/[controller]")] public sealed class ForecastController(IForecastEngine engine):ControllerBase
{
 [HttpPost] public ActionResult<ForecastResponse> Calculate([FromBody] ForecastRequest request)
 { try { return Ok(engine.Calculate(request)); } catch(ArgumentException ex){ return BadRequest(new{message=ex.Message}); } }
 [HttpGet("sample")] public ActionResult<ForecastRequest> Sample()=>Ok(new ForecastRequest("Sample delivery",DateOnly.FromDateTime(DateTime.Today),320,24,14,1,.15,.15,8,3,90));
}
