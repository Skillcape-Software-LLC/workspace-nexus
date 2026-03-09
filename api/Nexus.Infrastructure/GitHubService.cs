using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Nexus.Core.Models;
using Octokit;

namespace Nexus.Infrastructure;

public class GitHubService
{
    private readonly NexusOptions _options;
    private readonly ILogger<GitHubService> _logger;
    private GitHubClient? _client;

    public GitHubService(IOptions<NexusOptions> options, ILogger<GitHubService> logger)
    {
        _options = options.Value;
        _logger = logger;

        if (!string.IsNullOrEmpty(_options.GitHubPat))
        {
            _client = new GitHubClient(new ProductHeaderValue("Nexus"))
            {
                Credentials = new Credentials(_options.GitHubPat)
            };
        }
        else
        {
            _logger.LogWarning("GITHUB_PAT not configured. GitHub metadata and polling disabled.");
        }
    }

    public bool IsConfigured => _client != null;

    /// <summary>Returns "owner/repo" strings for all repos under a user or org account.</summary>
    public async Task<List<string>> GetReposForAccountAsync(string accountName, GitHubAccountType type)
    {
        if (_client == null) return new();
        try
        {
            IReadOnlyList<Repository> repos = type == GitHubAccountType.Org
                ? await _client.Repository.GetAllForOrg(accountName)
                : await _client.Repository.GetAllForUser(accountName);

            return repos.Select(r => r.FullName).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Failed to list repos for account {Account}: {Message}", accountName, ex.Message);
            return new();
        }
    }

    /// <summary>Gets the latest workflow run status for a repo, or null if unavailable.</summary>
    public async Task<CiStatus?> GetLatestRunAsync(string owner, string repo)
    {
        if (_client == null) return null;
        try
        {
            var runs = await _client.Actions.Workflows.Runs.List(owner, repo,
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

    /// <summary>Gets basic repo metadata. Returns null if PAT not configured or repo not found.</summary>
    public async Task<(string DefaultBranch, DateTimeOffset? LastPushedAt, int OpenIssueCount)?> GetRepoMetaAsync(string owner, string repo)
    {
        if (_client == null) return null;
        try
        {
            var r = await _client.Repository.Get(owner, repo);
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
}
