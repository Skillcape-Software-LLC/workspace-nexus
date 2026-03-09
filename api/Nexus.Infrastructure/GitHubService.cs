using System.Net.Http.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Nexus.Core.Models;
using Nexus.Infrastructure.Repositories;
using Octokit;

namespace Nexus.Infrastructure;

public class GitHubService
{
    private readonly NexusOptions _options;
    private readonly ILogger<GitHubService> _logger;
    private readonly AppConfigRepository _config;

    public GitHubService(IOptions<NexusOptions> options, ILogger<GitHubService> logger, string connectionString)
    {
        _options = options.Value;
        _logger = logger;
        _config = new AppConfigRepository(connectionString);
    }

    // ── OAuth ─────────────────────────────────────────────────────────────────

    public bool CanOAuth =>
        !string.IsNullOrEmpty(_options.GitHubClientId) &&
        !string.IsNullOrEmpty(_options.GitHubClientSecret);

    public string GetAuthorizationUrl(string state)
    {
        var redirectUri = Uri.EscapeDataString(
            $"{_options.NexusBaseUrl.TrimEnd('/')}/api/github/oauth/callback");
        return $"https://github.com/login/oauth/authorize" +
               $"?client_id={_options.GitHubClientId}" +
               $"&redirect_uri={redirectUri}" +
               $"&scope=repo%20read%3Aorg" +
               $"&state={state}";
    }

    public async Task<string?> ExchangeCodeAsync(string code)
    {
        using var http = new HttpClient();
        http.DefaultRequestHeaders.Accept.ParseAdd("application/json");
        http.DefaultRequestHeaders.UserAgent.ParseAdd("Nexus");

        var resp = await http.PostAsJsonAsync(
            "https://github.com/login/oauth/access_token",
            new
            {
                client_id = _options.GitHubClientId,
                client_secret = _options.GitHubClientSecret,
                code
            });

        var result = await resp.Content.ReadFromJsonAsync<GitHubTokenResponse>();
        if (string.IsNullOrEmpty(result?.AccessToken))
        {
            _logger.LogWarning("GitHub OAuth token exchange failed: {Error}", result?.Error);
            return null;
        }

        await _config.SetAsync("github_access_token", result.AccessToken);

        // Fetch and cache the login name
        try
        {
            var client = BuildClient(result.AccessToken);
            var user = await client.User.Current();
            await _config.SetAsync("github_login", user.Login);
            return user.Login;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not fetch GitHub user after token exchange.");
            return null;
        }
    }

    public async Task<(bool Connected, string? Login)> GetStatusAsync()
    {
        var token = await _config.GetAsync("github_access_token");
        if (string.IsNullOrEmpty(token)) return (false, null);
        var login = await _config.GetAsync("github_login");
        return (true, login);
    }

    public async Task DisconnectAsync()
    {
        var token = await _config.GetAsync("github_access_token");

        if (!string.IsNullOrEmpty(token) && CanOAuth)
        {
            try
            {
                using var http = new HttpClient();
                var credentials = Convert.ToBase64String(
                    System.Text.Encoding.UTF8.GetBytes($"{_options.GitHubClientId}:{_options.GitHubClientSecret}"));
                http.DefaultRequestHeaders.Authorization =
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", credentials);
                http.DefaultRequestHeaders.Accept.ParseAdd("application/vnd.github+json");
                http.DefaultRequestHeaders.UserAgent.ParseAdd("Nexus");

                var req = new HttpRequestMessage(HttpMethod.Delete,
                    $"https://api.github.com/applications/{_options.GitHubClientId}/token")
                {
                    Content = JsonContent.Create(new { access_token = token })
                };
                await http.SendAsync(req);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to revoke GitHub token — proceeding with local disconnect.");
            }
        }

        await _config.DeleteAsync("github_access_token");
        await _config.DeleteAsync("github_login");
    }

    // ── Client ────────────────────────────────────────────────────────────────

    public async Task<bool> IsConfiguredAsync()
    {
        var token = await _config.GetAsync("github_access_token");
        return !string.IsNullOrEmpty(token) || !string.IsNullOrEmpty(_options.GitHubPat);
    }

    private async Task<GitHubClient?> GetClientAsync()
    {
        var token = await _config.GetAsync("github_access_token");
        if (!string.IsNullOrEmpty(token))
            return BuildClient(token);

        if (!string.IsNullOrEmpty(_options.GitHubPat))
            return BuildClient(_options.GitHubPat);

        return null;
    }

    private static GitHubClient BuildClient(string token) =>
        new(new ProductHeaderValue("Nexus")) { Credentials = new Credentials(token) };

    // ── API Methods ───────────────────────────────────────────────────────────

