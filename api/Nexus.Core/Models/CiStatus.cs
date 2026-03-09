namespace Nexus.Core.Models;

public enum CiStatusValue
{
    Unknown,
    Passing,
    Failing,
    Running
}

public class CiStatus
{
    public string RepoFullName { get; set; } = string.Empty;
    public CiStatusValue Status { get; set; } = CiStatusValue.Unknown;
    public string? Branch { get; set; }
    public string? RunUrl { get; set; }
    public DateTime UpdatedAt { get; set; }
}
