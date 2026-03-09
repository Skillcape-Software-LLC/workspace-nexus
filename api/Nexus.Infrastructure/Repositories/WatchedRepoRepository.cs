using Dapper;
using Microsoft.Data.Sqlite;
using Nexus.Core.Interfaces;
using Nexus.Core.Models;

namespace Nexus.Infrastructure.Repositories;

public class WatchedRepoRepository : IWatchedRepoRepository
{
    private readonly string _connectionString;

    public WatchedRepoRepository(string connectionString) =>
        _connectionString = connectionString;

    private SqliteConnection Connect() => new(_connectionString);

    public async Task<List<WatchedRepo>> GetAllAsync()
    {
        using var conn = Connect();
        var rows = await conn.QueryAsync<WatchedRepoRow>(
            "SELECT * FROM WatchedRepos ORDER BY AddedAt");
        return rows.Select(ToModel).ToList();
    }

    public async Task<WatchedRepo?> GetByFullNameAsync(string repoFullName)
    {
        using var conn = Connect();
        var row = await conn.QuerySingleOrDefaultAsync<WatchedRepoRow>(
            "SELECT * FROM WatchedRepos WHERE RepoFullName = @RepoFullName",
            new { RepoFullName = repoFullName });
        return row == null ? null : ToModel(row);
    }

    public async Task AddAsync(WatchedRepo repo)
    {
        using var conn = Connect();
        await conn.ExecuteAsync(@"
            INSERT INTO WatchedRepos (RepoFullName, AddedAt)
            VALUES (@RepoFullName, @AddedAt)",
            new { repo.RepoFullName, AddedAt = repo.AddedAt.ToString("o") });
    }

    public async Task<bool> DeleteAsync(string repoFullName)
    {
        using var conn = Connect();
        var affected = await conn.ExecuteAsync(
            "DELETE FROM WatchedRepos WHERE RepoFullName = @RepoFullName",
            new { RepoFullName = repoFullName });
        return affected > 0;
    }

    private static WatchedRepo ToModel(WatchedRepoRow r) => new()
    {
        RepoFullName = r.RepoFullName,
        AddedAt = DateTime.Parse(r.AddedAt)
    };

    private class WatchedRepoRow
    {
        public string RepoFullName { get; set; } = "";
        public string AddedAt { get; set; } = "";
    }
}
