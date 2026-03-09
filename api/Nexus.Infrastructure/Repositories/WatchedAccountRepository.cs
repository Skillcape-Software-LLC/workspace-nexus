using Dapper;
using Microsoft.Data.Sqlite;
using Nexus.Core.Interfaces;
using Nexus.Core.Models;

namespace Nexus.Infrastructure.Repositories;

public class WatchedAccountRepository : IWatchedAccountRepository
{
    private readonly string _connectionString;

    public WatchedAccountRepository(string connectionString) =>
        _connectionString = connectionString;

    private SqliteConnection Connect() => new(_connectionString);

    public async Task<List<WatchedAccount>> GetAllAsync()
    {
        using var conn = Connect();
        var rows = await conn.QueryAsync<WatchedAccountRow>(
            "SELECT * FROM WatchedAccounts ORDER BY AddedAt");
        return rows.Select(ToModel).ToList();
    }

    public async Task<WatchedAccount?> GetByNameAsync(string accountName)
    {
        using var conn = Connect();
        var row = await conn.QuerySingleOrDefaultAsync<WatchedAccountRow>(
            "SELECT * FROM WatchedAccounts WHERE AccountName = @AccountName",
            new { AccountName = accountName });
        return row == null ? null : ToModel(row);
    }

    public async Task AddAsync(WatchedAccount account)
    {
        using var conn = Connect();
        await conn.ExecuteAsync(@"
            INSERT INTO WatchedAccounts (AccountName, AccountType, AddedAt)
            VALUES (@AccountName, @AccountType, @AddedAt)",
            new
            {
                account.AccountName,
                AccountType = account.AccountType.ToString().ToLowerInvariant(),
                AddedAt = account.AddedAt.ToString("o")
            });
    }

    public async Task<bool> DeleteAsync(string accountName)
    {
        using var conn = Connect();
        var affected = await conn.ExecuteAsync(
            "DELETE FROM WatchedAccounts WHERE AccountName = @AccountName",
            new { AccountName = accountName });
        return affected > 0;
    }

    private static WatchedAccount ToModel(WatchedAccountRow r) => new()
    {
        AccountName = r.AccountName,
        AccountType = string.Equals(r.AccountType, "org", StringComparison.OrdinalIgnoreCase)
            ? GitHubAccountType.Org
            : GitHubAccountType.User,
        AddedAt = DateTime.Parse(r.AddedAt)
    };

    private class WatchedAccountRow
    {
        public string AccountName { get; set; } = "";
        public string AccountType { get; set; } = "user";
        public string AddedAt { get; set; } = "";
    }
}
