using DeliveryForecast.Domain.Services;
var builder=WebApplication.CreateBuilder(args);
builder.Services.AddControllers().AddJsonOptions(o => o.JsonSerializerOptions.PropertyNamingPolicy=System.Text.Json.JsonNamingPolicy.CamelCase);
builder.Services.AddEndpointsApiExplorer(); builder.Services.AddSwaggerGen();
builder.Services.AddSingleton<IForecastEngine,ForecastEngine>();
builder.Services.AddCors(o=>o.AddPolicy("ui",p=>p.WithOrigins("http://localhost:5173").AllowAnyHeader().AllowAnyMethod()));
var app=builder.Build();
app.UseSwagger(); app.UseSwaggerUI(); app.UseCors("ui"); app.MapControllers(); app.MapGet("/health",()=>Results.Ok(new{status="ok"})); app.Run();
