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

        var spaces = result.Spaces?.ToList() ?? new List<Google.Apis.HangoutsChat.v1.Data.Space>();

        // Fan out DM member lookups and recent message counts in parallel
        var dmLookups = spaces
            .Where(s => s.SpaceType == "DIRECT_MESSAGE")
            .ToDictionary(
                s => s.Name!,
                s => service.Spaces.Members.List(s.Name).ExecuteAsync()
            );

        var cutoff = DateTime.UtcNow.AddHours(-24).ToString("yyyy-MM-ddTHH:mm:ssZ");
        var unreadTasks = spaces.ToDictionary(
            s => s.Name!,
            s =>
            {
                var msgReq = service.Spaces.Messages.List(s.Name);
                msgReq.Filter = $"createTime > \"{cutoff}\"";
                msgReq.PageSize = 25;
                return msgReq.ExecuteAsync();
            });

        var currentUserId = await _auth.GetCurrentUserIdAsync();
        var currentUserResourceName = currentUserId != null ? $"users/{currentUserId}" : null;

        await Task.WhenAll(
            dmLookups.Values.Concat<System.Threading.Tasks.Task>(unreadTasks.Values));

        return spaces.Select(s =>
        {
            string displayName;
            if (s.SpaceType == "DIRECT_MESSAGE" && dmLookups.TryGetValue(s.Name!, out var dmTask))
            {
                var names = dmTask.Result.Memberships?
                    .Where(m => m.Member?.Type == "HUMAN" && !string.IsNullOrEmpty(m.Member?.DisplayName))
                    .Select(m => m.Member!.DisplayName!)
                    .ToList() ?? new List<string>();
                displayName = names.Count > 0 ? string.Join(" & ", names) : "Direct Message";
            }
            else
            {
                displayName = s.DisplayName ?? s.Name ?? "";
            }

            var messages = unreadTasks.TryGetValue(s.Name!, out var unreadTask)
                ? unreadTask.Result.Messages ?? new List<Google.Apis.HangoutsChat.v1.Data.Message>()
                : new List<Google.Apis.HangoutsChat.v1.Data.Message>();

            // If the current user sent the last message, they're caught up — no unread
            var lastMessage = messages.OrderByDescending(m => m.CreateTime).FirstOrDefault();
            var unreadCount = (currentUserResourceName != null && lastMessage?.Sender?.Name == currentUserResourceName)
                ? 0
                : messages.Count(m => m.Sender?.Name != currentUserResourceName);

            return new ChatSpaceDto
            {
                Name = s.Name ?? "",
                DisplayName = displayName,
                Type = s.SpaceType ?? "UNKNOWN",
                UnreadCount = unreadCount
            };
        }).ToList();
    }
}
