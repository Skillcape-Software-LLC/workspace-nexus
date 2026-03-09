using Nexus.Core.Models;

namespace Nexus.Core.Interfaces;

public interface ICiStatusRepository
{
    Task<List<CiStatus>> GetAllAsync();
    Task<CiStatus?> GetByRepoAsync(string repoFullName);
    Task UpsertAsync(CiStatus status);
}
