using EquipmentService.Domain.Entities;
using EquipmentService.Infrastructure.Data;
using EquipmentService.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EquipmentService.API.Controllers;

[ApiController]
[Route("api/equipments")]
public class EquipmentsController : ControllerBase
{
    private readonly EquipmentDbContext _context;
    private readonly EquipmentCodeService _codeService;
    private readonly AuthServiceClient _authServiceClient;
    private readonly IHttpClientFactory _httpClientFactory;

    public EquipmentsController(
        EquipmentDbContext context,
        EquipmentCodeService codeService,
        AuthServiceClient authServiceClient,
        IHttpClientFactory httpClientFactory)
    {
        _context = context;
        _codeService = codeService;
        _authServiceClient = authServiceClient;
        _httpClientFactory = httpClientFactory;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? status, [FromQuery] string? search)
    {
        var query = _context.Equipments
            .Where(e => e.IsActive)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(e => e.Status == status);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(e =>
                e.Code.Contains(search) ||
                e.AssetTag.Contains(search) ||
                e.Brand.Contains(search) ||
                e.Model.Contains(search) ||
                e.SerialNumber.Contains(search) ||
                (e.LaboratoristaNombre != null && e.LaboratoristaNombre.Contains(search)));

        var equipments = await query
            .OrderBy(e => e.Code)
            .Select(e => new
            {
                e.Id,
                e.Code,
                e.AssetTag,
                e.Brand,
                e.Model,
                e.SerialNumber,
                e.Status,
                e.IsActive,
                e.PurchaseDate,
                e.SpecificationsJson,
                e.ImportSource,
                e.CreatedAt,
                e.UpdatedAt,
                e.LaboratoristaUserId,
                e.LaboratoristaNombre,
                e.BajaMotivo,
                e.BajaAt,
                EquipmentType = new
                {
                    e.EquipmentType.Id,
                    e.EquipmentType.Name
                }
            })
            .ToListAsync();

        return Ok(equipments);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var equipment = await _context.Equipments
            .Include(e => e.EquipmentType)
            .FirstOrDefaultAsync(e => e.Id == id && e.IsActive);

        if (equipment == null)
            return NotFound(new { message = "Equipo no encontrado." });

        return Ok(new
        {
            equipment.Id,
            equipment.Code,
            equipment.AssetTag,
            equipment.Brand,
            equipment.Model,
            equipment.SerialNumber,
            equipment.Status,
            equipment.IsActive,
            equipment.PurchaseDate,
            equipment.SpecificationsJson,
            equipment.ImportSource,
            equipment.CreatedAt,
            equipment.UpdatedAt,
            equipment.LaboratoristaUserId,
            equipment.LaboratoristaNombre,
            equipment.BajaMotivo,
            equipment.BajaAt,
            EquipmentType = new
            {
                equipment.EquipmentType.Id,
                equipment.EquipmentType.Name
            }
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateEquipmentDto dto)
    {
        if (await _context.Equipments.AnyAsync(e => e.SerialNumber == dto.SerialNumber))
            return BadRequest(new { message = "Ya existe un equipo con ese número de serie." });

        if (await _context.Equipments.AnyAsync(e => e.AssetTag == dto.AssetTag))
            return BadRequest(new { message = "Ya existe un equipo con ese AssetTag." });

        var equipmentType = await _context.EquipmentTypes
            .FirstOrDefaultAsync(t => t.Id == dto.EquipmentTypeId);

        if (equipmentType == null)
            return BadRequest(new { message = "El tipo de equipo no existe." });

        await using var tx = await _context.Database.BeginTransactionAsync();

        try
        {
            var code = await _codeService.GenerateNextCodeAsync(equipmentType.Id, equipmentType.Name);

            LaboratoristaValidationResult? laboratorista = null;

            if (dto.LaboratoristaUserId.HasValue)
            {
                try
                {
                    laboratorista = await _authServiceClient.ValidateLaboratoristaAsync(dto.LaboratoristaUserId.Value);
                }
                catch (Exception ex)
                {
                    await tx.RollbackAsync();
                    return BadRequest(new
                    {
                        message = "No se pudo validar el laboratorista.",
                        detail = ex.Message
                    });
                }

                if (laboratorista == null)
                {
                    await tx.RollbackAsync();
                    return NotFound(new { message = "El usuario asignado no existe." });
                }

                if (!laboratorista.IsActive)
                {
                    await tx.RollbackAsync();
                    return BadRequest(new { message = "El usuario asignado está inactivo." });
                }

                if (laboratorista.Role != "Laboratorista")
                {
                    await tx.RollbackAsync();
                    return BadRequest(new { message = "El usuario asignado no tiene rol de laboratorista." });
                }
            }

            var equipment = new Equipment
            {
                Id = Guid.NewGuid(),
                Code = code,
                AssetTag = dto.AssetTag,
                Brand = dto.Brand,
                Model = dto.Model,
                SerialNumber = dto.SerialNumber,
                Status = "Activo",
                IsActive = true,
                PurchaseDate = dto.PurchaseDate,
                SpecificationsJson = string.IsNullOrWhiteSpace(dto.SpecificationsJson) ? "{}" : dto.SpecificationsJson,
                ImportSource = string.IsNullOrWhiteSpace(dto.ImportSource) ? "Manual" : dto.ImportSource,
                EquipmentTypeId = dto.EquipmentTypeId,
                CreatedAt = DateTime.UtcNow,
                LaboratoristaUserId = laboratorista?.Id,
                LaboratoristaNombre = laboratorista?.FullName
            };

            _context.Equipments.Add(equipment);
            await _context.SaveChangesAsync();
            await tx.CommitAsync();

            return CreatedAtAction(nameof(GetById), new { id = equipment.Id }, new
            {
                equipment.Id,
                equipment.Code
            });
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateEquipmentDto dto)
    {
        var equipment = await _context.Equipments
            .FirstOrDefaultAsync(e => e.Id == id && e.IsActive);

        if (equipment == null)
            return NotFound(new { message = "Equipo no encontrado." });

        if (await _context.Equipments.AnyAsync(e => e.Id != id && e.AssetTag == dto.AssetTag))
            return BadRequest(new { message = "Ya existe otro equipo con ese AssetTag." });

        equipment.AssetTag = dto.AssetTag;
        equipment.Brand = dto.Brand;
        equipment.Model = dto.Model;
        equipment.PurchaseDate = dto.PurchaseDate;
        equipment.SpecificationsJson = string.IsNullOrWhiteSpace(dto.SpecificationsJson) ? "{}" : dto.SpecificationsJson;

        if (dto.LaboratoristaUserId.HasValue)
        {
            LaboratoristaValidationResult? laboratorista;

            try
            {
                laboratorista = await _authServiceClient.ValidateLaboratoristaAsync(dto.LaboratoristaUserId.Value);
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    message = "No se pudo validar el laboratorista.",
                    detail = ex.Message
                });
            }

            if (laboratorista == null)
                return NotFound(new { message = "El usuario asignado no existe." });

            if (!laboratorista.IsActive)
                return BadRequest(new { message = "El usuario asignado está inactivo." });

            if (laboratorista.Role != "Laboratorista")
                return BadRequest(new { message = "El usuario asignado no tiene rol de laboratorista." });

            equipment.LaboratoristaUserId = laboratorista.Id;
            equipment.LaboratoristaNombre = laboratorista.FullName;
        }
        else
        {
            equipment.LaboratoristaUserId = null;
            equipment.LaboratoristaNombre = null;
        }

        equipment.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Equipo actualizado correctamente." });
    }

    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateStatusDto dto)
    {
        var equipment = await _context.Equipments.FindAsync(id);
        if (equipment == null || !equipment.IsActive)
            return NotFound(new { message = "Equipo no encontrado." });

        var validStatuses = new[] { "Activo", "En mantenimiento", "Dado de baja", "En Pausa" };
        if (!validStatuses.Contains(dto.Status))
            return BadRequest(new { message = "Estado inválido." });

        equipment.Status = dto.Status;
        equipment.UpdatedAt = DateTime.Now;

        await _context.SaveChangesAsync();
        return Ok(new { message = "Estado actualizado correctamente.", equipment.Status });
    }

