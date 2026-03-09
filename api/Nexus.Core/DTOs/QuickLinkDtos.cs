namespace Nexus.Core.DTOs;

public class QuickLinkDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int SortOrder { get; set; }
    public bool IsRepo { get; set; }
    public string? RepoOwner { get; set; }
    public string? RepoName { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateQuickLinkRequest
{
    public string Name { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsRepo { get; set; }
    public string? RepoOwner { get; set; }
    public string? RepoName { get; set; }
}

public class UpdateQuickLinkRequest
{
    public string Name { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsRepo { get; set; }
    public string? RepoOwner { get; set; }
    public string? RepoName { get; set; }
}

public class ReorderQuickLinksRequest
{
    public List<Guid> Ids { get; set; } = new();
}
