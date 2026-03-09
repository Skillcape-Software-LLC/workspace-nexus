namespace Nexus.Infrastructure;

public class NexusOptions
{
    public string DatabasePath { get; set; } = "/app/data/nexus.db";
    public string? ApiKey { get; set; }
    public string? GoogleImpersonateUser { get; set; }
    public string? GoogleCredentialsPath { get; set; }
    public string? GitHubPat { get; set; }
    public string? GitHubWebhookSecret { get; set; }
    public string? ClaudeApiKey { get; set; }
    public string BriefingSchedule { get; set; } = "30 7 * * *";
    public int CiPollingIntervalMinutes { get; set; } = 5;
}
