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

namespace Nexus.API.Controllers;

[ApiController]
[Route("api/github")]
public class GitHubController : ControllerBase
{
    private readonly ICiStatusRepository _ciRepo;
    private readonly IWatchedAccountRepository _watchedRepo;
    private readonly NexusOptions _options;

    public GitHubController(
        ICiStatusRepository ciRepo,
        IWatchedAccountRepository watchedRepo,
        IOptions<NexusOptions> options)
    {
        _ciRepo = ciRepo;
        _watchedRepo = watchedRepo;
        _options = options.Value;
    }

    // ── Webhook ───────────────────────────────────────────────────────────────

    [HttpPost("webhook")]
    public async Task<IActionResult> Webhook()
    {
        Request.EnableBuffering();
        var body = await new StreamReader(Request.Body).ReadToEndAsync();
        Request.Body.Position = 0;

        // Validate signature if secret is configured
        var secret = _options.GitHubWebhookSecret;
        if (!string.IsNullOrEmpty(secret))
        {
            var sig = Request.Headers["X-Hub-Signature-256"].ToString();
            if (!VerifySignature(body, secret, sig))
                return Unauthorized(new { error = "Invalid webhook signature." });
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

    // ── CI Status ─────────────────────────────────────────────────────────────

    [HttpGet("ci-status")]
    public async Task<IActionResult> GetAllCiStatuses()
    {
        var statuses = await _ciRepo.GetAllAsync();
        var accounts = await _watchedRepo.GetAllAsync();
        var watchedNames = new HashSet<string>(
            accounts.Select(a => a.AccountName), StringComparer.OrdinalIgnoreCase);

        var dtos = statuses.Select(s => ToDto(s, watchedNames)).ToList();
        return Ok(dtos);
    }

    [HttpGet("ci-status/{owner}/{repo}")]
    public async Task<IActionResult> GetCiStatus(string owner, string repo)
    {
        var status = await _ciRepo.GetByRepoAsync($"{owner}/{repo}");
        if (status == null) return NotFound();

        var accounts = await _watchedRepo.GetAllAsync();
        var watchedNames = new HashSet<string>(
            accounts.Select(a => a.AccountName), StringComparer.OrdinalIgnoreCase);

        return Ok(ToDto(status, watchedNames));
    }

    // ── Watched Accounts ──────────────────────────────────────────────────────

    [HttpGet("watched-accounts")]
    public async Task<IActionResult> GetWatchedAccounts()
    {
        var accounts = await _watchedRepo.GetAllAsync();
        return Ok(accounts.Select(a => new WatchedAccountDto
        {
            AccountName = a.AccountName,
            AccountType = a.AccountType.ToString().ToLowerInvariant(),
            AddedAt     = a.AddedAt
        }));
    }

    [HttpPost("watched-accounts")]
    public async Task<IActionResult> AddWatchedAccount([FromBody] AddWatchedAccountRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.AccountName))
            return BadRequest(new { error = "AccountName is required." });

        var existing = await _watchedRepo.GetByNameAsync(request.AccountName);
        if (existing != null)
            return Conflict(new { error = $"'{request.AccountName}' is already being watched." });

        var accountType = string.Equals(request.AccountType, "org", StringComparison.OrdinalIgnoreCase)
            ? GitHubAccountType.Org
            : GitHubAccountType.User;

        var account = new WatchedAccount
        {
            AccountName = request.AccountName.Trim(),
            AccountType = accountType,
            AddedAt     = DateTime.UtcNow
        };

        await _watchedRepo.AddAsync(account);
        return CreatedAtAction(nameof(GetWatchedAccounts), new WatchedAccountDto
        {
            AccountName = account.AccountName,
            AccountType = account.AccountType.ToString().ToLowerInvariant(),
            AddedAt     = account.AddedAt
        });
    }

    [HttpDelete("watched-accounts/{accountName}")]
    public async Task<IActionResult> DeleteWatchedAccount(string accountName)
    {
        var deleted = await _watchedRepo.DeleteAsync(accountName);
        return deleted ? NoContent() : NotFound();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static CiStatusDto ToDto(CiStatus s, HashSet<string> watchedAccountNames)
    {
        var owner = s.RepoFullName.Split('/').FirstOrDefault() ?? "";
        return new CiStatusDto
        {
            RepoFullName  = s.RepoFullName,
            Status        = s.Status.ToString(),
            Branch        = s.Branch,
            RunUrl        = s.RunUrl,
            UpdatedAt     = s.UpdatedAt,
            SourceAccount = watchedAccountNames.Contains(owner) ? owner : null
        };
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

    // Minimal webhook payload shapes
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
