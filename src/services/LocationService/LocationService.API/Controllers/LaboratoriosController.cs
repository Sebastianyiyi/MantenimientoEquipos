using LocationService.Domain.Entities;
using LocationService.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LocationService.API.Controllers;

[ApiController]
[Route("api/laboratorios")]
public class LaboratoriosController : ControllerBase
{
    private readonly LocationDbContext _context;

    public LaboratoriosController(LocationDbContext context)
    {
        _context = context;
    }

    // GET: api/laboratorios
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var labs = await _context.Laboratories
            .Where(l => l.IsActive)
            .OrderBy(l => l.Name)
            .Select(l => new
            {
                l.Id,
                l.Name,
                l.Building,
                l.Floor,
                l.Capacity,
                l.IsActive,
                l.CreatedAt
            })
            .ToListAsync();

        return Ok(labs);
    }

    // GET: api/laboratorios/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var lab = await _context.Laboratories.FindAsync(id);
        if (lab == null || !lab.IsActive)
            return NotFound(new { message = "Laboratorio no encontrado." });

        return Ok(lab);
    }

    // POST: api/laboratorios
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateLaboratoryDto dto)
    {
        if (await _context.Laboratories.AnyAsync(l => l.Name == dto.Name))
            return BadRequest(new { message = "Ya existe un laboratorio con ese nombre." });

        var lab = new Laboratory
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            Building = dto.Building,
            Floor = dto.Floor,
            Capacity = dto.Capacity,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Laboratories.Add(lab);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = lab.Id }, lab);
    }

    // PUT: api/laboratorios/{id}
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateLaboratoryDto dto)
    {
        var lab = await _context.Laboratories.FindAsync(id);
        if (lab == null || !lab.IsActive)
            return NotFound(new { message = "Laboratorio no encontrado." });

        if (await _context.Laboratories.AnyAsync(l => l.Name == dto.Name && l.Id != id))
            return BadRequest(new { message = "Ya existe un laboratorio con ese nombre." });

        lab.Name = dto.Name;
        lab.Building = dto.Building;
        lab.Floor = dto.Floor;
        lab.Capacity = dto.Capacity;

        await _context.SaveChangesAsync();
        return Ok(lab);
    }

    // DELETE: api/laboratorios/{id}
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var lab = await _context.Laboratories
            .Include(l => l.EquipmentLocations.Where(el => el.IsCurrent))
            .FirstOrDefaultAsync(l => l.Id == id);

        if (lab == null || !lab.IsActive)
            return NotFound(new { message = "Laboratorio no encontrado." });

        if (lab.EquipmentLocations.Any())
            return BadRequest(new { message = "No se puede eliminar un laboratorio con equipos asignados." });

        lab.IsActive = false;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Laboratorio eliminado correctamente." });
    }
}

public record CreateLaboratoryDto(
    string Name,
    string? Building,
    string? Floor,
    int Capacity
);