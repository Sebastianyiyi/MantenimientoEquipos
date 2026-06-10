using EquipmentService.Domain.Entities;
using EquipmentService.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EquipmentService.API.Controllers;

[ApiController]
[Route("api/equipment-types")]
public class EquipmentTypesController : ControllerBase
{
    private readonly EquipmentDbContext _context;

    public EquipmentTypesController(EquipmentDbContext context)
    {
        _context = context;
    }

    // GET: api/equipment-types
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var types = await _context.EquipmentTypes
            .OrderBy(t => t.Name)
            .Select(t => new
            {
                t.Id,
                t.Name,
                t.Description,
                EquipmentCount = t.Equipments.Count
            })
            .ToListAsync();

        return Ok(types);
    }

    // GET: api/equipment-types/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var type = await _context.EquipmentTypes.FindAsync(id);
        if (type == null)
            return NotFound(new { message = "Tipo de equipo no encontrado." });

        return Ok(type);
    }

    // POST: api/equipment-types
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] EquipmentTypeDto dto)
    {
        if (await _context.EquipmentTypes.AnyAsync(t => t.Name == dto.Name))
            return BadRequest(new { message = "Ya existe un tipo de equipo con ese nombre." });

        var type = new EquipmentType
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            Description = dto.Description
        };

        _context.EquipmentTypes.Add(type);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = type.Id }, type);
    }

    // PUT: api/equipment-types/{id}
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] EquipmentTypeDto dto)
    {
        var type = await _context.EquipmentTypes.FindAsync(id);
        if (type == null)
            return NotFound(new { message = "Tipo de equipo no encontrado." });

        if (await _context.EquipmentTypes.AnyAsync(t => t.Name == dto.Name && t.Id != id))
            return BadRequest(new { message = "Ya existe un tipo de equipo con ese nombre." });

        type.Name = dto.Name;
        type.Description = dto.Description;

        await _context.SaveChangesAsync();
        return Ok(type);
    }

    // DELETE: api/equipment-types/{id}
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var type = await _context.EquipmentTypes
            .Include(t => t.Equipments)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (type == null)
            return NotFound(new { message = "Tipo de equipo no encontrado." });

        if (type.Equipments.Any())
            return BadRequest(new { message = "No se puede eliminar un tipo que tiene equipos registrados." });

        _context.EquipmentTypes.Remove(type);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Tipo de equipo eliminado correctamente." });
    }
}

public record EquipmentTypeDto(
    string Name,
    string? Description
);