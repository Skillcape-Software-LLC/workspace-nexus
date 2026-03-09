using Dapper;
using Microsoft.Data.Sqlite;
using Nexus.Core.DTOs;
using Nexus.Core.Interfaces;

namespace Nexus.Infrastructure.Repositories;

public class NotesRepository : INotesRepository
{
    private readonly string _connectionString;

    // Sentinel stored in DB for standalone notes (QuickLinkId column is NOT NULL)
    private static readonly string StandaloneId = Guid.Empty.ToString();

    public NotesRepository(string connectionString) =>
        _connectionString = connectionString;

    private SqliteConnection Connect() => new(_connectionString);

    public async Task<List<NoteDto>> GetAllAsync(
        string? search = null, string? category = null,
        string? clientName = null, string? tag = null)
    {
        var conditions = new List<string> { "IsArchived = 0" };
        var parameters = new DynamicParameters();

        if (!string.IsNullOrWhiteSpace(search))
        {
            conditions.Add("(Body LIKE @Search OR COALESCE(Title, '') LIKE @Search)");
            parameters.Add("Search", $"%{search}%");
        }
        if (!string.IsNullOrWhiteSpace(category))
        {
            conditions.Add("Category = @Category");
            parameters.Add("Category", category);
        }
        if (!string.IsNullOrWhiteSpace(clientName))
        {
            conditions.Add("ClientName = @ClientName");
            parameters.Add("ClientName", clientName);
        }
        if (!string.IsNullOrWhiteSpace(tag))
        {
            conditions.Add("(',' || COALESCE(Tags,'') || ',') LIKE ('%,' || @Tag || ',%')");
            parameters.Add("Tag", tag);
        }

        var where = conditions.Count > 0
            ? "WHERE " + string.Join(" AND ", conditions)
            : string.Empty;

        using var conn = Connect();
        var rows = await conn.QueryAsync<NoteRow>(
            $"SELECT * FROM Notes {where} ORDER BY CreatedAt DESC", parameters);
        return rows.Select(ToDto).ToList();
    }

    public async Task<List<NoteDto>> GetByQuickLinkIdAsync(Guid quickLinkId)
    {
        using var conn = Connect();
        var rows = await conn.QueryAsync<NoteRow>(
            "SELECT * FROM Notes WHERE QuickLinkId = @QuickLinkId AND IsArchived = 0 ORDER BY CreatedAt DESC",
            new { QuickLinkId = quickLinkId.ToString() });
        return rows.Select(ToDto).ToList();
    }

    public async Task<NoteDto?> GetByIdAsync(Guid noteId)
    {
        using var conn = Connect();
        var row = await conn.QueryFirstOrDefaultAsync<NoteRow>(
            "SELECT * FROM Notes WHERE Id = @Id",
            new { Id = noteId.ToString() });
        return row == null ? null : ToDto(row);
    }

    public async Task<NoteDto> CreateAsync(CreateNoteRequest request)
    {
        var id = Guid.NewGuid();
        var now = DateTime.UtcNow.ToString("o");
        var quickLinkId = request.QuickLinkId?.ToString() ?? StandaloneId;

        using var conn = Connect();
        await conn.ExecuteAsync(@"
            INSERT INTO Notes (Id, QuickLinkId, Title, Body, AuthorName, Tags, Category, ClientName, CreatedAt, UpdatedAt)
            VALUES (@Id, @QuickLinkId, @Title, @Body, @AuthorName, @Tags, @Category, @ClientName, @CreatedAt, @UpdatedAt)",
            new
            {
                Id = id.ToString(),
                QuickLinkId = quickLinkId,
                request.Title,
                request.Body,
                request.AuthorName,
                request.Tags,
                request.Category,
                request.ClientName,
                CreatedAt = now,
                UpdatedAt = now
            });

        return new NoteDto
        {
            Id = id,
            QuickLinkId = request.QuickLinkId,
            Title = request.Title,
            Body = request.Body,
            AuthorName = request.AuthorName,
            Tags = request.Tags,
            Category = request.Category,
            ClientName = request.ClientName,
            CreatedAt = DateTime.Parse(now),
            UpdatedAt = DateTime.Parse(now)
        };
    }

    public async Task<NoteDto?> UpdateAsync(Guid noteId, UpdateNoteRequest request)
    {
        var now = DateTime.UtcNow.ToString("o");

        using var conn = Connect();
        var affected = await conn.ExecuteAsync(@"
            UPDATE Notes
            SET Title = @Title, Body = @Body, Tags = @Tags,
                Category = @Category, ClientName = @ClientName, UpdatedAt = @UpdatedAt
            WHERE Id = @Id",
            new
            {
                request.Title,
                request.Body,
                request.Tags,
                request.Category,
                request.ClientName,
                UpdatedAt = now,
                Id = noteId.ToString()
            });

        return affected > 0 ? await GetByIdAsync(noteId) : null;
    }

    public async Task<bool> DeleteAsync(Guid noteId)
    {
        using var conn = Connect();
        var affected = await conn.ExecuteAsync(
            "DELETE FROM Notes WHERE Id = @Id",
            new { Id = noteId.ToString() });
        return affected > 0;
    }

    public async Task<List<NoteDto>> GetArchivedAsync()
    {
        using var conn = Connect();
        var rows = await conn.QueryAsync<NoteRow>(
            "SELECT * FROM Notes WHERE IsArchived = 1 ORDER BY UpdatedAt DESC, CreatedAt DESC");
        return rows.Select(ToDto).ToList();
    }

    public async Task<bool> ArchiveAsync(Guid noteId)
    {
        var now = DateTime.UtcNow.ToString("o");
        using var conn = Connect();
        var affected = await conn.ExecuteAsync(
            "UPDATE Notes SET IsArchived = 1, UpdatedAt = @Now WHERE Id = @Id",
            new { Now = now, Id = noteId.ToString() });
        return affected > 0;
    }

    public async Task<bool> RestoreAsync(Guid noteId)
    {
        var now = DateTime.UtcNow.ToString("o");
        using var conn = Connect();
        var affected = await conn.ExecuteAsync(
            "UPDATE Notes SET IsArchived = 0, UpdatedAt = @Now WHERE Id = @Id",
            new { Now = now, Id = noteId.ToString() });
        return affected > 0;
    }

    private static NoteDto ToDto(NoteRow r) => new()
    {
        Id = Guid.Parse(r.Id),
        QuickLinkId = r.QuickLinkId == StandaloneId ? null : Guid.Parse(r.QuickLinkId),
        Title = string.IsNullOrEmpty(r.Title) ? null : r.Title,
        Body = r.Body,
        AuthorName = r.AuthorName,
        Tags = string.IsNullOrEmpty(r.Tags) ? null : r.Tags,
        Category = string.IsNullOrEmpty(r.Category) ? null : r.Category,
        ClientName = string.IsNullOrEmpty(r.ClientName) ? null : r.ClientName,
        CreatedAt = DateTime.Parse(r.CreatedAt),
        UpdatedAt = string.IsNullOrEmpty(r.UpdatedAt) ? null : DateTime.Parse(r.UpdatedAt),
        IsArchived = r.IsArchived
    };

    private class NoteRow
    {
        public string Id { get; set; } = "";
        public string QuickLinkId { get; set; } = "";
        public string? Title { get; set; }
        public string Body { get; set; } = "";
        public string AuthorName { get; set; } = "";
        public string? Tags { get; set; }
        public string? Category { get; set; }
        public string? ClientName { get; set; }
        public string CreatedAt { get; set; } = "";
        public string? UpdatedAt { get; set; }
        public bool IsArchived { get; set; }
    }
}
