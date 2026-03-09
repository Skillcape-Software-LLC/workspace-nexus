using Google.Apis.Auth;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Auth.OAuth2.Flows;
using Google.Apis.Auth.OAuth2.Requests;
using Google.Apis.Auth.OAuth2.Responses;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Nexus.Infrastructure.Repositories;

namespace Nexus.Infrastructure.GoogleServices;

public class GoogleAuthService
{
    private readonly NexusOptions _options;
    private readonly ILogger<GoogleAuthService> _logger;
    private readonly AppConfigDataStore _dataStore;

    private static readonly string[] Scopes =
    [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/chat.spaces.readonly",
        "https://www.googleapis.com/auth/chat.messages.readonly",
        "email",
        "profile"
    ];

    public GoogleAuthService(
        IOptions<NexusOptions> options,
        ILogger<GoogleAuthService> logger,
        string connectionString)
    {
        _options = options.Value;
        _logger = logger;
        _dataStore = new AppConfigDataStore(new AppConfigRepository(connectionString));
    }

    private GoogleAuthorizationCodeFlow BuildFlow() =>
        new(new GoogleAuthorizationCodeFlow.Initializer
        {
            ClientSecrets = new ClientSecrets
            {
                ClientId = _options.GoogleClientId,
                ClientSecret = _options.GoogleClientSecret
            },
            Scopes = Scopes,
            DataStore = _dataStore
        });

    private string RedirectUri =>
        $"{_options.NexusBaseUrl.TrimEnd('/')}/api/google/auth/callback";

    public string GetAuthorizationUrl(string state)
    {
        var flow = BuildFlow();
        var request = (GoogleAuthorizationCodeRequestUrl)flow.CreateAuthorizationCodeRequest(RedirectUri);
        request.State = state;
        request.Prompt = "consent";
        return request.Build().AbsoluteUri;
    }

    public async Task<string?> ExchangeCodeAsync(string code)
    {
        var flow = BuildFlow();
        var token = await flow.ExchangeCodeForTokenAsync("nexus_user", code, RedirectUri, CancellationToken.None);

        // Extract email from id_token
        string? email = null;
        if (!string.IsNullOrEmpty(token.IdToken))
        {
            try
            {
                var payload = await GoogleJsonWebSignature.ValidateAsync(token.IdToken);
                email = payload.Email;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not parse id_token to extract email.");
            }
        }

        return email;
    }

    public async Task<UserCredential?> GetCredentialAsync()
    {
        if (string.IsNullOrEmpty(_options.GoogleClientId) || string.IsNullOrEmpty(_options.GoogleClientSecret))
            return null;

        var flow = BuildFlow();
        var token = await _dataStore.GetAsync<TokenResponse>("nexus_user");
        if (token == null) return null;

        return new UserCredential(flow, "nexus_user", token);
    }

    public async Task<(bool Connected, string? Email)> GetStatusAsync()
    {
        var token = await _dataStore.GetAsync<TokenResponse>("nexus_user");
        if (token == null) return (false, null);

        string? email = null;
        if (!string.IsNullOrEmpty(token.IdToken))
        {
            try
            {
                var payload = await GoogleJsonWebSignature.ValidateAsync(token.IdToken,
                    new GoogleJsonWebSignature.ValidationSettings { ForceGoogleCertRefresh = false });
                email = payload.Email;
            }
            catch { /* id_token may be expired; skip email extraction */ }
        }

        return (true, email);
    }

    public async Task DisconnectAsync() => await _dataStore.ClearAsync();
}
