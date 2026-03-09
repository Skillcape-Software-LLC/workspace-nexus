using Google.Apis.HangoutsChat.v1;
using Google.Apis.Services;
using Nexus.Core.DTOs;

namespace Nexus.Infrastructure.GoogleServices;

public class ChatService
{
    private readonly GoogleAuthService _auth;

    public ChatService(GoogleAuthService auth) => _auth = auth;

    public async Task<List<ChatSpaceDto>?> GetSpacesAsync()
    {
        var credential = await _auth.GetCredentialAsync();
        if (credential == null) return null;

        var service = new HangoutsChatService(new BaseClientService.Initializer
        {
            HttpClientInitializer = credential,
            ApplicationName = "Nexus"
        });

        var req = service.Spaces.List();
        req.PageSize = 50;
        var result = await req.ExecuteAsync();

        return result.Spaces?.Select(s => new ChatSpaceDto
        {
            Name = s.Name ?? "",
            DisplayName = s.DisplayName ?? s.Name ?? "",
            Type = s.SpaceType ?? "UNKNOWN",
            UnreadCount = 0 // Chat API doesn't expose unread counts via REST
        }).ToList() ?? new List<ChatSpaceDto>();
    }

    public async Task<List<ChatMessageDto>?> GetRecentMessagesAsync(string spaceName, int maxResults = 10)
    {
        var credential = await _auth.GetCredentialAsync();
        if (credential == null) return null;

        var service = new HangoutsChatService(new BaseClientService.Initializer
        {
            HttpClientInitializer = credential,
            ApplicationName = "Nexus"
        });

        var req = service.Spaces.Messages.List(spaceName);
        req.PageSize = maxResults;
        var result = await req.ExecuteAsync();

        return result.Messages?.Select(m =>
        {
            var createdAt = m.CreateTimeDateTimeOffset?.UtcDateTime ?? DateTime.UtcNow;
            return new ChatMessageDto
            {
                Name = m.Name ?? "",
                SenderName = m.Sender?.DisplayName ?? m.Sender?.Name ?? "Unknown",
                Text = m.Text ?? "",
                CreatedAt = createdAt
            };
        }).ToList() ?? new List<ChatMessageDto>();
    }
}
