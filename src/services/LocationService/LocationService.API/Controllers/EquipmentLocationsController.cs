using LocationService.Domain.Entities;
using LocationService.Infrastructure.Data;
using LocationService.Infrastructure.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LocationService.API.Controllers;

[ApiController]
[Route("api/equipment-locations")]
public class EquipmentLocationsController : ControllerBase
{
    private readonly LocationDbContext _context;
    private readonly EquipmentServiceClient _equipmentServiceClient;

    public EquipmentLocationsController(
        LocationDbContext context,
        EquipmentServiceClient equipmentServiceClient)
    {
        _context = context;
        _equipmentServiceClient = equipmentServiceClient;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllCurrent()
    {
        var currentLocations = await _context.EquipmentLocations
            .Where(el => el.IsCurrent && el.RemovedAt == null)
            .Include(el => el.Laboratory)
            .Select(el => new
            {
                el.Id,
                el.EquipmentId,
                el.EquipmentTypeId,
                el.EquipmentTypeName,
                el.AssignedAt,
                el.Notes,
                Laboratory = new
                {
                    el.Laboratory.Id,
                    el.Laboratory.Name,
                    el.Laboratory.Building,
                    el.Laboratory.Floor,
                    el.Laboratory.Capacity
                }
            })
            .ToListAsync();

        return Ok(currentLocations);
    }

    [HttpGet("current/{equipmentId:guid}")]
    public async Task<IActionResult> GetCurrentByEquipment(Guid equipmentId)
    {
        var current = await _context.EquipmentLocations
            .Where(el => el.EquipmentId == equipmentId && el.IsCurrent && el.RemovedAt == null)
            .Include(el => el.Laboratory)
            .Select(el => new
            {
                el.Id,
                el.EquipmentId,
                el.EquipmentTypeId,
                el.EquipmentTypeName,
                el.AssignedAt,
                el.Notes,
                Laboratory = new
                {
                    el.Laboratory.Id,
                    el.Laboratory.Name,
                    el.Laboratory.Building,
                    el.Laboratory.Floor,
                    el.Laboratory.Capacity
                }
            })
            .FirstOrDefaultAsync();

        if (current == null)
            return NotFound(new { message = "El equipo no tiene una ubicación actual asignada." });

        return Ok(current);
    }

    [HttpGet("history/{equipmentId:guid}")]
    public async Task<IActionResult> GetHistoryByEquipment(Guid equipmentId)
    {
        var history = await _context.EquipmentLocations
            .Where(el => el.EquipmentId == equipmentId)
            .Include(el => el.Laboratory)
            .OrderByDescending(el => el.AssignedAt)
            .Select(el => new
            {
                el.Id,
                el.EquipmentId,
                el.EquipmentTypeId,
                el.EquipmentTypeName,
                el.AssignedAt,
                el.RemovedAt,
                el.IsCurrent,
                el.Notes,
                Laboratory = new
                {
                    el.Laboratory.Id,
                    el.Laboratory.Name,
                    el.Laboratory.Building,
                    el.Laboratory.Floor
                }
            })
            .ToListAsync();

        return Ok(history);
    }

    [HttpPost("assign")]
    public async Task<IActionResult> Assign([FromBody] AssignEquipmentLocationDto dto, CancellationToken cancellationToken)
    {
        if (dto.EquipmentId == Guid.Empty)
            return BadRequest(new { message = "Debe enviar un equipo válido." });

        if (dto.LaboratoryId == Guid.Empty)
            return BadRequest(new { message = "Debe seleccionar un laboratorio válido." });

        var laboratory = await _context.Laboratories
            .FirstOrDefaultAsync(l => l.Id == dto.LaboratoryId && l.IsActive, cancellationToken);

        if (laboratory == null)
            return NotFound(new { message = "Laboratorio no encontrado." });

        var equipment = await _equipmentServiceClient.GetEquipmentByIdAsync(dto.EquipmentId, cancellationToken);

        if (equipment == null)
            return NotFound(new { message = "Equipo no encontrado en EquipmentService." });

        var laboratoryCapacity = await _context.LaboratoryCapacities
            .FirstOrDefaultAsync(
                lc => lc.LaboratoryId == dto.LaboratoryId &&
                      lc.EquipmentTypeId == equipment.EquipmentTypeId &&
                      lc.IsActive,
                cancellationToken);

        if (laboratoryCapacity == null)
        {
            return BadRequest(new
            {
                message = "El laboratorio no tiene configuración de capacidad para este tipo de equipo.",
                laboratoryId = dto.LaboratoryId,
                equipmentTypeId = equipment.EquipmentTypeId,
                equipmentTypeName = equipment.EquipmentTypeName
            });
        }

        var currentAssignment = await _context.EquipmentLocations
            .FirstOrDefaultAsync(
                el => el.EquipmentId == dto.EquipmentId &&
                      el.IsCurrent &&
                      el.RemovedAt == null,
                cancellationToken);

        if (currentAssignment != null && currentAssignment.LaboratoryId == dto.LaboratoryId)
            return BadRequest(new { message = "El equipo ya está asignado a ese laboratorio." });

        var currentOccupancyByType = await _context.EquipmentLocations
            .CountAsync(
                el => el.LaboratoryId == dto.LaboratoryId &&
                      el.EquipmentTypeId == equipment.EquipmentTypeId &&
                      el.IsCurrent &&
                      el.RemovedAt == null,
                cancellationToken);

        if (currentOccupancyByType >= laboratoryCapacity.MaxCapacity)
        {
            return BadRequest(new
            {
                message = "El laboratorio ha alcanzado la capacidad máxima para este tipo de equipo.",
                equipmentTypeId = equipment.EquipmentTypeId,
                equipmentTypeName = equipment.EquipmentTypeName,
                capacity = laboratoryCapacity.MaxCapacity,
                currentOccupancy = currentOccupancyByType
            });
        }

        await using var tx = await _context.Database.BeginTransactionAsync(cancellationToken);

        try
        {
            if (currentAssignment != null)
            {
                currentAssignment.IsCurrent = false;
                currentAssignment.RemovedAt = DateTime.UtcNow;
            }

            var newAssignment = new EquipmentLocation
            {
                Id = Guid.NewGuid(),
                EquipmentId = dto.EquipmentId,
                EquipmentTypeId = equipment.EquipmentTypeId,
                EquipmentTypeName = equipment.EquipmentTypeName,
                LaboratoryId = dto.LaboratoryId,
                AssignedAt = DateTime.UtcNow,
                RemovedAt = null,
                IsCurrent = true,
                Notes = dto.Notes
            };

            _context.EquipmentLocations.Add(newAssignment);

            await _context.SaveChangesAsync(cancellationToken);
            await tx.CommitAsync(cancellationToken);

            return Ok(new
            {
                message = "Equipo asignado correctamente al laboratorio.",
                assignmentId = newAssignment.Id
            });
        }
        catch
        {
            await tx.RollbackAsync(cancellationToken);
            throw;
        }
    }

    [HttpPatch("remove/{equipmentId:guid}")]
    public async Task<IActionResult> Remove(Guid equipmentId, [FromBody] RemoveEquipmentLocationDto dto)
    {
        var currentAssignment = await _context.EquipmentLocations
            .FirstOrDefaultAsync(el => el.EquipmentId == equipmentId && el.IsCurrent && el.RemovedAt == null);

        if (currentAssignment == null)
            return NotFound(new { message = "El equipo no tiene una ubicación actual asignada." });

        currentAssignment.IsCurrent = false;
        currentAssignment.RemovedAt = DateTime.UtcNow;

        if (!string.IsNullOrWhiteSpace(dto.Notes))
            currentAssignment.Notes = dto.Notes;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Equipo removido del laboratorio correctamente." });
    }
}

public class AssignEquipmentLocationDto
{
    public Guid EquipmentId { get; set; }
    public Guid LaboratoryId { get; set; }
    public string? Notes { get; set; }
}

public class RemoveEquipmentLocationDto
{
    public string? Notes { get; set; }
}