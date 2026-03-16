using Dapper;
using Microsoft.Data.Sqlite;
using Nexus.Core.Interfaces;
using Nexus.Core.Models;

namespace Nexus.Infrastructure.Repositories;

public class UptimeKumaMonitorRepository : IUptimeKumaMonitorRepository
{
    private readonly string _connectionString;

    public UptimeKumaMonitorRepository(string connectionString) =>
        _connectionString = connectionString;

    private SqliteConnection Connect() => new(_connectionString);

    public async Task<List<UptimeKumaMonitor>> GetAllAsync()
    {
        using var conn = Connect();
        var rows = await conn.QueryAsync<MonitorRow>(
            "SELECT * FROM UptimeKumaMonitors ORDER BY Name");
        return rows.Select(ToModel).ToList();
    }

    public async Task UpsertAsync(UptimeKumaMonitor monitor)
    {
        using var conn = Connect();
        await conn.ExecuteAsync(@"
            INSERT INTO UptimeKumaMonitors (MonitorId, Name, Url, Type, Active, Status, ResponseTimeMs, CertDaysRemaining, CertIsValid, Tags, UpdatedAt)
            VALUES (@MonitorId, @Name, @Url, @Type, @Active, @Status, @ResponseTimeMs, @CertDaysRemaining, @CertIsValid, @Tags, @UpdatedAt)
            ON CONFLICT(MonitorId) DO UPDATE SET
                Name              = excluded.Name,
                Url               = excluded.Url,
                Type              = excluded.Type,
                Active            = excluded.Active,
                Status            = excluded.Status,
                ResponseTimeMs    = excluded.ResponseTimeMs,
                CertDaysRemaining = excluded.CertDaysRemaining,
                CertIsValid       = excluded.CertIsValid,
                Tags              = excluded.Tags,
                UpdatedAt         = excluded.UpdatedAt",
            new
            {
                monitor.MonitorId,
                monitor.Name,
                monitor.Url,
                monitor.Type,
                Active = monitor.Active ? 1 : 0,
                Status = monitor.Status.ToString(),
                monitor.ResponseTimeMs,
                monitor.CertDaysRemaining,
                CertIsValid = monitor.CertIsValid.HasValue ? (int?)(monitor.CertIsValid.Value ? 1 : 0) : null,
                monitor.Tags,
                UpdatedAt = monitor.UpdatedAt.ToString("o")
            });
    }

    public async Task DeleteStaleAsync(IEnumerable<int> activeMonitorIds)
    {
        var ids = activeMonitorIds.ToList();
        if (ids.Count == 0)
        {
            using var conn = Connect();
            await conn.ExecuteAsync("DELETE FROM UptimeKumaMonitors");
            return;
        }

        using var conn2 = Connect();
        await conn2.ExecuteAsync(
            $"DELETE FROM UptimeKumaMonitors WHERE MonitorId NOT IN ({string.Join(",", ids)})");
    }

    private static UptimeKumaMonitor ToModel(MonitorRow r) => new()
    {
        MonitorId         = r.MonitorId,
        Name              = r.Name,
        Url               = r.Url,
        Type              = r.Type,
        Active            = r.Active == 1,
        Status            = Enum.TryParse<MonitorStatusValue>(r.Status, out var s) ? s : MonitorStatusValue.Unknown,
        ResponseTimeMs    = r.ResponseTimeMs,
        CertDaysRemaining = r.CertDaysRemaining,
        CertIsValid       = r.CertIsValid.HasValue ? r.CertIsValid.Value == 1 : null,
        Tags              = r.Tags,
        UpdatedAt         = DateTime.Parse(r.UpdatedAt)
    };

    private class MonitorRow
    {
        public int MonitorId { get; set; }
        public string Name { get; set; } = "";
        public string? Url { get; set; }
        public string Type { get; set; } = "";
        public int Active { get; set; }
        public string Status { get; set; } = "Unknown";
        public int ResponseTimeMs { get; set; } = -1;
        public int? CertDaysRemaining { get; set; }
        public int? CertIsValid { get; set; }
        public string Tags { get; set; } = "[]";
        public string UpdatedAt { get; set; } = "";
    }
}
