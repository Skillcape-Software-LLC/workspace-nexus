using Nexus.Infrastructure;
using Microsoft.Extensions.Options;

namespace Nexus.API.Middleware;

public class ApiKeyMiddleware
{
    private readonly RequestDelegate _next;

    public ApiKeyMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context, IOptions<NexusOptions> options, ILogger<ApiKeyMiddleware> logger)
    {
        var apiKey = options.Value.ApiKey;

        // If no API key is configured, skip auth entirely
        if (string.IsNullOrEmpty(apiKey))
        {
            await _next(context);
            return;
        }

        // Skip webhook endpoint — GitHub calls this, not the frontend
        if (context.Request.Path.StartsWithSegments("/api/github/webhook"))
        {
            await _next(context);
            return;
        }

        // Skip OAuth callbacks — browser redirects can't carry X-API-Key header
        if (context.Request.Path.StartsWithSegments("/api/google/auth/callback") ||
            context.Request.Path.StartsWithSegments("/api/github/oauth/callback"))
        {
            await _next(context);
            return;
        }

        if (!context.Request.Headers.TryGetValue("X-API-Key", out var providedKey) ||
            providedKey != apiKey)
        {
            logger.LogWarning("API key validation failed from {RemoteIp} for {Path}",
                context.Connection.RemoteIpAddress, context.Request.Path);
            context.Response.StatusCode = 401;
            await context.Response.WriteAsJsonAsync(new { error = "Unauthorized" });
            return;
        }

        await _next(context);
    }
}
