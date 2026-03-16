using Microsoft.Extensions.Options;
using Nexus.API.Middleware;
using Nexus.Core.Interfaces;
using Nexus.Infrastructure;
using Nexus.Infrastructure.Database;
using Nexus.Infrastructure.GoogleServices;
using Nexus.Infrastructure.Repositories;

// Load .env file from repo root (for local dev without Docker)
var envPath = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", ".env");
if (File.Exists(envPath))
    DotNetEnv.Env.Load(envPath);

var builder = WebApplication.CreateBuilder(args);

// Map env vars to NexusOptions
var nexusOptions = new NexusOptions
{
    DatabasePath = builder.Configuration["DATABASE_PATH"] ?? "/app/data/nexus.db",
    ApiKey = builder.Configuration["API_KEY"],
    GoogleClientId = builder.Configuration["GOOGLE_CLIENT_ID"],
    GoogleClientSecret = builder.Configuration["GOOGLE_CLIENT_SECRET"],
    NexusBaseUrl = builder.Configuration["NEXUS_BASE_URL"] ?? "http://localhost:5000",
    NexusFrontendUrl = builder.Configuration["NEXUS_FRONTEND_URL"] ?? "http://localhost:4200",
    GitHubPat = builder.Configuration["GITHUB_PAT"],
    GitHubClientId = builder.Configuration["GITHUB_CLIENT_ID"],
    GitHubClientSecret = builder.Configuration["GITHUB_CLIENT_SECRET"],
    GitHubWebhookSecret = builder.Configuration["GITHUB_WEBHOOK_SECRET"],
    ClaudeApiKey = builder.Configuration["CLAUDE_API_KEY"],
    BriefingSchedule = builder.Configuration["BRIEFING_SCHEDULE"] ?? "30 7 * * *",
    CiPollingIntervalMinutes = int.TryParse(builder.Configuration["CI_POLLING_INTERVAL_MINUTES"], out var mins) ? mins : 5,
    UptimeKumaBaseUrl = builder.Configuration["UPTIME_KUMA_BASE_URL"],
    UptimeKumaApiKey = builder.Configuration["UPTIME_KUMA_API_KEY"],
    UptimeKumaTagFilter = builder.Configuration["UPTIME_KUMA_TAG_FILTER"],
    UptimeKumaPollingIntervalMinutes = int.TryParse(builder.Configuration["UPTIME_KUMA_POLLING_INTERVAL_MINUTES"], out var ukMins) ? ukMins : 5
};

builder.Services.Configure<NexusOptions>(opt =>
{
    opt.DatabasePath = nexusOptions.DatabasePath;
    opt.ApiKey = nexusOptions.ApiKey;
    opt.GoogleClientId = nexusOptions.GoogleClientId;
    opt.GoogleClientSecret = nexusOptions.GoogleClientSecret;
    opt.NexusBaseUrl = nexusOptions.NexusBaseUrl;
    opt.NexusFrontendUrl = nexusOptions.NexusFrontendUrl;
    opt.GitHubPat = nexusOptions.GitHubPat;
    opt.GitHubClientId = nexusOptions.GitHubClientId;
    opt.GitHubClientSecret = nexusOptions.GitHubClientSecret;
    opt.GitHubWebhookSecret = nexusOptions.GitHubWebhookSecret;
    opt.ClaudeApiKey = nexusOptions.ClaudeApiKey;
    opt.BriefingSchedule = nexusOptions.BriefingSchedule;
    opt.CiPollingIntervalMinutes = nexusOptions.CiPollingIntervalMinutes;
    opt.UptimeKumaBaseUrl = nexusOptions.UptimeKumaBaseUrl;
    opt.UptimeKumaApiKey = nexusOptions.UptimeKumaApiKey;
    opt.UptimeKumaTagFilter = nexusOptions.UptimeKumaTagFilter;
    opt.UptimeKumaPollingIntervalMinutes = nexusOptions.UptimeKumaPollingIntervalMinutes;
});

// Ensure DB directory exists
var dbDir = Path.GetDirectoryName(nexusOptions.DatabasePath);
if (!string.IsNullOrEmpty(dbDir) && !Directory.Exists(dbDir))
    Directory.CreateDirectory(dbDir);

var connectionString = $"Data Source={nexusOptions.DatabasePath}";

// Initialize schema (idempotent CREATE TABLE IF NOT EXISTS)
DbInitializer.Initialize(connectionString);

// Repositories
builder.Services.AddScoped<IQuickLinksRepository>(_ => new QuickLinksRepository(connectionString));
builder.Services.AddScoped<INotesRepository>(_ => new NotesRepository(connectionString));
builder.Services.AddScoped<AppConfigRepository>(_ => new AppConfigRepository(connectionString));

// GitHub repositories + service + polling
builder.Services.AddScoped<ICiStatusRepository>(_ => new CiStatusRepository(connectionString));
builder.Services.AddScoped<IWatchedRepoRepository>(_ => new WatchedRepoRepository(connectionString));
builder.Services.AddScoped<GitHubService>(_ =>
    new GitHubService(_.GetRequiredService<IOptions<NexusOptions>>(),
                      _.GetRequiredService<ILogger<GitHubService>>(),
                      connectionString));
builder.Services.AddSingleton<CiPollingService>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<CiPollingService>());

// Uptime Kuma
builder.Services.AddScoped<IUptimeKumaMonitorRepository>(_ => new UptimeKumaMonitorRepository(connectionString));
builder.Services.AddScoped<UptimeKumaService>();
builder.Services.AddSingleton<UptimeKumaPollingService>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<UptimeKumaPollingService>());

// Google services
builder.Services.AddScoped<GoogleAuthService>(_ =>
    new GoogleAuthService(_.GetRequiredService<IOptions<NexusOptions>>(),
                          _.GetRequiredService<ILogger<GoogleAuthService>>(),
                          connectionString));
builder.Services.AddScoped<GmailService>();
builder.Services.AddScoped<CalendarService>();
builder.Services.AddScoped<ChatService>();

// API
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS
builder.Services.AddCors(opt =>
    opt.AddDefaultPolicy(policy =>
        policy.WithOrigins(nexusOptions.NexusFrontendUrl.TrimEnd('/'))
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials()));

var app = builder.Build();

if (string.IsNullOrEmpty(nexusOptions.GitHubWebhookSecret))
    app.Logger.LogWarning("GITHUB_WEBHOOK_SECRET is not set — webhook signature verification disabled.");

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseMiddleware<ApiKeyMiddleware>();
app.MapControllers();

app.Run();
