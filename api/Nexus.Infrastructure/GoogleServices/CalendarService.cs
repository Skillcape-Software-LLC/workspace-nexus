using Google.Apis.Calendar.v3;
using Google.Apis.Calendar.v3.Data;
using Google.Apis.Services;
using Nexus.Core.DTOs;

namespace Nexus.Infrastructure.GoogleServices;

public class CalendarService
{
    private readonly GoogleAuthService _auth;

    public CalendarService(GoogleAuthService auth) => _auth = auth;

    public async Task<List<CalendarEventDto>?> GetUpcomingEventsAsync(int days = 7)
    {
        var credential = _auth.GetCredential(
            "https://www.googleapis.com/auth/calendar.readonly");
        if (credential == null) return null;

        var service = new Google.Apis.Calendar.v3.CalendarService(new BaseClientService.Initializer
        {
            HttpClientInitializer = credential,
            ApplicationName = "Nexus"
        });

        var req = service.Events.List("primary");
        req.TimeMinDateTimeOffset = DateTimeOffset.UtcNow;
        req.TimeMaxDateTimeOffset = DateTimeOffset.UtcNow.AddDays(days);
        req.SingleEvents = true;
        req.OrderBy = EventsResource.ListRequest.OrderByEnum.StartTime;
        req.MaxResults = 50;

        var events = await req.ExecuteAsync();
        if (events.Items == null) return new List<CalendarEventDto>();

        return events.Items.Select(e =>
        {
            var isAllDay = e.Start.Date != null;
            DateTime? start = isAllDay
                ? (DateTime.TryParse(e.Start.Date, out var sd) ? sd : (DateTime?)null)
                : e.Start.DateTimeDateTimeOffset?.UtcDateTime;
            DateTime? end = isAllDay
                ? (DateTime.TryParse(e.End.Date, out var ed) ? ed : (DateTime?)null)
                : e.End.DateTimeDateTimeOffset?.UtcDateTime;

            var meetUrl = e.ConferenceData?.EntryPoints
                ?.FirstOrDefault(ep => ep.EntryPointType == "video")?.Uri;

            return new CalendarEventDto
            {
                Id = e.Id,
                Title = e.Summary ?? "(No title)",
                StartAt = start,
                EndAt = end,
                IsAllDay = isAllDay,
                Attendees = e.Attendees?.Select(a => a.DisplayName ?? a.Email ?? "").ToList() ?? new(),
                MeetUrl = meetUrl
            };
        }).ToList();
    }
}
