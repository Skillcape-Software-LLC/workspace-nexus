using Dapper;
using Microsoft.Data.Sqlite;

namespace Nexus.Infrastructure.Repositories;

public class AppConfigRepository
{
    private readonly string _connectionString;

    public AppConfigRepository(string connectionString) =>
        _connectionString = connectionString;

    private SqliteConnection Connect() => new(_connectionString);

    public async Task<string?> GetAsync(string key)
    {
        using var conn = Connect();
        return await conn.ExecuteScalarAsync<string?>(
            "SELECT Value FROM AppConfigs WHERE Key = @Key",
            new { Key = key });
    }

    public async Task SetAsync(string key, string value)
    {
        using var conn = Connect();
        await conn.ExecuteAsync(@"
            INSERT INTO AppConfigs (Key, Value) VALUES (@Key, @Value)
            ON CONFLICT(Key) DO UPDATE SET Value = excluded.Value",
            new { Key = key, Value = value });
    }

    public async Task DeleteAsync(string key)
    {
        using var conn = Connect();
        await conn.ExecuteAsync("DELETE FROM AppConfigs WHERE Key = @Key", new { Key = key });
    }
}
