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
        ";
        cmd.ExecuteNonQuery();
    }
}
