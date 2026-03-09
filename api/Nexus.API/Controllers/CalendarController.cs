using Microsoft.AspNetCore.Mvc;
using Nexus.Infrastructure.GoogleServices;

namespace Nexus.API.Controllers;

[ApiController]
[Route("api/calendar")]
public class CalendarController : ControllerBase
{
    private readonly CalendarService _calendar;
    private readonly ILogger<CalendarController> _logger;

    public CalendarController(CalendarService calendar, ILogger<CalendarController> logger)
    {
        _calendar = calendar;
        _logger = logger;
    }

    [HttpGet("events")]
    public async Task<IActionResult> GetEvents([FromQuery] int days = 7)
    {
        days = Math.Clamp(days, 1, 90);
        try
        {
            var result = await _calendar.GetUpcomingEventsAsync(days);
            if (result == null)
                return StatusCode(503, new { error = "Google credentials not configured." });
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Calendar API error");
            return StatusCode(502, new { error = "Failed to reach Google Calendar. Check server logs." });
        }
    }
}