    public record RepoInfo(string FullName, DateTimeOffset? PushedAt);

    /// <summary>
    /// Returns all repos accessible to the current OAuth token — includes the authed user's repos
    /// and repos in any organizations where the OAuth app has been granted access.
    /// </summary>
    public async Task<List<RepoInfo>> GetAllAccessibleReposAsync()
    {
        var client = await GetClientAsync();
        if (client == null) return new();
        try
        {
            var repos = await client.Repository.GetAllForCurrent(
                new RepositoryRequest { Type = RepositoryType.All },
                new ApiOptions { PageSize = 100 });

            return repos.Select(r => new RepoInfo(r.FullName, r.PushedAt)).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Failed to list accessible repos: {Message}", ex.Message);
            return new();
        }
    }

    /// <summary>Returns the number of open pull requests for a repo, or null if unavailable.</summary>
    public async Task<int?> GetOpenPrCountAsync(string owner, string repo)
    {
        var client = await GetClientAsync();
        if (client == null) return null;
        try
        {
            var prs = await client.PullRequest.GetAllForRepository(owner, repo,
                new PullRequestRequest { State = ItemStateFilter.Open },
                new ApiOptions { PageSize = 100, PageCount = 1 });
            return prs.Count;
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Failed to get PR count for {Owner}/{Repo}: {Message}", owner, repo, ex.Message);
            return null;
        }
    }

    /// <summary>Gets the latest workflow run status for a repo, or null if unavailable.</summary>
    public async Task<CiStatus?> GetLatestRunAsync(string owner, string repo)
    {
        var client = await GetClientAsync();
        if (client == null) return null;
        try
        {
            var runs = await client.Actions.Workflows.Runs.List(owner, repo,
                new WorkflowRunsRequest(),
                new ApiOptions { PageSize = 1, PageCount = 1 });

            var run = runs.WorkflowRuns.FirstOrDefault();
            if (run == null) return null;

            var status = MapConclusion(run.Conclusion?.StringValue, run.Status.StringValue);

            return new CiStatus
            {
                RepoFullName = $"{owner}/{repo}",
                Status = status,
                Branch = run.HeadBranch,
                RunUrl = run.HtmlUrl,
                UpdatedAt = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Failed to get CI status for {Owner}/{Repo}: {Message}", owner, repo, ex.Message);
            return null;
        }
    }

    /// <summary>Returns the first line of the latest commit message on a branch, or null if unavailable.</summary>
    public async Task<string?> GetLatestCommitMessageAsync(string owner, string repo, string branch)
    {
        var client = await GetClientAsync();
        if (client == null) return null;
        try
        {
            var commits = await client.Repository.Commit.GetAll(owner, repo,
                new CommitRequest { Sha = branch },
                new ApiOptions { PageSize = 1, PageCount = 1 });

            var message = commits.FirstOrDefault()?.Commit?.Message;
            if (string.IsNullOrWhiteSpace(message)) return null;

            // Return only the subject line (first line, trimmed, max 120 chars)
            var subject = message.Split('\n')[0].Trim();
            return subject.Length > 120 ? subject[..117] + "…" : subject;
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Failed to get latest commit for {Owner}/{Repo}@{Branch}: {Message}", owner, repo, branch, ex.Message);
            return null;
        }
    }

    /// <summary>Gets basic repo metadata. Returns null if not configured or repo not found.</summary>
    public async Task<(string DefaultBranch, DateTimeOffset? LastPushedAt, int OpenIssueCount)?> GetRepoMetaAsync(string owner, string repo)
    {
        var client = await GetClientAsync();
        if (client == null) return null;
        try
        {
            var r = await client.Repository.Get(owner, repo);
            return (r.DefaultBranch, r.PushedAt, r.OpenIssuesCount);
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Failed to get metadata for {Owner}/{Repo}: {Message}", owner, repo, ex.Message);
            return null;
        }
    }

    private static CiStatusValue MapConclusion(string? conclusion, string? status)
    {
        if (status == "in_progress" || status == "queued" || status == "waiting") return CiStatusValue.Running;
        return conclusion switch
        {
            "success"    => CiStatusValue.Passing,
            "failure"    => CiStatusValue.Failing,
            "timed_out"  => CiStatusValue.Failing,
            "cancelled"  => CiStatusValue.Failing,
            _            => CiStatusValue.Unknown
        };
    }

    // ── Token response shape ──────────────────────────────────────────────────

    private record GitHubTokenResponse(
        [property: System.Text.Json.Serialization.JsonPropertyName("access_token")] string? AccessToken,
        [property: System.Text.Json.Serialization.JsonPropertyName("error")] string? Error,
        [property: System.Text.Json.Serialization.JsonPropertyName("scope")] string? Scope);
}
