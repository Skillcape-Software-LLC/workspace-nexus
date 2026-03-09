using Microsoft.AspNetCore.Mvc;
using Nexus.Infrastructure.GoogleServices;

namespace Nexus.API.Controllers;

[ApiController]
[Route("api/gmail")]
public class GmailController : ControllerBase
{
    private readonly GmailService _gmail;
    private readonly ILogger<GmailController> _logger;

    public GmailController(GmailService gmail, ILogger<GmailController> logger)
    {
        _gmail = gmail;
        _logger = logger;
    }

    [HttpGet("inbox")]
    public async Task<IActionResult> GetInbox([FromQuery] int maxResults = 20)
    {
        maxResults = Math.Clamp(maxResults, 1, 100);
        try
        {
            var result = await _gmail.GetInboxAsync(maxResults);
            if (result == null)
                return StatusCode(503, new { error = "Google credentials not configured." });
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Gmail API error");
            return StatusCode(502, new { error = "Failed to reach Gmail. Check server logs." });
        }
    }

    [HttpGet("thread/{threadId}")]
    public async Task<IActionResult> GetThread(string threadId, [FromQuery] int maxMessages = 3)
    {
        maxMessages = Math.Clamp(maxMessages, 1, 50);
        try
        {
            var result = await _gmail.GetThreadAsync(threadId, maxMessages);
            if (result == null)
                return StatusCode(503, new { error = "Google credentials not configured." });
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Gmail API error");
            return StatusCode(502, new { error = "Failed to reach Gmail. Check server logs." });
        }
    }
}
