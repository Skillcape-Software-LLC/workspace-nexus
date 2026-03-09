using Microsoft.AspNetCore.Mvc;
using Nexus.Core.DTOs;
using Nexus.Core.Interfaces;

namespace Nexus.API.Controllers;

[ApiController]
[Route("api/quick-links")]
public class QuickLinksController : ControllerBase
{
    private readonly IQuickLinksRepository _repo;

    public QuickLinksController(IQuickLinksRepository repo) => _repo = repo;

    [HttpGet]
    public async Task<IActionResult> GetAll() =>
        Ok(await _repo.GetAllAsync());

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var link = await _repo.GetByIdAsync(id);
        return link == null ? NotFound() : Ok(link);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateQuickLinkRequest request)
    {
        var created = await _repo.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateQuickLinkRequest request)
    {
        var updated = await _repo.UpdateAsync(id, request);
        return updated == null ? NotFound() : Ok(updated);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var deleted = await _repo.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }

    [HttpPost("reorder")]
    public async Task<IActionResult> Reorder([FromBody] ReorderQuickLinksRequest request)
    {
        await _repo.ReorderAsync(request.Ids);
        return NoContent();
    }
}
