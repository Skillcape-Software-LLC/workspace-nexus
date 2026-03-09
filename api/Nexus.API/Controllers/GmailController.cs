using Microsoft.AspNetCore.Mvc;
using Nexus.Infrastructure.GoogleServices;

namespace Nexus.API.Controllers;

[ApiController]
[Route("api/gmail")]
public class GmailController : ControllerBase
{
    private readonly GmailService _gmail;

    public GmailController(GmailService gmail) => _gmail = gmail;

    [HttpGet("inbox")]
    public async Task<IActionResult> GetInbox([FromQuery] int maxResults = 20)
    {
        try
        {
            var result = await _gmail.GetInboxAsync(maxResults);
            if (result == null)
                return StatusCode(503, new { error = "Google credentials not configured." });
            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(502, new { error = $"Gmail API error: {ex.Message}" });
        }
    }
}
