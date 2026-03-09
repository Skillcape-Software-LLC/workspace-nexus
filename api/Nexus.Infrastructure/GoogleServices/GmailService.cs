using Google.Apis.Gmail.v1;
using Google.Apis.Gmail.v1.Data;
using Google.Apis.Services;
using Nexus.Core.DTOs;

namespace Nexus.Infrastructure.GoogleServices;

public class GmailService
{
    private readonly GoogleAuthService _auth;

    public GmailService(GoogleAuthService auth) => _auth = auth;

    public async Task<List<EmailSummaryDto>?> GetInboxAsync(int maxResults = 20)
    {
        var credential = _auth.GetCredential(
            "https://www.googleapis.com/auth/gmail.readonly");
        if (credential == null) return null;

        var service = new Google.Apis.Gmail.v1.GmailService(new BaseClientService.Initializer
        {
            HttpClientInitializer = credential,
            ApplicationName = "Nexus"
        });

        var listReq = service.Users.Messages.List("me");
        listReq.LabelIds = "INBOX";
        listReq.MaxResults = maxResults;
        var list = await listReq.ExecuteAsync();

        if (list.Messages == null) return new List<EmailSummaryDto>();

        var results = new List<EmailSummaryDto>();
        var tasks = list.Messages.Select(async m =>
        {
            var msgReq = service.Users.Messages.Get("me", m.Id);
            msgReq.Format = UsersResource.MessagesResource.GetRequest.FormatEnum.Metadata;
            msgReq.MetadataHeaders = new[] { "From", "Subject", "Date" };
            var msg = await msgReq.ExecuteAsync();

            string GetHeader(string name) =>
                msg.Payload?.Headers?.FirstOrDefault(h =>
                    string.Equals(h.Name, name, StringComparison.OrdinalIgnoreCase))?.Value ?? string.Empty;

            var dateStr = GetHeader("Date");
            DateTime.TryParse(dateStr, out var receivedAt);

            return new EmailSummaryDto
            {
                Id = msg.Id,
                ThreadId = msg.ThreadId,
                From = GetHeader("From"),
                Subject = GetHeader("Subject"),
                ReceivedAt = receivedAt,
                IsUnread = msg.LabelIds?.Contains("UNREAD") == true
            };
        });

        results.AddRange(await Task.WhenAll(tasks));
        return results.OrderByDescending(e => e.ReceivedAt).ToList();
    }
}
