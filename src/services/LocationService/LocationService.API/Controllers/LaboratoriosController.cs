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
                CurrentOccupancy = l.EquipmentLocations.Count(el => el.IsCurrent && el.RemovedAt == null),
                AvailableSlots = l.Capacity - l.EquipmentLocations.Count(el => el.IsCurrent && el.RemovedAt == null),
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
        var lab = await _context.Laboratories
            .Include(l => l.LaboratoryCapacities.Where(c => c.IsActive))
            .FirstOrDefaultAsync(l => l.Id == id);

        if (lab == null || !lab.IsActive)
            return NotFound(new { message = "Laboratorio no encontrado." });

        return Ok(new
        {
            lab.Id,
            lab.Name,
            lab.Building,
            lab.Floor,
            lab.Capacity,
            lab.IsActive,
            lab.CreatedAt,
            Capacities = lab.LaboratoryCapacities
                .OrderBy(c => c.EquipmentTypeName)
                .Select(c => new
                {
                    c.Id,
                    c.EquipmentTypeId,
                    c.EquipmentTypeName,
                    c.MaxCapacity,
                    c.IsActive,
                    c.CreatedAt,
                    c.UpdatedAt
                })
        });
    }

    // POST: api/laboratorios
    // POST: api/laboratorios
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateLaboratoryDto dto)
    {
        if (await _context.Laboratories.AnyAsync(l => l.Name == dto.Name && l.IsActive))
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

        return CreatedAtAction(nameof(GetById), new { id = lab.Id }, new
        {
            lab.Id,
            lab.Name,
            lab.Building,
            lab.Floor,
            lab.Capacity,
            lab.IsActive,
            lab.CreatedAt
        });
    }

    // PUT: api/laboratorios/{id}
    // PUT: api/laboratorios/{id}
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateLaboratoryDto dto)
    {
        var lab = await _context.Laboratories.FindAsync(id);

        if (lab == null || !lab.IsActive)
            return NotFound(new { message = "Laboratorio no encontrado." });

        if (await _context.Laboratories.AnyAsync(l => l.Name == dto.Name && l.Id != id && l.IsActive))
            return BadRequest(new { message = "Ya existe un laboratorio con ese nombre." });

        lab.Name = dto.Name;
        lab.Building = dto.Building;
        lab.Floor = dto.Floor;
        lab.Capacity = dto.Capacity;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            lab.Id,
            lab.Name,
            lab.Building,
            lab.Floor,
            lab.Capacity,
            lab.IsActive,
            lab.CreatedAt
        });
    }

    // DELETE: api/laboratorios/{id}
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var lab = await _context.Laboratories
            .Include(l => l.EquipmentLocations.Where(el => el.IsCurrent && el.RemovedAt == null))
            .FirstOrDefaultAsync(l => l.Id == id);

        if (lab == null || !lab.IsActive)
            return NotFound(new { message = "Laboratorio no encontrado." });

        if (lab.EquipmentLocations.Any())
            return BadRequest(new { message = "No se puede eliminar un laboratorio con equipos asignados." });

        lab.IsActive = false;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Laboratorio eliminado correctamente." });
    }

    // GET: api/laboratorios/{laboratoryId}/capacidades
    [HttpGet("{laboratoryId:guid}/capacidades")]
    public async Task<IActionResult> GetCapacities(Guid laboratoryId)
    {
        var laboratoryExists = await _context.Laboratories
            .AnyAsync(l => l.Id == laboratoryId && l.IsActive);

        if (!laboratoryExists)
            return NotFound(new { message = "Laboratorio no encontrado." });

        var capacities = await _context.LaboratoryCapacities
            .Where(c => c.LaboratoryId == laboratoryId && c.IsActive)
            .OrderBy(c => c.EquipmentTypeName)
            .Select(c => new
            {
                c.Id,
                c.LaboratoryId,
                c.EquipmentTypeId,
                c.EquipmentTypeName,
                c.MaxCapacity,
                c.IsActive,
                c.CreatedAt,
                c.UpdatedAt
            })
            .ToListAsync();

        return Ok(capacities);
    }

    // POST: api/laboratorios/{laboratoryId}/capacidades
    [HttpPost("{laboratoryId:guid}/capacidades")]
    public async Task<IActionResult> CreateCapacity(Guid laboratoryId, [FromBody] CreateLaboratoryCapacityDto dto)
    {
        if (dto.EquipmentTypeId == Guid.Empty)
            return BadRequest(new { message = "Debe enviar un tipo de equipo válido." });

        if (dto.MaxCapacity <= 0)
            return BadRequest(new { message = "La capacidad máxima debe ser mayor que cero." });

        var laboratory = await _context.Laboratories
            .FirstOrDefaultAsync(l => l.Id == laboratoryId && l.IsActive);

        if (laboratory == null)
            return NotFound(new { message = "Laboratorio no encontrado." });

        var existing = await _context.LaboratoryCapacities
            .FirstOrDefaultAsync(c =>
                c.LaboratoryId == laboratoryId &&
                c.EquipmentTypeId == dto.EquipmentTypeId &&
                c.IsActive);

        if (existing != null)
            return BadRequest(new { message = "Ya existe una capacidad para este tipo de equipo en este laboratorio." });

        var capacity = new LaboratoryCapacity
        {
            Id = Guid.NewGuid(),
            LaboratoryId = laboratoryId,
            EquipmentTypeId = dto.EquipmentTypeId,
            EquipmentTypeName = dto.EquipmentTypeName,
            MaxCapacity = dto.MaxCapacity,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.LaboratoryCapacities.Add(capacity);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            capacity.Id,
            capacity.LaboratoryId,
            capacity.EquipmentTypeId,
            capacity.EquipmentTypeName,
            capacity.MaxCapacity,
            capacity.IsActive,
            capacity.CreatedAt,
            capacity.UpdatedAt
        });
    }

    // PUT: api/laboratorios/{laboratoryId}/capacidades/{capacityId}
    [HttpPut("{laboratoryId:guid}/capacidades/{capacityId:guid}")]
    public async Task<IActionResult> UpdateCapacity(Guid laboratoryId, Guid capacityId, [FromBody] UpdateLaboratoryCapacityDto dto)
    {
        if (dto.MaxCapacity <= 0)
            return BadRequest(new { message = "La capacidad máxima debe ser mayor que cero." });

        var capacity = await _context.LaboratoryCapacities
            .FirstOrDefaultAsync(c =>
                c.Id == capacityId &&
                c.LaboratoryId == laboratoryId &&
                c.IsActive);

        if (capacity == null)
            return NotFound(new { message = "Capacidad no encontrada." });

        capacity.EquipmentTypeName = dto.EquipmentTypeName ?? capacity.EquipmentTypeName;
        capacity.MaxCapacity = dto.MaxCapacity;
        capacity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            capacity.Id,
            capacity.LaboratoryId,
            capacity.EquipmentTypeId,
            capacity.EquipmentTypeName,
            capacity.MaxCapacity,
            capacity.IsActive,
            capacity.CreatedAt,
            capacity.UpdatedAt
        });
    }

    // DELETE: api/laboratorios/{laboratoryId}/capacidades/{capacityId}
    [HttpDelete("{laboratoryId:guid}/capacidades/{capacityId:guid}")]
    public async Task<IActionResult> DeleteCapacity(Guid laboratoryId, Guid capacityId)
    {
        var capacity = await _context.LaboratoryCapacities
            .FirstOrDefaultAsync(c =>
                c.Id == capacityId &&
                c.LaboratoryId == laboratoryId &&
                c.IsActive);

        if (capacity == null)
            return NotFound(new { message = "Capacidad no encontrada." });

        capacity.IsActive = false;
        capacity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Capacidad desactivada correctamente." });
    }
}

public record CreateLaboratoryDto(
    string Name,
    string? Building,
    string? Floor,
    int Capacity
);

public class CreateLaboratoryCapacityDto
{
    public Guid EquipmentTypeId { get; set; }
    public string? EquipmentTypeName { get; set; }
    public int MaxCapacity { get; set; }
}

public class UpdateLaboratoryCapacityDto
{
    public string? EquipmentTypeName { get; set; }
    public int MaxCapacity { get; set; }
}