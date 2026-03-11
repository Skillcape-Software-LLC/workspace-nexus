using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Nexus.Core.Interfaces;

namespace Nexus.Infrastructure;

public class UptimeKumaPollingService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<UptimeKumaPollingService> _logger;
    private readonly int _intervalMinutes;

    public UptimeKumaPollingService(
        IServiceScopeFactory scopeFactory,
        IOptions<NexusOptions> options,
        ILogger<UptimeKumaPollingService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _intervalMinutes = options.Value.UptimeKumaPollingIntervalMinutes;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Uptime Kuma polling service started. Interval: {Mins} minutes.", _intervalMinutes);

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
        var svc = scope.ServiceProvider.GetRequiredService<UptimeKumaService>();
        var repo = scope.ServiceProvider.GetRequiredService<IUptimeKumaMonitorRepository>();

        if (!svc.IsConfigured)
        {
            _logger.LogDebug("Uptime Kuma not configured — skipping poll.");
            return;
        }

        try
        {
            var monitors = await svc.GetMonitorsAsync();

            _logger.LogInformation("Uptime Kuma poll: fetched {Count} monitors.", monitors.Count);

            foreach (var monitor in monitors)
                await repo.UpsertAsync(monitor);

            await repo.DeleteStaleAsync(monitors.Select(m => m.MonitorId));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Uptime Kuma poll failed.");
        }
    }
}
