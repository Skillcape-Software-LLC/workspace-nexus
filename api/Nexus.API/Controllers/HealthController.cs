using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Nexus.Infrastructure;
using Nexus.Infrastructure.Repositories;

namespace Nexus.API.Controllers;

[ApiController]
[Route("api/health")]
public class HealthController : ControllerBase
{
    private readonly NexusOptions _options;
    private readonly AppConfigRepository _config;

    public HealthController(IOptions<NexusOptions> options, AppConfigRepository config)
    {
        _options = options.Value;
        _config = config;
    }

    [HttpGet]
    public async Task<IActionResult> Get() => Ok(new
    {
        googleConnected    = await _config.GetAsync("google_token_nexus_user") != null,
        githubPat          = !string.IsNullOrEmpty(_options.GitHubPat),
        githubWebhookSecret= !string.IsNullOrEmpty(_options.GitHubWebhookSecret),
        claudeApiKey       = !string.IsNullOrEmpty(_options.ClaudeApiKey),
        apiKeyEnabled      = !string.IsNullOrEmpty(_options.ApiKey)
    });
}
