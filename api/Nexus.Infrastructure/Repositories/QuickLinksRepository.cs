using Dapper;
using Microsoft.Data.Sqlite;
using Nexus.Core.DTOs;
using Nexus.Core.Interfaces;

namespace Nexus.Infrastructure.Repositories;

public class QuickLinksRepository : IQuickLinksRepository
{
    private readonly string _connectionString;

    public QuickLinksRepository(string connectionString) =>
        _connectionString = connectionString;

    private SqliteConnection Connect() => new(_connectionString);

    public async Task<List<QuickLinkDto>> GetAllAsync()
    {
        using var conn = Connect();
        var rows = await conn.QueryAsync<QuickLinkRow>(
            "SELECT * FROM QuickLinks ORDER BY SortOrder");
        return rows.Select(ToDto).ToList();
    }

    public async Task<QuickLinkDto?> GetByIdAsync(Guid id)
    {
        using var conn = Connect();
        var row = await conn.QuerySingleOrDefaultAsync<QuickLinkRow>(
            "SELECT * FROM QuickLinks WHERE Id = @Id", new { Id = id.ToString() });
        return row == null ? null : ToDto(row);
    }

    public async Task<QuickLinkDto> CreateAsync(CreateQuickLinkRequest request)
    {
        using var conn = Connect();
        var maxOrder = await conn.ExecuteScalarAsync<int?>(
            "SELECT MAX(SortOrder) FROM QuickLinks") ?? -1;

        var id = Guid.NewGuid();
        var now = DateTime.UtcNow.ToString("o");

        await conn.ExecuteAsync(@"
            INSERT INTO QuickLinks (Id, Name, Url, Category, Description, SortOrder,
                IsRepo, RepoOwner, RepoName, CreatedAt, UpdatedAt)
            VALUES (@Id, @Name, @Url, @Category, @Description, @SortOrder,
                @IsRepo, @RepoOwner, @RepoName, @CreatedAt, @UpdatedAt)",
            new
            {
                Id = id.ToString(),
                request.Name,
                request.Url,
                request.Category,
                request.Description,
                SortOrder = maxOrder + 1,
                IsRepo = request.IsRepo ? 1 : 0,
                request.RepoOwner,
                request.RepoName,
                CreatedAt = now,
                UpdatedAt = now
            });

        return (await GetByIdAsync(id))!;
    }

    public async Task<QuickLinkDto?> UpdateAsync(Guid id, UpdateQuickLinkRequest request)
    {
        using var conn = Connect();
        var affected = await conn.ExecuteAsync(@"
            UPDATE QuickLinks SET
                Name = @Name, Url = @Url, Category = @Category,
                Description = @Description, IsRepo = @IsRepo,
                RepoOwner = @RepoOwner, RepoName = @RepoName,
                UpdatedAt = @UpdatedAt
            WHERE Id = @Id",
            new
            {
                Id = id.ToString(),
                request.Name,
                request.Url,
                request.Category,
                request.Description,
                IsRepo = request.IsRepo ? 1 : 0,
                request.RepoOwner,
                request.RepoName,
                UpdatedAt = DateTime.UtcNow.ToString("o")
            });

        return affected == 0 ? null : await GetByIdAsync(id);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        using var conn = Connect();
        var affected = await conn.ExecuteAsync(
            "DELETE FROM QuickLinks WHERE Id = @Id", new { Id = id.ToString() });
        return affected > 0;
    }

    public async Task ReorderAsync(List<Guid> orderedIds)
    {
        using var conn = Connect();
        conn.Open();
        using var tx = conn.BeginTransaction();
        for (int i = 0; i < orderedIds.Count; i++)
        {
            await conn.ExecuteAsync(
                "UPDATE QuickLinks SET SortOrder = @Order WHERE Id = @Id",
                new { Order = i, Id = orderedIds[i].ToString() },
                tx);
        }
        tx.Commit();
    }

    private static QuickLinkDto ToDto(QuickLinkRow r) => new()
    {
        Id = Guid.Parse(r.Id),
        Name = r.Name,
        Url = r.Url,
        Category = r.Category,
        Description = r.Description,
        SortOrder = r.SortOrder,
        IsRepo = r.IsRepo != 0,
        RepoOwner = r.RepoOwner,
        RepoName = r.RepoName,
        CreatedAt = DateTime.Parse(r.CreatedAt),
        UpdatedAt = DateTime.Parse(r.UpdatedAt)
    };

    private class QuickLinkRow
    {
        public string Id { get; set; } = "";
        public string Name { get; set; } = "";
        public string Url { get; set; } = "";
        public string Category { get; set; } = "";
        public string? Description { get; set; }
        public int SortOrder { get; set; }
        public int IsRepo { get; set; }
        public string? RepoOwner { get; set; }
        public string? RepoName { get; set; }
        public string CreatedAt { get; set; } = "";
        public string UpdatedAt { get; set; } = "";
    }
}
