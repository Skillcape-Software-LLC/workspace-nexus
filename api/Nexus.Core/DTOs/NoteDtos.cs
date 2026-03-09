namespace Nexus.Core.DTOs;

public class NoteDto
{
    public Guid Id { get; set; }
    public Guid? QuickLinkId { get; set; }
    public string? Title { get; set; }
    public string Body { get; set; } = string.Empty;
    public string AuthorName { get; set; } = string.Empty;
    public string? Tags { get; set; }
    public string? Category { get; set; }
    public string? ClientName { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public bool IsArchived { get; set; }
}

public class CreateNoteRequest
{
    public Guid? QuickLinkId { get; set; }
    public string? Title { get; set; }
    public string Body { get; set; } = string.Empty;
    public string AuthorName { get; set; } = string.Empty;
    public string? Tags { get; set; }
    public string? Category { get; set; }
    public string? ClientName { get; set; }
}

public class UpdateNoteRequest
{
    public string? Title { get; set; }
    public string Body { get; set; } = string.Empty;
    public string? Tags { get; set; }
    public string? Category { get; set; }
    public string? ClientName { get; set; }
}
