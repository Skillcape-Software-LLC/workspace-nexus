using Microsoft.AspNetCore.Mvc;
using Nexus.Infrastructure.Repositories;

namespace Nexus.API.Controllers;

[ApiController]
[Route("api/config")]
public class ConfigController : ControllerBase
{
    private readonly AppConfigRepository _config;
    private const string DisplayNameKey = "DisplayName";

    public ConfigController(AppConfigRepository config) => _config = config;

    [HttpGet("display-name")]
    public async Task<IActionResult> GetDisplayName()
    {
        var value = await _config.GetAsync(DisplayNameKey) ?? "You";
        return Ok(new { value });
    }

    [HttpPut("display-name")]
    public async Task<IActionResult> SetDisplayName([FromBody] SetValueRequest request)
    {
        var name = request.Value?.Trim();
        if (string.IsNullOrEmpty(name))
            return BadRequest(new { error = "Display name cannot be empty." });

        await _config.SetAsync(DisplayNameKey, name);
        return Ok(new { value = name });
    }
}

public record SetValueRequest(string? Value);
