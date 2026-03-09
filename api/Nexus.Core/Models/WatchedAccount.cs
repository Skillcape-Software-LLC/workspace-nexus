namespace Nexus.Core.Models;

public enum GitHubAccountType { User, Org }

public class WatchedAccount
{
    public string AccountName { get; set; } = string.Empty;
    public GitHubAccountType AccountType { get; set; } = GitHubAccountType.User;
    public DateTime AddedAt { get; set; }
}
