using Dapper;
using Microsoft.Data.Sqlite;
using Nexus.Core.Interfaces;
using Nexus.Core.Models;

namespace Nexus.Infrastructure.Repositories;

public class CiStatusRepository : ICiStatusRepository
{
    private readonly string _connectionString;

    public CiStatusRepository(string connectionString) =>
        _connectionString = connectionString;

    private SqliteConnection Connect() => new(_connectionString);

    public async Task<List<CiStatus>> GetAllAsync()
    {
        using var conn = Connect();
        var rows = await conn.QueryAsync<CiStatusRow>(
            "SELECT * FROM CiStatuses ORDER BY UpdatedAt DESC");
        return rows.Select(ToModel).ToList();
    }

    public async Task<CiStatus?> GetByRepoAsync(string repoFullName)
    {
        using var conn = Connect();
        var row = await conn.QuerySingleOrDefaultAsync<CiStatusRow>(
            "SELECT * FROM CiStatuses WHERE RepoFullName = @RepoFullName",
            new { RepoFullName = repoFullName });
        return row == null ? null : ToModel(row);
    }

    public async Task UpsertAsync(CiStatus status)
    {
        using var conn = Connect();
        await conn.ExecuteAsync(@"
            INSERT INTO CiStatuses (RepoFullName, Status, Branch, RunUrl, UpdatedAt, OpenPrCount, LastPushedAt, DefaultBranch, LastCommitMessage)
            VALUES (@RepoFullName, @Status, @Branch, @RunUrl, @UpdatedAt, @OpenPrCount, @LastPushedAt, @DefaultBranch, @LastCommitMessage)
            ON CONFLICT(RepoFullName) DO UPDATE SET
                Status            = excluded.Status,
                Branch            = excluded.Branch,
                RunUrl            = excluded.RunUrl,
                UpdatedAt         = excluded.UpdatedAt,
                OpenPrCount       = excluded.OpenPrCount,
                LastPushedAt      = excluded.LastPushedAt,
                DefaultBranch     = excluded.DefaultBranch,
                LastCommitMessage = excluded.LastCommitMessage",
            new
            {
                status.RepoFullName,
                Status = status.Status.ToString(),
                status.Branch,
                status.RunUrl,
                UpdatedAt = status.UpdatedAt.ToString("o"),
                status.OpenPrCount,
                LastPushedAt = status.LastPushedAt?.ToString("o"),
                status.DefaultBranch,
                status.LastCommitMessage
            });
    }

    private static CiStatus ToModel(CiStatusRow r) => new()
    {
        RepoFullName      = r.RepoFullName,
        Status            = Enum.TryParse<CiStatusValue>(r.Status, out var s) ? s : CiStatusValue.Unknown,
        Branch            = r.Branch,
        RunUrl            = r.RunUrl,
        UpdatedAt         = DateTime.Parse(r.UpdatedAt),
        OpenPrCount       = r.OpenPrCount,
        LastPushedAt      = r.LastPushedAt == null ? null : DateTime.Parse(r.LastPushedAt),
        DefaultBranch     = r.DefaultBranch,
        LastCommitMessage = r.LastCommitMessage
    };

    private class CiStatusRow
    {
        public string RepoFullName { get; set; } = "";
        public string Status { get; set; } = "Unknown";
        public string? Branch { get; set; }
        public string? RunUrl { get; set; }
        public string UpdatedAt { get; set; } = "";
        public int? OpenPrCount { get; set; }
        public string? LastPushedAt { get; set; }
        public string? DefaultBranch { get; set; }
        public string? LastCommitMessage { get; set; }
    }
}
