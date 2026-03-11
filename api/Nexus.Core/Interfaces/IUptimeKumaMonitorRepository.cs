using Nexus.Core.Models;

namespace Nexus.Core.Interfaces;

public interface IUptimeKumaMonitorRepository
{
    Task<List<UptimeKumaMonitor>> GetAllAsync();
    Task UpsertAsync(UptimeKumaMonitor monitor);
    Task DeleteStaleAsync(IEnumerable<int> activeMonitorIds);
}
