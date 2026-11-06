using DeliveryForecast.Domain.Models;
namespace DeliveryForecast.Domain.Services;

public sealed class ForecastEngine : IForecastEngine
{
 public ForecastResponse Calculate(ForecastRequest r)
 {
  Validate(r);
  var rawCapacity = r.CapacityPerSprint > 0 ? r.CapacityPerSprint : (r.Developers * 2.0 + r.QaEngineers * 1.5);
  var baselineCapacity = Math.Max(.1, rawCapacity * (r.ProductiveCapacityPercent / 100d));
  var optimisticCapacity = baselineCapacity * (1 + r.OptimisticAdjustment);
  var conservativeCapacity = baselineCapacity * Math.Max(.1, 1 - r.ConservativeAdjustment);
  var baseline = BuildProjection(r, baselineCapacity);
  var optimistic = BuildProjection(r, optimisticCapacity);
  var conservative = BuildProjection(r, conservativeCapacity);
  return new ForecastResponse(r.ProjectName, optimistic[^1].SprintEndDate, baseline[^1].SprintEndDate, conservative[^1].SprintEndDate, baseline.Count, Math.Round(baselineCapacity,2), baseline);
 }

 private static List<SprintForecast> BuildProjection(ForecastRequest r, double capacity)
 {
  var result = new List<SprintForecast>(); double remaining=r.TotalScopeSp, cumulative=0; var date=r.StartDate; int sprint=0;
  var excluded=(r.NonWorkingDates ?? Array.Empty<DateOnly>()).ToHashSet();
  while (remaining > .0001 && sprint < 500)
  {
   sprint++;
   var qaFactor = r.QaZeroSprint <= 0 || sprint > r.QaZeroSprint ? 1d : .85d;
   var delivered=Math.Min(remaining, capacity * qaFactor);
   remaining=Math.Max(0, remaining-delivered); cumulative+=delivered;
   date=AddCalendarDaysSkippingExceptions(date, r.SprintLengthDays, excluded);
   result.Add(new SprintForecast(sprint,date,Math.Round(delivered,2),Math.Round(cumulative,2),Math.Round(remaining,2)));
  }
  return result;
 }

 private static DateOnly AddCalendarDaysSkippingExceptions(DateOnly date, int days, HashSet<DateOnly> excluded)
 {
  var added=0; while(added<days){ date=date.AddDays(1); if(!excluded.Contains(date)) added++; } return date;
 }

 private static void Validate(ForecastRequest r)
 {
  if(string.IsNullOrWhiteSpace(r.ProjectName)) throw new ArgumentException("Project name is required.");
  if(r.TotalScopeSp<=0) throw new ArgumentException("Total scope must be greater than zero.");
  if(r.SprintLengthDays<=0) throw new ArgumentException("Sprint length must be greater than zero.");
  if(r.OptimisticAdjustment<0 || r.OptimisticAdjustment>1 || r.ConservativeAdjustment<0 || r.ConservativeAdjustment>1) throw new ArgumentException("Adjustments must be between 0 and 1.");
 }
}
