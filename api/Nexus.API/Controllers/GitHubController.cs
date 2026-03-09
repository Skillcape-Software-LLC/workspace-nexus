using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Nexus.Core.DTOs;
using Nexus.Core.Interfaces;
using Nexus.Core.Models;
using Nexus.Infrastructure;
using Nexus.Infrastructure.Repositories;

namespace Nexus.API.Controllers;

[ApiController]
[Route("api/github")]
public class GitHubController : ControllerBase
{
    private readonly ICiStatusRepository _ciRepo;
    private readonly IWatchedRepoRepository _watchedRepo;
    private readonly NexusOptions _options;
    private readonly GitHubService _ghSvc;
    private readonly CiPollingService _poller;
    private readonly ILogger<GitHubController> _logger;
    private readonly AppConfigRepository _config;

    public GitHubController(
        ICiStatusRepository ciRepo,
        IWatchedRepoRepository watchedRepo,
        IOptions<NexusOptions> options,
        GitHubService ghSvc,
        CiPollingService poller,
        ILogger<GitHubController> logger,
        AppConfigRepository config)
    {
        _ciRepo = ciRepo;
        _watchedRepo = watchedRepo;
        _options = options.Value;
        _ghSvc = ghSvc;
        _poller = poller;
        _logger = logger;
        _config = config;
    }

    // ── OAuth ─────────────────────────────────────────────────────────────────

    [HttpGet("oauth/authorize")]
    public async Task<IActionResult> OAuthAuthorize()
    {
        if (!_ghSvc.CanOAuth)
            return BadRequest(new { error = "GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are not configured." });

        var state = Guid.NewGuid().ToString("N");
        await _config.SetAsync("github_oauth_state", state);
        var url = _ghSvc.GetAuthorizationUrl(state);
        return Ok(new { authUrl = url });
    }

    [HttpGet("oauth/callback")]
    public async Task<IActionResult> OAuthCallback([FromQuery] string? code, [FromQuery] string? error, [FromQuery] string? state)
    {
        var frontendBase = _options.NexusFrontendUrl.TrimEnd('/');

        if (!string.IsNullOrEmpty(error) || string.IsNullOrEmpty(code))
            return Redirect($"{frontendBase}/settings?github=error");

        var storedState = await _config.GetAsync("github_oauth_state");
        if (string.IsNullOrEmpty(storedState) || storedState != state)
            return Redirect($"{frontendBase}/settings?github=error");

        await _config.DeleteAsync("github_oauth_state");

        var login = await _ghSvc.ExchangeCodeAsync(code);
        if (login == null)
            return Redirect($"{frontendBase}/settings?github=error");

        return Redirect($"{frontendBase}/settings?github=connected");
    }

    [HttpGet("oauth/status")]
    public async Task<IActionResult> OAuthStatus()
    {
        var (connected, login) = await _ghSvc.GetStatusAsync();
        return Ok(new { connected, login });
    }

    [HttpPost("oauth/disconnect")]
    public async Task<IActionResult> OAuthDisconnect()
    {
        await _ghSvc.DisconnectAsync();
        return NoContent();
    }

    // ── Webhook ───────────────────────────────────────────────────────────────

    [HttpPost("webhook")]
    public async Task<IActionResult> Webhook()
    {
        Request.EnableBuffering();
        var body = await new StreamReader(Request.Body).ReadToEndAsync();
        Request.Body.Position = 0;

        var secret = _options.GitHubWebhookSecret;
        if (!string.IsNullOrEmpty(secret))
        {
            var sig = Request.Headers["X-Hub-Signature-256"].ToString();
            if (!VerifySignature(body, secret, sig))
                return Unauthorized(new { error = "Invalid webhook signature." });
        }
        else
        {
            _logger.LogWarning("GITHUB_WEBHOOK_SECRET is not set — webhook signature verification disabled.");
        }

        var eventType = Request.Headers["X-GitHub-Event"].ToString();
        if (eventType != "workflow_run")
            return Ok(new { message = $"Event '{eventType}' ignored." });

        var payload = JsonSerializer.Deserialize<WebhookPayload>(body,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        if (payload?.WorkflowRun == null)
            return BadRequest(new { error = "Invalid workflow_run payload." });

        var run = payload.WorkflowRun;
        var status = payload.Action switch
        {
            "in_progress" => CiStatusValue.Running,
            "completed"   => MapConclusion(run.Conclusion),
            _             => CiStatusValue.Unknown
        };

        await _ciRepo.UpsertAsync(new CiStatus
        {
            RepoFullName = run.Repository?.FullName ?? "",
            Status       = status,
            Branch       = run.HeadBranch,
            RunUrl       = run.HtmlUrl,
            UpdatedAt    = DateTime.UtcNow
        });

        return Ok();
    }

    // ── Force Sync ────────────────────────────────────────────────────────────

    [HttpPost("sync")]
    public async Task<IActionResult> ForceSync()
    {
        await _poller.PollNowAsync();
        return Ok(new { message = "Sync complete." });
    }

    // ── CI Status ─────────────────────────────────────────────────────────────

    [HttpGet("ci-status")]
    public async Task<IActionResult> GetAllCiStatuses()
    {
        var statuses = await _ciRepo.GetAllAsync();
        var dtos = statuses.Select(ToDto).ToList();
        return Ok(dtos);
    }

    [HttpGet("ci-status/{owner}/{repo}")]
    public async Task<IActionResult> GetCiStatus(string owner, string repo)
    {
        var status = await _ciRepo.GetByRepoAsync($"{owner}/{repo}");
        if (status == null) return NotFound();
        return Ok(ToDto(status));
    }

    // ── Watched Repos ─────────────────────────────────────────────────────────

    [HttpGet("watched-repos")]
    public async Task<IActionResult> GetWatchedRepos()
    {
        var repos = await _watchedRepo.GetAllAsync();
        return Ok(repos.Select(r => new WatchedRepoDto
        {
            RepoFullName = r.RepoFullName,
            AddedAt      = r.AddedAt
        }));
    }

    [HttpPost("watched-repos")]
    public async Task<IActionResult> AddWatchedRepo([FromBody] AddWatchedRepoRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.RepoUrl))
            return BadRequest(new { error = "RepoUrl is required." });

