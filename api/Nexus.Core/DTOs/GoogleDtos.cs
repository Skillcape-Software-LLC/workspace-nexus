namespace Nexus.Core.DTOs;

public class EmailSummaryDto
{
    public string Id { get; set; } = string.Empty;
    public string ThreadId { get; set; } = string.Empty;
    public string From { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public DateTime ReceivedAt { get; set; }
    public bool IsUnread { get; set; }
}

public class CalendarEventDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public DateTime? StartAt { get; set; }
    public DateTime? EndAt { get; set; }
    public List<string> Attendees { get; set; } = new();
    public string? MeetUrl { get; set; }
    public string? HtmlLink { get; set; }
    public bool IsAllDay { get; set; }
}

public class ChatSpaceDto
{
    public string Name { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public int UnreadCount { get; set; }
}

public class ChatMessageDto
{
    public string Name { get; set; } = string.Empty;
    public string SenderName { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class ThreadMessageDto
{
    public string Id { get; set; } = string.Empty;
    public string From { get; set; } = string.Empty;
    public DateTime SentAt { get; set; }
    public string? BodyHtml { get; set; }
    public string? BodyText { get; set; }
}

public class ThreadDetailDto
{
    public string ThreadId { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public List<ThreadMessageDto> Messages { get; set; } = new();
}
