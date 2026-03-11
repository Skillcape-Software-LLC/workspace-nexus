namespace Nexus.Core.Models;

public enum MonitorStatusValue
{
    Unknown,
    Up,
    Down,
    Pending,
    Maintenance
}

public class UptimeKumaMonitor
{
    public int MonitorId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Url { get; set; }
    public string Type { get; set; } = string.Empty;
    public bool Active { get; set; }
    public MonitorStatusValue Status { get; set; } = MonitorStatusValue.Unknown;
    public string Tags { get; set; } = "[]";
    public DateTime UpdatedAt { get; set; }
}
