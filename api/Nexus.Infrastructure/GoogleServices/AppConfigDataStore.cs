using System.Text.Json;
using Google.Apis.Util.Store;
using Nexus.Infrastructure.Repositories;

namespace Nexus.Infrastructure.GoogleServices;

public class AppConfigDataStore : IDataStore
{
    private readonly AppConfigRepository _repo;
    private const string KeyPrefix = "google_token_";

    public AppConfigDataStore(AppConfigRepository repo) => _repo = repo;

    private static string ToKey(string userId) => $"{KeyPrefix}{userId}";

    public async Task StoreAsync<T>(string key, T value)
    {
        var json = JsonSerializer.Serialize(value);
        await _repo.SetAsync(ToKey(key), json);
    }

    public async Task<T> GetAsync<T>(string key)
    {
        var json = await _repo.GetAsync(ToKey(key));
        if (string.IsNullOrEmpty(json))
            return default!;
        return JsonSerializer.Deserialize<T>(json)!;
    }

    public async Task DeleteAsync<T>(string key) =>
        await _repo.DeleteAsync(ToKey(key));

    public async Task ClearAsync() =>
        await _repo.DeleteAsync(ToKey("nexus_user"));
}
