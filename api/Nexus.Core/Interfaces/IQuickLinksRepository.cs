using Nexus.Core.DTOs;

namespace Nexus.Core.Interfaces;

public interface IQuickLinksRepository
{
    Task<List<QuickLinkDto>> GetAllAsync();
    Task<QuickLinkDto?> GetByIdAsync(Guid id);
    Task<QuickLinkDto> CreateAsync(CreateQuickLinkRequest request);
    Task<QuickLinkDto?> UpdateAsync(Guid id, UpdateQuickLinkRequest request);
    Task<bool> DeleteAsync(Guid id);
    Task ReorderAsync(List<Guid> orderedIds);
}
