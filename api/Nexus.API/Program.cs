using Nexus.API.Middleware;
using Nexus.Core.Interfaces;
using Nexus.Infrastructure;
using Nexus.Infrastructure.Database;
using Nexus.Infrastructure.GoogleServices;
using Nexus.Core.Interfaces;
using Nexus.Infrastructure.Repositories;

var builder = WebApplication.CreateBuilder(args);

// Map env vars to NexusOptions
var nexusOptions = new NexusOptions
{
    DatabasePath = builder.Configuration["DATABASE_PATH"] ?? "/app/data/nexus.db",
    ApiKey = builder.Configuration["API_KEY"],
    GoogleImpersonateUser = builder.Configuration["GOOGLE_IMPERSONATE_USER"],
    GoogleCredentialsPath = builder.Configuration["GOOGLE_CREDENTIALS_PATH"],
    GitHubPat = builder.Configuration["GITHUB_PAT"],
    GitHubWebhookSecret = builder.Configuration["GITHUB_WEBHOOK_SECRET"],
    ClaudeApiKey = builder.Configuration["CLAUDE_API_KEY"],
    BriefingSchedule = builder.Configuration["BRIEFING_SCHEDULE"] ?? "30 7 * * *",
    CiPollingIntervalMinutes = int.TryParse(builder.Configuration["CI_POLLING_INTERVAL_MINUTES"], out var mins) ? mins : 5
};

builder.Services.Configure<NexusOptions>(opt =>
{
    opt.DatabasePath = nexusOptions.DatabasePath;
    opt.ApiKey = nexusOptions.ApiKey;
    opt.GoogleImpersonateUser = nexusOptions.GoogleImpersonateUser;
    opt.GoogleCredentialsPath = nexusOptions.GoogleCredentialsPath;
    opt.GitHubPat = nexusOptions.GitHubPat;
    opt.GitHubWebhookSecret = nexusOptions.GitHubWebhookSecret;
    opt.ClaudeApiKey = nexusOptions.ClaudeApiKey;
    opt.BriefingSchedule = nexusOptions.BriefingSchedule;
    opt.CiPollingIntervalMinutes = nexusOptions.CiPollingIntervalMinutes;
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
builder.Services.AddScoped<IWatchedAccountRepository>(_ => new WatchedAccountRepository(connectionString));
builder.Services.AddSingleton<GitHubService>();
builder.Services.AddHostedService<CiPollingService>();

// Google services
builder.Services.AddSingleton<GoogleAuthService>();
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
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseMiddleware<ApiKeyMiddleware>();
app.MapControllers();

app.Run();
