using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Nexus.Core.Interfaces;

namespace Nexus.Infrastructure;

public class CiPollingService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<CiPollingService> _logger;
    private readonly int _intervalMinutes;

    public CiPollingService(
        IServiceScopeFactory scopeFactory,
        IOptions<NexusOptions> options,
        ILogger<CiPollingService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _intervalMinutes = options.Value.CiPollingIntervalMinutes;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("CI polling service started. Interval: {Mins} minutes.", _intervalMinutes);

        await PollAllAsync();

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(TimeSpan.FromMinutes(_intervalMinutes), stoppingToken);
                await PollAllAsync();
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }

    public async Task PollNowAsync() => await PollAllAsync();

    private async Task PollAllAsync()
    {
        using var scope = _scopeFactory.CreateScope();
        var svc = scope.ServiceProvider.GetRequiredService<GitHubService>();
        var watchedRepo = scope.ServiceProvider.GetRequiredService<IWatchedRepoRepository>();
        var ciRepo = scope.ServiceProvider.GetRequiredService<ICiStatusRepository>();

        if (!await svc.IsConfiguredAsync())
        {
            _logger.LogDebug("GitHub not configured — skipping CI poll.");
            return;
        }

        // Auto-discover repos from the OAuth token (user + any granted orgs)
        var accessible = await svc.GetAllAccessibleReposAsync();
        foreach (var discovered in accessible)
        {
            var existing = await watchedRepo.GetByFullNameAsync(discovered.FullName);
            if (existing == null)
            {
                await watchedRepo.AddAsync(new Nexus.Core.Models.WatchedRepo
                {
                    RepoFullName = discovered.FullName,
                    AddedAt = DateTime.UtcNow
                });
                _logger.LogInformation("Auto-discovered repo: {Repo}", discovered.FullName);
            }
        }

        var repos = await watchedRepo.GetAllAsync();
        if (repos.Count == 0)
        {
            _logger.LogDebug("No watched repos — skipping CI poll.");
            return;
        }

        _logger.LogInformation("Starting CI poll for {Count} repos.", repos.Count);
        int updated = 0;

        foreach (var watched in repos)
        {
            var parts = watched.RepoFullName.Split('/', 2);
            if (parts.Length != 2) continue;

            var (owner, repo) = (parts[0], parts[1]);

            var meta = await svc.GetRepoMetaAsync(owner, repo);
            var status = await svc.GetLatestRunAsync(owner, repo) ?? new Nexus.Core.Models.CiStatus
            {
                RepoFullName = watched.RepoFullName,
                Status       = Nexus.Core.Models.CiStatusValue.Unknown,
                UpdatedAt    = DateTime.UtcNow
            };

            status.OpenPrCount   = await svc.GetOpenPrCountAsync(owner, repo);
            status.LastPushedAt  = meta?.LastPushedAt?.UtcDateTime;
            status.DefaultBranch = meta.HasValue ? meta.Value.DefaultBranch : null;

            if (meta.HasValue && !string.IsNullOrEmpty(meta.Value.DefaultBranch))
                status.LastCommitMessage = await svc.GetLatestCommitMessageAsync(owner, repo, meta.Value.DefaultBranch);

            await ciRepo.UpsertAsync(status);
            updated++;
        }

        _logger.LogInformation("CI poll complete. Updated {Count} repos.", updated);
    }
}
