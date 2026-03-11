using Dapper;
using Microsoft.Data.Sqlite;

namespace Nexus.Infrastructure.Database;

public static class DbInitializer
{
    public static void Initialize(string connectionString)
    {
        using var conn = new SqliteConnection(connectionString);
        conn.Open();

        var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            CREATE TABLE IF NOT EXISTS QuickLinks (
                Id          TEXT PRIMARY KEY,
                Name        TEXT NOT NULL,
                Url         TEXT NOT NULL,
                Category    TEXT NOT NULL DEFAULT '',
                Description TEXT,
                SortOrder   INTEGER NOT NULL DEFAULT 0,
                IsRepo      INTEGER NOT NULL DEFAULT 0,
                RepoOwner   TEXT,
                RepoName    TEXT,
                CreatedAt   TEXT NOT NULL,
                UpdatedAt   TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS Notes (
                Id          TEXT PRIMARY KEY,
                QuickLinkId TEXT NOT NULL,
                Body        TEXT NOT NULL,
                AuthorName  TEXT NOT NULL,
                CreatedAt   TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS CiStatuses (
                RepoFullName TEXT PRIMARY KEY,
                Status       TEXT NOT NULL DEFAULT 'Unknown',
                Branch       TEXT,
                RunUrl       TEXT,
                UpdatedAt    TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS Briefings (
                Date        TEXT PRIMARY KEY,
                Content     TEXT NOT NULL,
                GeneratedAt TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS AppConfigs (
                Key   TEXT PRIMARY KEY,
                Value TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS WatchedAccounts (
                AccountName TEXT PRIMARY KEY,
                AccountType TEXT NOT NULL DEFAULT 'user',
                AddedAt     TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS WatchedRepos (
                RepoFullName TEXT PRIMARY KEY,
                AddedAt      TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS UptimeKumaMonitors (
                MonitorId   INTEGER PRIMARY KEY,
                Name        TEXT NOT NULL,
                Url         TEXT,
                Type        TEXT NOT NULL DEFAULT '',
                Active      INTEGER NOT NULL DEFAULT 1,
                Status      TEXT NOT NULL DEFAULT 'Unknown',
                Tags        TEXT NOT NULL DEFAULT '[]',
                UpdatedAt   TEXT NOT NULL
            );
        ";
        cmd.ExecuteNonQuery();

        // Idempotent column migrations for CiStatuses table
        var ciColumns = conn
            .Query<string>("SELECT name FROM pragma_table_info('CiStatuses')")
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var ciColumnsToAdd = new Dictionary<string, string>
        {
            ["OpenPrCount"]       = "INTEGER",
            ["LastPushedAt"]      = "TEXT",
            ["DefaultBranch"]     = "TEXT",
            ["LastCommitMessage"] = "TEXT"
        };

        foreach (var (col, type) in ciColumnsToAdd)
        {
            if (!ciColumns.Contains(col))
            {
                var alter = conn.CreateCommand();
                alter.CommandText = $"ALTER TABLE CiStatuses ADD COLUMN {col} {type}";
                alter.ExecuteNonQuery();
            }
        }

        // Idempotent column migrations for Notes table
        var existingColumns = conn
            .Query<string>("SELECT name FROM pragma_table_info('Notes')")
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var columnsToAdd = new Dictionary<string, string>
        {
            ["Title"]      = "TEXT",
            ["Tags"]       = "TEXT",
            ["Category"]   = "TEXT",
            ["ClientName"] = "TEXT",
            ["UpdatedAt"]  = "TEXT",
            ["IsArchived"] = "INTEGER NOT NULL DEFAULT 0"
        };

        foreach (var (col, type) in columnsToAdd)
        {
            if (!existingColumns.Contains(col))
            {
                var alter = conn.CreateCommand();
                alter.CommandText = $"ALTER TABLE Notes ADD COLUMN {col} {type}";
                alter.ExecuteNonQuery();
            }
        }
    }
}