        var fullName = ParseRepoFullName(request.RepoUrl.Trim());
        if (fullName == null)
            return BadRequest(new { error = "Could not parse a GitHub repo from the provided URL. Expected format: https://github.com/owner/repo or owner/repo" });

        var existing = await _watchedRepo.GetByFullNameAsync(fullName);
        if (existing != null)
            return Conflict(new { error = $"'{fullName}' is already being watched." });

        var repo = new WatchedRepo { RepoFullName = fullName, AddedAt = DateTime.UtcNow };
        await _watchedRepo.AddAsync(repo);

        return CreatedAtAction(nameof(GetWatchedRepos), new WatchedRepoDto
        {
            RepoFullName = repo.RepoFullName,
            AddedAt      = repo.AddedAt
        });
    }

    [HttpDelete("watched-repos/{owner}/{repo}")]
    public async Task<IActionResult> DeleteWatchedRepo(string owner, string repo)
    {
        var deleted = await _watchedRepo.DeleteAsync($"{owner}/{repo}");
        return deleted ? NoContent() : NotFound();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static CiStatusDto ToDto(CiStatus s) => new()
    {
        RepoFullName      = s.RepoFullName,
        Status            = s.Status.ToString(),
        Branch            = s.Branch,
        RunUrl            = s.RunUrl,
        UpdatedAt         = s.UpdatedAt,
        OpenPrCount       = s.OpenPrCount,
        LastPushedAt      = s.LastPushedAt,
        DefaultBranch     = s.DefaultBranch,
        LastCommitMessage = s.LastCommitMessage
    };

    /// <summary>Parses "https://github.com/owner/repo" or "owner/repo" into "owner/repo".</summary>
    private static string? ParseRepoFullName(string input)
    {
        // Try full URL first
        if (Uri.TryCreate(input, UriKind.Absolute, out var uri) &&
            uri.Host.Equals("github.com", StringComparison.OrdinalIgnoreCase))
        {
            var segments = uri.AbsolutePath.Trim('/').Split('/');
            if (segments.Length >= 2 && !string.IsNullOrEmpty(segments[0]) && !string.IsNullOrEmpty(segments[1]))
                return $"{segments[0]}/{segments[1]}";
        }

        // Try owner/repo shorthand
        var parts = input.Split('/');
        if (parts.Length == 2 && parts.All(p => !string.IsNullOrWhiteSpace(p)))
            return input;

        return null;
    }

    private static CiStatusValue MapConclusion(string? conclusion) => conclusion switch
    {
        "success"    => CiStatusValue.Passing,
        "failure"    => CiStatusValue.Failing,
        "timed_out"  => CiStatusValue.Failing,
        "cancelled"  => CiStatusValue.Failing,
        _            => CiStatusValue.Unknown
    };

    private static bool VerifySignature(string body, string secret, string signature)
    {
        if (!signature.StartsWith("sha256=")) return false;
        var key = Encoding.UTF8.GetBytes(secret);
        var data = Encoding.UTF8.GetBytes(body);
        var hash = HMACSHA256.HashData(key, data);
        var expected = "sha256=" + Convert.ToHexString(hash).ToLowerInvariant();
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expected),
            Encoding.UTF8.GetBytes(signature));
    }

    private record WebhookPayload(
        [property: JsonPropertyName("action")] string? Action,
        [property: JsonPropertyName("workflow_run")] WorkflowRunPayload? WorkflowRun);

    private record WorkflowRunPayload(
        [property: JsonPropertyName("head_branch")] string? HeadBranch,
        [property: JsonPropertyName("html_url")] string? HtmlUrl,
        [property: JsonPropertyName("conclusion")] string? Conclusion,
        [property: JsonPropertyName("repository")] RepoPayload? Repository);

    private record RepoPayload(
        [property: JsonPropertyName("full_name")] string? FullName);
}
