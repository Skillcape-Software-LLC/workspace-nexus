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

        // Initial poll on startup
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

    private async Task PollAllAsync()
    {
        using var scope = _scopeFactory.CreateScope();
        var svc = scope.ServiceProvider.GetRequiredService<GitHubService>();
        var watchedRepo = scope.ServiceProvider.GetRequiredService<IWatchedAccountRepository>();
        var quickLinksRepo = scope.ServiceProvider.GetRequiredService<IQuickLinksRepository>();
        var ciRepo = scope.ServiceProvider.GetRequiredService<ICiStatusRepository>();

        if (!svc.IsConfigured)
        {
            _logger.LogDebug("GitHub PAT not configured — skipping CI poll.");
            return;
        }

        _logger.LogInformation("Starting CI poll.");
        int updated = 0;

        // 1. Poll all watched accounts
        var accounts = await watchedRepo.GetAllAsync();
        var coveredRepos = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var account in accounts)
        {
            var repos = await svc.GetReposForAccountAsync(account.AccountName, account.AccountType);
            foreach (var fullName in repos)
            {
                coveredRepos.Add(fullName);
                var parts = fullName.Split('/', 2);
                if (parts.Length != 2) continue;

                var status = await svc.GetLatestRunAsync(parts[0], parts[1]);
                if (status != null)
                {
                    await ciRepo.UpsertAsync(status);
                    updated++;
                }
            }
        }

        // 2. Poll individual IsRepo quick links not already covered by a watched account
        var allLinks = await quickLinksRepo.GetAllAsync();
        var repoLinks = allLinks.Where(l => l.IsRepo && !string.IsNullOrEmpty(l.RepoOwner) && !string.IsNullOrEmpty(l.RepoName));

        foreach (var link in repoLinks)
        {
            var fullName = $"{link.RepoOwner}/{link.RepoName}";
            if (coveredRepos.Contains(fullName)) continue;

            var status = await svc.GetLatestRunAsync(link.RepoOwner!, link.RepoName!);
            if (status != null)
            {
                await ciRepo.UpsertAsync(status);
                updated++;
            }
        }

        _logger.LogInformation("CI poll complete. Updated {Count} repos.", updated);
    }
}