    [HttpPatch("{id:guid}/decommission")]
    public async Task<IActionResult> Decommission(Guid id, [FromBody] DecommissionDto dto)
    {
        var equipment = await _context.Equipments.FindAsync(id);
        if (equipment == null || !equipment.IsActive)
            return NotFound(new { message = "Equipo no encontrado." });

        if (string.IsNullOrWhiteSpace(dto.Motivo))
            return BadRequest(new { message = "Debe indicar el motivo de la baja." });

        var previousStatus = equipment.Status;

        equipment.Status = "Dado de baja";
        equipment.BajaMotivo = dto.Motivo.Trim();
        equipment.BajaAt = DateTime.Now;
        equipment.UpdatedAt = DateTime.Now;

        await _context.SaveChangesAsync();

        // Notificar a MaintenanceService para registrar el evento en el historial del equipo
        try
        {
            var client = _httpClientFactory.CreateClient();
            await client.PostAsJsonAsync(
                $"http://localhost:5004/api/equipments/{id}/baja-history",
                new
                {
                    previousStatus,
                    newStatus    = "Dado de baja",
                    comment      = dto.Motivo.Trim(),
                    changedByUserId = dto.CambiadoPorUserId,
                    changedAt    = equipment.BajaAt
                }
            );
        }
        catch { /* silencioso — no bloquear la baja si Maintenance no responde */ }

        return Ok(new { message = "Equipo dado de baja correctamente.", equipment.Status, equipment.BajaMotivo, equipment.BajaAt });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var equipment = await _context.Equipments.FindAsync(id);

        if (equipment == null || !equipment.IsActive)
            return NotFound(new { message = "Equipo no encontrado." });

        equipment.IsActive = false;
        equipment.Status = "Dado de baja";
        equipment.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Equipo dado de baja correctamente." });
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var total = await _context.Equipments.CountAsync(e => e.IsActive);
        var activos = await _context.Equipments.CountAsync(e => e.IsActive && e.Status == "Activo");
        var enMantenimiento = await _context.Equipments.CountAsync(e => e.IsActive && e.Status == "En mantenimiento");
        var dadosDeBaja = await _context.Equipments.CountAsync(e => e.IsActive && e.Status == "Dado de baja");

        var porTipo = await _context.Equipments
            .Where(e => e.IsActive)
            .GroupBy(e => e.EquipmentType.Name)
            .Select(g => new
            {
                tipo = g.Key,
                cantidad = g.Count()
            })
            .ToListAsync();

        return Ok(new { total, activos, enMantenimiento, dadosDeBaja, porTipo });
    }

