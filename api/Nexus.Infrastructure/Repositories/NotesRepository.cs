using Dapper;
using Microsoft.Data.Sqlite;
using Nexus.Core.DTOs;
using Nexus.Core.Interfaces;

namespace Nexus.Infrastructure.Repositories;

public class NotesRepository : INotesRepository
{
    private readonly string _connectionString;

    public NotesRepository(string connectionString) =>
        _connectionString = connectionString;

    private SqliteConnection Connect() => new(_connectionString);

    public async Task<List<NoteDto>> GetByQuickLinkIdAsync(Guid quickLinkId)
    {
        using var conn = Connect();
        var rows = await conn.QueryAsync<NoteRow>(
            "SELECT * FROM Notes WHERE QuickLinkId = @QuickLinkId ORDER BY CreatedAt DESC",
            new { QuickLinkId = quickLinkId.ToString() });
        return rows.Select(ToDto).ToList();
    }

    public async Task<NoteDto> CreateAsync(CreateNoteRequest request)
    {
        var id = Guid.NewGuid();
        var now = DateTime.UtcNow.ToString("o");

        using var conn = Connect();
        await conn.ExecuteAsync(@"
            INSERT INTO Notes (Id, QuickLinkId, Body, AuthorName, CreatedAt)
            VALUES (@Id, @QuickLinkId, @Body, @AuthorName, @CreatedAt)",
            new
            {
                Id = id.ToString(),
                QuickLinkId = request.QuickLinkId.ToString(),
                request.Body,
                request.AuthorName,
                CreatedAt = now
            });

        return new NoteDto
        {
            Id = id,
            QuickLinkId = request.QuickLinkId,
            Body = request.Body,
            AuthorName = request.AuthorName,
            CreatedAt = DateTime.Parse(now)
        };
    }

    public async Task<bool> DeleteAsync(Guid noteId)
    {
        using var conn = Connect();
        var affected = await conn.ExecuteAsync(
            "DELETE FROM Notes WHERE Id = @Id",
            new { Id = noteId.ToString() });
        return affected > 0;
    }

    private static NoteDto ToDto(NoteRow r) => new()
    {
        Id = Guid.Parse(r.Id),
        QuickLinkId = Guid.Parse(r.QuickLinkId),
        Body = r.Body,
        AuthorName = r.AuthorName,
        CreatedAt = DateTime.Parse(r.CreatedAt)
    };

    private class NoteRow
    {
        public string Id { get; set; } = "";
        public string QuickLinkId { get; set; } = "";
        public string Body { get; set; } = "";
        public string AuthorName { get; set; } = "";
        public string CreatedAt { get; set; } = "";
    }
}
