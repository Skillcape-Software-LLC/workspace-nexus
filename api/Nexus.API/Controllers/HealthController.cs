using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Nexus.Infrastructure;

namespace Nexus.API.Controllers;

[ApiController]
[Route("api/health")]
public class HealthController : ControllerBase
{
    private readonly NexusOptions _options;

    public HealthController(IOptions<NexusOptions> options) =>
        _options = options.Value;

    [HttpGet]
    public IActionResult Get() => Ok(new
    {
        googleCredentials  = !string.IsNullOrEmpty(_options.GoogleCredentialsPath)
                             && System.IO.File.Exists(_options.GoogleCredentialsPath),
        githubPat          = !string.IsNullOrEmpty(_options.GitHubPat),
        githubWebhookSecret= !string.IsNullOrEmpty(_options.GitHubWebhookSecret),
        claudeApiKey       = !string.IsNullOrEmpty(_options.ClaudeApiKey),
        apiKeyEnabled      = !string.IsNullOrEmpty(_options.ApiKey)
    });
}
