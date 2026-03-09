using Nexus.Core.Models;

namespace Nexus.Core.Interfaces;

public interface IWatchedAccountRepository
{
    Task<List<WatchedAccount>> GetAllAsync();
    Task<WatchedAccount?> GetByNameAsync(string accountName);
    Task AddAsync(WatchedAccount account);
    Task<bool> DeleteAsync(string accountName);
}
