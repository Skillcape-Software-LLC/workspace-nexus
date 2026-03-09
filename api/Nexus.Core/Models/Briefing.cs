namespace Nexus.Core.Models;

public class Briefing
{
    public string Date { get; set; } = string.Empty; // ISO date "yyyy-MM-dd"
    public string Content { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; }
}
