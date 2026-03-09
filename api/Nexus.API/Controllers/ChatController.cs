using Microsoft.AspNetCore.Mvc;
using Nexus.Infrastructure.GoogleServices;

namespace Nexus.API.Controllers;

[ApiController]
[Route("api/chat")]
public class ChatController : ControllerBase
{
    private readonly ChatService _chat;

    public ChatController(ChatService chat) => _chat = chat;

    [HttpGet("spaces")]
    public async Task<IActionResult> GetSpaces()
    {
        try
        {
            var result = await _chat.GetSpacesAsync();
            if (result == null)
                return StatusCode(503, new { error = "Google credentials not configured." });
            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(502, new { error = $"Chat API error: {ex.Message}" });
        }
    }

    [HttpGet("spaces/{spaceName}/messages")]
    public async Task<IActionResult> GetMessages(string spaceName, [FromQuery] int maxResults = 10)
    {
        try
        {
            // Route captures "spaceName" but the full resource is "spaces/{spaceName}"
            var fullName = $"spaces/{spaceName}";
            var result = await _chat.GetRecentMessagesAsync(fullName, maxResults);
            if (result == null)
                return StatusCode(503, new { error = "Google credentials not configured." });
            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(502, new { error = $"Chat API error: {ex.Message}" });
        }
    }
}
