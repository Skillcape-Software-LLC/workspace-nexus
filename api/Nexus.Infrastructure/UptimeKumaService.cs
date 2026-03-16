using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Nexus.Core.Models;

namespace Nexus.Infrastructure;

public class UptimeKumaService
{
    private readonly NexusOptions _options;
    private readonly ILogger<UptimeKumaService> _logger;
    private readonly HttpClient _http;

    // Matches: monitor_status{labels} 1  or  monitor_response_time{labels} 173
    private static readonly Regex MetricLineRegex = new(
        @"^(?<metric>monitor_\w+)\{(?<labels>[^}]+)\}\s+(?<value>-?\d+\.?\d*)$",
        RegexOptions.Multiline | RegexOptions.Compiled);

    private static readonly Regex LabelRegex = new(
        @"(?<key>\w+)=""(?<val>[^""]*)""",
        RegexOptions.Compiled);

    public UptimeKumaService(IOptions<NexusOptions> options, ILogger<UptimeKumaService> logger)
    {
        _options = options.Value;
        _logger = logger;
        _http = new HttpClient();

        if (!string.IsNullOrEmpty(_options.UptimeKumaBaseUrl))
            _http.BaseAddress = new Uri(_options.UptimeKumaBaseUrl.TrimEnd('/') + "/");

        if (!string.IsNullOrEmpty(_options.UptimeKumaApiKey))
        {
            var credentials = Convert.ToBase64String(
                System.Text.Encoding.UTF8.GetBytes($":{_options.UptimeKumaApiKey}"));
            _http.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", $"Basic {credentials}");
        }
    }

    public bool IsConfigured =>
        !string.IsNullOrEmpty(_options.UptimeKumaBaseUrl) &&
        !string.IsNullOrEmpty(_options.UptimeKumaApiKey);

    public async Task<List<UptimeKumaMonitor>> GetMonitorsAsync()
    {
        var response = await _http.GetAsync("metrics");
        var body = await response.Content.ReadAsStringAsync();

        _logger.LogDebug("Uptime Kuma metrics response: status={Status}, length={Len}",
            (int)response.StatusCode, body.Length);

        response.EnsureSuccessStatusCode();

        return ParsePrometheusMetrics(body);
    }

    private List<UptimeKumaMonitor> ParsePrometheusMetrics(string body)
    {
        // Group all metric values by monitor_name
        var monitorData = new Dictionary<string, MonitorMetrics>();

        foreach (Match match in MetricLineRegex.Matches(body))
        {
            var metricName = match.Groups["metric"].Value;
            var labelsRaw = match.Groups["labels"].Value;
            var value = match.Groups["value"].Value;

            var labels = ParseLabels(labelsRaw);
            if (!labels.TryGetValue("monitor_name", out var name) || string.IsNullOrEmpty(name))
                continue;

            if (!monitorData.TryGetValue(name, out var metrics))
            {
                metrics = new MonitorMetrics { Labels = labels };
                monitorData[name] = metrics;
            }

            switch (metricName)
            {
                case "monitor_status":
                    metrics.Status = int.TryParse(value, out var s) ? s : (int?)null;
                    break;
                case "monitor_response_time":
                    metrics.ResponseTimeMs = int.TryParse(value, out var rt) ? rt : -1;
                    break;
                case "monitor_cert_days_remaining":
                    metrics.CertDaysRemaining = int.TryParse(value, out var cd) ? cd : (int?)null;
                    break;
                case "monitor_cert_is_valid":
                    metrics.CertIsValid = value == "1";
                    break;
            }
        }

        var tagFilter = _options.UptimeKumaTagFilter;

        return monitorData
            .Where(kvp => string.IsNullOrEmpty(tagFilter) ||
                (kvp.Value.Labels.TryGetValue("monitor_tags", out var tags) &&
                 tags.Split(',').Any(t => t.Trim().Equals(tagFilter, StringComparison.OrdinalIgnoreCase))))
            .Select(kvp =>
        {
            var name = kvp.Key;
            var m = kvp.Value;
            var labels = m.Labels;

            return new UptimeKumaMonitor
            {
                MonitorId         = StableHash(name),
                Name              = name,
                Url               = labels.GetValueOrDefault("monitor_url"),
                Type              = labels.GetValueOrDefault("monitor_type") ?? string.Empty,
                Active            = true,
                Status            = MapStatus(m.Status),
                ResponseTimeMs    = m.ResponseTimeMs ?? -1,
                CertDaysRemaining = m.CertDaysRemaining,
                CertIsValid       = m.CertIsValid,
                Tags              = "[]",
                UpdatedAt         = DateTime.UtcNow
            };
        }).ToList();
    }

    private static Dictionary<string, string> ParseLabels(string labelsRaw)
    {
        var result = new Dictionary<string, string>();
        foreach (Match m in LabelRegex.Matches(labelsRaw))
            result[m.Groups["key"].Value] = m.Groups["val"].Value;
        return result;
    }

    private static MonitorStatusValue MapStatus(int? status) => status switch
    {
        1 => MonitorStatusValue.Up,
        0 => MonitorStatusValue.Down,
        2 => MonitorStatusValue.Pending,
        3 => MonitorStatusValue.Maintenance,
        _ => MonitorStatusValue.Unknown
    };

    /// <summary>
    /// FNV-1a hash to generate a stable positive integer ID from a monitor name.
    /// </summary>
    private static int StableHash(string name)
    {
        uint hash = 2166136261;
        foreach (var c in name)
        {
            hash ^= c;
            hash *= 16777619;
        }
        return (int)(hash & 0x7FFFFFFF);
    }

    private class MonitorMetrics
    {
        public Dictionary<string, string> Labels { get; set; } = new();
        public int? Status { get; set; }
        public int? ResponseTimeMs { get; set; }
        public int? CertDaysRemaining { get; set; }
        public bool? CertIsValid { get; set; }
    }
}
