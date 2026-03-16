using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Nexus.Core.Interfaces;
using Nexus.Infrastructure;

namespace Nexus.API.Controllers;

[ApiController]
[Route("api/uptime-kuma")]
public class UptimeKumaController : ControllerBase
{
    private readonly IUptimeKumaMonitorRepository _repo;
    private readonly UptimeKumaPollingService _poller;
    private readonly ILogger<UptimeKumaController> _logger;

    public UptimeKumaController(
        IUptimeKumaMonitorRepository repo,
        UptimeKumaPollingService poller,
        ILogger<UptimeKumaController> logger)
    {
        _repo = repo;
        _poller = poller;
        _logger = logger;
    }

    [HttpGet("monitors")]
    public async Task<IActionResult> GetMonitors()
    {
        var monitors = await _repo.GetAllAsync();
        var dtos = monitors.Select(m => new
        {
            m.MonitorId,
            m.Name,
            m.Url,
            m.Type,
            m.Active,
            Status = m.Status.ToString(),
            m.ResponseTimeMs,
            m.CertDaysRemaining,
            m.CertIsValid,
            Tags = DeserializeTags(m.Tags),
            UpdatedAt = m.UpdatedAt.ToString("o")
        });
        return Ok(dtos);
    }

    [HttpPost("sync")]
    public async Task<IActionResult> Sync()
    {
        await _poller.PollNowAsync();
        return Ok(new { message = "Sync complete." });
    }

    private static List<object> DeserializeTags(string tagsJson)
    {
        try
        {
            return JsonSerializer.Deserialize<List<object>>(tagsJson) ?? [];
        }
        catch
        {
            return [];
        }
    }
}
