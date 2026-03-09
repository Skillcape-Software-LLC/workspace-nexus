namespace Nexus.Core.DTOs;

public class CiStatusDto
{
    public string RepoFullName { get; set; } = string.Empty;
    public string Status { get; set; } = "Unknown";
    public string? Branch { get; set; }
    public string? RunUrl { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? SourceAccount { get; set; }
}

public class WatchedAccountDto
{
    public string AccountName { get; set; } = string.Empty;
    public string AccountType { get; set; } = "user";
    public DateTime AddedAt { get; set; }
}

public class AddWatchedAccountRequest
{
    public string AccountName { get; set; } = string.Empty;
    public string AccountType { get; set; } = "user";
}
