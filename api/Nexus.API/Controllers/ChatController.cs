using Microsoft.AspNetCore.Mvc;
using Nexus.Infrastructure.GoogleServices;

namespace Nexus.API.Controllers;

[ApiController]
[Route("api/chat")]
public class ChatController : ControllerBase
{
    private readonly ChatService _chat;
    private readonly ILogger<ChatController> _logger;

    public ChatController(ChatService chat, ILogger<ChatController> logger)
    {
        _chat = chat;
        _logger = logger;
    }

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
            _logger.LogError(ex, "Chat API error");
            return StatusCode(502, new { error = "Failed to reach Google Chat. Check server logs." });
        }
    }
}
