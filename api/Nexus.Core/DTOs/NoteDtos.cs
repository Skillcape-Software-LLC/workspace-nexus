namespace Nexus.Core.DTOs;

public class NoteDto
{
    public Guid Id { get; set; }
    public Guid QuickLinkId { get; set; }
    public string Body { get; set; } = string.Empty;
    public string AuthorName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class CreateNoteRequest
{
    public Guid QuickLinkId { get; set; }
    public string Body { get; set; } = string.Empty;
    public string AuthorName { get; set; } = string.Empty;
}
