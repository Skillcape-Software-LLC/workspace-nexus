using Microsoft.AspNetCore.Mvc;
using Nexus.Core.DTOs;
using Nexus.Core.Interfaces;

namespace Nexus.API.Controllers;

[ApiController]
[Route("api/notes")]
public class NotesController : ControllerBase
{
    private readonly INotesRepository _repo;

    public NotesController(INotesRepository repo) => _repo = repo;

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? quickLinkId,
        [FromQuery] string? search,
        [FromQuery] string? category,
        [FromQuery] string? clientName,
        [FromQuery] string? tag)
    {
        if (quickLinkId.HasValue)
            return Ok(await _repo.GetByQuickLinkIdAsync(quickLinkId.Value));

        return Ok(await _repo.GetAllAsync(search, category, clientName, tag));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var note = await _repo.GetByIdAsync(id);
        return note == null ? NotFound() : Ok(note);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateNoteRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Body))
            return BadRequest(new { error = "Note body cannot be empty." });

        var note = await _repo.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = note.Id }, note);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateNoteRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Body))
            return BadRequest(new { error = "Note body cannot be empty." });

        var updated = await _repo.UpdateAsync(id, request);
        return updated == null ? NotFound() : Ok(updated);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Archive(Guid id)
    {
        var archived = await _repo.ArchiveAsync(id);
        return archived ? NoContent() : NotFound();
    }

    [HttpPost("{id:guid}/restore")]
    public async Task<IActionResult> Restore(Guid id)
    {
        var restored = await _repo.RestoreAsync(id);
        return restored ? NoContent() : NotFound();
    }

    [HttpDelete("{id:guid}/permanent")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var deleted = await _repo.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }

    [HttpGet("archived")]
    public async Task<IActionResult> GetArchived()
    {
        return Ok(await _repo.GetArchivedAsync());
    }
}
