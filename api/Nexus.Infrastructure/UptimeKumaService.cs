using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Nexus.Core.Models;

namespace Nexus.Infrastructure;

public class UptimeKumaService
{
    private readonly NexusOptions _options;
    private readonly ILogger<UptimeKumaService> _logger;
    private readonly HttpClient _http;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public UptimeKumaService(IOptions<NexusOptions> options, ILogger<UptimeKumaService> logger)
    {
        _options = options.Value;
        _logger = logger;
        _http = new HttpClient();

        if (!string.IsNullOrEmpty(_options.UptimeKumaBaseUrl))
            _http.BaseAddress = new Uri(_options.UptimeKumaBaseUrl.TrimEnd('/') + "/");

        if (!string.IsNullOrEmpty(_options.UptimeKumaApiKey))
            _http.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", _options.UptimeKumaApiKey);
    }

    public bool IsConfigured =>
        !string.IsNullOrEmpty(_options.UptimeKumaBaseUrl) &&
        !string.IsNullOrEmpty(_options.UptimeKumaApiKey);

    public async Task<List<UptimeKumaMonitor>> GetMonitorsAsync()
    {
        var response = await _http.GetAsync("api/monitors");
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync();
        var apiMonitors = JsonSerializer.Deserialize<List<ApiMonitor>>(json, JsonOpts) ?? [];

        return apiMonitors.Select(m => new UptimeKumaMonitor
        {
            MonitorId = m.Id,
            Name      = m.Name ?? string.Empty,
            Url       = m.Url,
            Type      = m.Type ?? string.Empty,
            Active    = m.Active,
            Status    = MapStatus(m.HeartbeatStatus),
            Tags      = SerializeTags(m.Tags),
            UpdatedAt = DateTime.UtcNow
        }).ToList();
    }

    private static MonitorStatusValue MapStatus(int? status) => status switch
    {
        1 => MonitorStatusValue.Up,
        0 => MonitorStatusValue.Down,
        2 => MonitorStatusValue.Pending,
        3 => MonitorStatusValue.Maintenance,
        _ => MonitorStatusValue.Unknown
    };

    private static string SerializeTags(List<ApiTag>? tags)
    {
        if (tags == null || tags.Count == 0) return "[]";
        var mapped = tags.Select(t => new { tagId = t.TagId, name = t.Name ?? "", value = t.Value ?? "" });
        return JsonSerializer.Serialize(mapped, JsonOpts);
    }

    // ── API response shapes ────────────────────────────────────────────────

    private class ApiMonitor
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("url")]
        public string? Url { get; set; }

        [JsonPropertyName("type")]
        public string? Type { get; set; }

        [JsonPropertyName("active")]
        public bool Active { get; set; }

        [JsonPropertyName("heartbeatStatus")]
        public int? HeartbeatStatus { get; set; }

        [JsonPropertyName("tags")]
        public List<ApiTag>? Tags { get; set; }
    }

    private class ApiTag
    {
        [JsonPropertyName("tag_id")]
        public int TagId { get; set; }

        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("value")]
        public string? Value { get; set; }
    }
}
