using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Nexus.Infrastructure;
using Nexus.Infrastructure.GoogleServices;
using Nexus.Infrastructure.Repositories;

namespace Nexus.API.Controllers;

[ApiController]
[Route("api/google/auth")]
public class GoogleAuthController : ControllerBase
{
    private readonly GoogleAuthService _auth;
    private readonly AppConfigRepository _config;
    private readonly NexusOptions _options;

    public GoogleAuthController(
        GoogleAuthService auth,
        AppConfigRepository config,
        IOptions<NexusOptions> options)
    {
        _auth = auth;
        _config = config;
        _options = options.Value;
    }

    [HttpGet("start")]
    public async Task<IActionResult> Start()
    {
        var state = Guid.NewGuid().ToString("N");
        await _config.SetAsync("google_oauth_state", state);
        var authUrl = _auth.GetAuthorizationUrl(state);
        return Ok(new { authUrl });
    }

    [HttpGet("callback")]
    public async Task<IActionResult> Callback([FromQuery] string code, [FromQuery] string state)
    {
        var storedState = await _config.GetAsync("google_oauth_state");
        if (string.IsNullOrEmpty(storedState) || storedState != state)
            return BadRequest("Invalid OAuth state.");

        await _config.DeleteAsync("google_oauth_state");

        try
        {
            await _auth.ExchangeCodeAsync(code);
        }
        catch (Exception ex)
        {
            return Redirect($"{_options.NexusFrontendUrl.TrimEnd('/')}/settings?google=error&message={Uri.EscapeDataString(ex.Message)}");
        }

        return Redirect($"{_options.NexusFrontendUrl.TrimEnd('/')}/settings?google=connected");
    }

    [HttpGet("status")]
    public async Task<IActionResult> Status()
    {
        var (connected, email) = await _auth.GetStatusAsync();
        return Ok(new { connected, email });
    }

    [HttpPost("disconnect")]
    public async Task<IActionResult> Disconnect()
    {
        await _auth.DisconnectAsync();
        return Ok(new { disconnected = true });
    }
}
