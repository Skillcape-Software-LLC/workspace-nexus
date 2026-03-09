using Nexus.Core.Models;

namespace Nexus.Core.Interfaces;

public interface IWatchedRepoRepository
{
    Task<List<WatchedRepo>> GetAllAsync();
    Task<WatchedRepo?> GetByFullNameAsync(string repoFullName);
    Task AddAsync(WatchedRepo repo);
    Task<bool> DeleteAsync(string repoFullName);
}
