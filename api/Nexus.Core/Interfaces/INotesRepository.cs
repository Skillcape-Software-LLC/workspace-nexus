using Nexus.Core.DTOs;

namespace Nexus.Core.Interfaces;

public interface INotesRepository
{
    Task<List<NoteDto>> GetByQuickLinkIdAsync(Guid quickLinkId);
    Task<NoteDto> CreateAsync(CreateNoteRequest request);
    Task<bool> DeleteAsync(Guid noteId);
}
