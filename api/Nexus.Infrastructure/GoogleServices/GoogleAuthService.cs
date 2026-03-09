using Google.Apis.Auth.OAuth2;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Nexus.Infrastructure.GoogleServices;

public class GoogleAuthService
{
    private readonly NexusOptions _options;
    private readonly ILogger<GoogleAuthService> _logger;
    private GoogleCredential? _credential;
    private bool _initialized;

    public GoogleAuthService(IOptions<NexusOptions> options, ILogger<GoogleAuthService> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public GoogleCredential? GetCredential(params string[] scopes)
    {
        if (_initialized) return _credential;
        _initialized = true;

        var path = _options.GoogleCredentialsPath;
        var user = _options.GoogleImpersonateUser;

        if (string.IsNullOrEmpty(path) || !File.Exists(path))
        {
            _logger.LogWarning("Google credentials file not found at '{Path}'. Google integrations disabled.", path);
            return null;
        }

        if (string.IsNullOrEmpty(user))
        {
            _logger.LogWarning("GOOGLE_IMPERSONATE_USER is not set. Google integrations disabled.");
            return null;
        }

        try
        {
#pragma warning disable CS0618
            _credential = GoogleCredential
                .FromFile(path)
                .CreateScoped(scopes)
                .CreateWithUser(user);
#pragma warning restore CS0618

            _logger.LogInformation("Google credentials loaded for {User}.", user);
            return _credential;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load Google credentials from '{Path}'.", path);
            return null;
        }
    }
}
