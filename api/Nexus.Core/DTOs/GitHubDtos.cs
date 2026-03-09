namespace Nexus.Core.DTOs;

public class CiStatusDto
{
    public string RepoFullName { get; set; } = string.Empty;
    public string Status { get; set; } = "Unknown";
    public string? Branch { get; set; }
    public string? RunUrl { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int? OpenPrCount { get; set; }
    public DateTime? LastPushedAt { get; set; }
    public string? DefaultBranch { get; set; }
    public string? LastCommitMessage { get; set; }
}

public class WatchedRepoDto
{
    public string RepoFullName { get; set; } = string.Empty;
    public DateTime AddedAt { get; set; }
}

public class AddWatchedRepoRequest
{
    /// <summary>Full GitHub URL (https://github.com/owner/repo) or owner/repo shorthand.</summary>
    public string RepoUrl { get; set; } = string.Empty;
}