    [HttpPatch("{id:guid}/assign-laboratorista")]
    public async Task<IActionResult> AssignLaboratorista(Guid id, [FromBody] AssignLaboratoristaDto dto)
    {
        var equipment = await _context.Equipments
            .FirstOrDefaultAsync(e => e.Id == id && e.IsActive);

        if (equipment == null)
            return NotFound(new { message = "Equipo no encontrado." });

        if (dto.UserId == Guid.Empty)
            return BadRequest(new { message = "Debe seleccionar un laboratorista válido." });

        LaboratoristaValidationResult? laboratorista;

        try
        {
            laboratorista = await _authServiceClient.ValidateLaboratoristaAsync(dto.UserId);
        }
        catch (Exception ex)
        {
            return BadRequest(new
            {
                message = "No se pudo validar el laboratorista.",
                detail = ex.Message
            });
        }

        if (laboratorista == null)
            return NotFound(new { message = "El usuario no existe." });

        if (!laboratorista.IsActive)
            return BadRequest(new { message = "El usuario está inactivo." });

        if (laboratorista.Role != "Laboratorista")
            return BadRequest(new { message = "El usuario no tiene rol de laboratorista." });

        equipment.LaboratoristaUserId = laboratorista.Id;
        equipment.LaboratoristaNombre = laboratorista.FullName;
        equipment.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Laboratorista asignado correctamente.",
            laboratorista = new
            {
                laboratorista.Id,
                laboratorista.FullName,
                laboratorista.Email
            }
        });
    }
}

public class CreateEquipmentDto
{
    public string AssetTag { get; set; } = null!;
    public string Brand { get; set; } = null!;
    public string Model { get; set; } = null!;
    public string SerialNumber { get; set; } = null!;
    public DateOnly PurchaseDate { get; set; }
    public string? SpecificationsJson { get; set; }
    public string? ImportSource { get; set; }
    public Guid EquipmentTypeId { get; set; }
    public Guid? LaboratoristaUserId { get; set; }
}

public class UpdateEquipmentDto
{
    public string AssetTag { get; set; } = null!;
    public string Brand { get; set; } = null!;
    public string Model { get; set; } = null!;
    public DateOnly PurchaseDate { get; set; }
    public string? SpecificationsJson { get; set; }
    public Guid? LaboratoristaUserId { get; set; }
}

public class UpdateStatusDto
{
    public string Status { get; set; } = null!;
}

public class DecommissionDto
{
    public string Motivo { get; set; } = null!;
    public Guid? CambiadoPorUserId { get; set; }
}

public class AssignLaboratoristaDto
{
    public Guid UserId { get; set; }
}