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
    public async Task<IActionResult> GetByQuickLink([FromQuery] Guid quickLinkId)
    {
        var notes = await _repo.GetByQuickLinkIdAsync(quickLinkId);
        return Ok(notes);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateNoteRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Body))
            return BadRequest(new { error = "Note body cannot be empty." });

        var note = await _repo.CreateAsync(request);
        return CreatedAtAction(nameof(GetByQuickLink),
            new { quickLinkId = note.QuickLinkId }, note);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var deleted = await _repo.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }
}
