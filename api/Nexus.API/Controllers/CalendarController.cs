using Microsoft.AspNetCore.Mvc;
using Nexus.Infrastructure.GoogleServices;

namespace Nexus.API.Controllers;

[ApiController]
[Route("api/calendar")]
public class CalendarController : ControllerBase
{
    private readonly CalendarService _calendar;

    public CalendarController(CalendarService calendar) => _calendar = calendar;

    [HttpGet("events")]
    public async Task<IActionResult> GetEvents([FromQuery] int days = 7)
    {
        try
        {
            var result = await _calendar.GetUpcomingEventsAsync(days);
            if (result == null)
                return StatusCode(503, new { error = "Google credentials not configured." });
            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(502, new { error = $"Calendar API error: {ex.Message}" });
        }
    }
}
