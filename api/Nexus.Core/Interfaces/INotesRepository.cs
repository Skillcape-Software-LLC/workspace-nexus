using Nexus.Core.DTOs;

namespace Nexus.Core.Interfaces;

public interface INotesRepository
{
    Task<List<NoteDto>> GetAllAsync(string? search = null, string? category = null,
                                    string? clientName = null, string? tag = null);
    Task<List<NoteDto>> GetByQuickLinkIdAsync(Guid quickLinkId);
    Task<NoteDto?> GetByIdAsync(Guid noteId);
    Task<NoteDto> CreateAsync(CreateNoteRequest request);
    Task<NoteDto?> UpdateAsync(Guid noteId, UpdateNoteRequest request);
    Task<bool> DeleteAsync(Guid noteId);
    Task<List<NoteDto>> GetArchivedAsync();
    Task<bool> ArchiveAsync(Guid noteId);
    Task<bool> RestoreAsync(Guid noteId);
}
