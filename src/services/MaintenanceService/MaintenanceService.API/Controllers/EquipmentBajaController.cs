using MaintenanceService.Domain.Entities;
using MaintenanceService.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MaintenanceService.API.Controllers;

/// <summary>
/// Endpoint interno: recibe la notificación de baja desde EquipmentService
/// y la persiste como StatusHistory, vinculada al último TicketEquipment activo
/// del equipo dado de baja.
/// </summary>
[ApiController]
[Route("api/equipments")]
public class EquipmentBajaController : ControllerBase
{
    private readonly MaintenanceDbContext _db;

    public EquipmentBajaController(MaintenanceDbContext db) => _db = db;

    // POST /api/equipments/{equipmentId}/baja-history
    [HttpPost("{equipmentId:guid}/baja-history")]
    public async Task<IActionResult> RegisterBajaHistory(
        Guid equipmentId,
        [FromBody] BajaHistoryDto dto)
    {
        // Buscar el TicketEquipment más reciente del equipo que NO esté en un ticket ya cerrado
        // (el ticket en curso desde donde se dio de baja)
        var te = await _db.TicketEquipments
            .Include(x => x.Ticket)
            .Where(x => x.EquipmentId == equipmentId && x.Ticket.Status != "Terminado")
            .OrderByDescending(x => x.Ticket.CreatedAt)
            .FirstOrDefaultAsync();

        // Si no hay ticket activo, registrar igualmente pero sin EntityId de TicketEquipment
        // (usamos el equipmentId directamente como referencia)
        var entityType = te != null ? "TicketEquipment" : "Equipment";
        var entityId   = te?.Id ?? equipmentId;

        var history = new StatusHistory
        {
            Id              = Guid.NewGuid(),
            EntityType      = entityType,
            EntityId        = entityId,
            PreviousStatus  = dto.PreviousStatus ?? "Activo",
            NewStatus       = dto.NewStatus,
            Comment         = dto.Comment,
            ChangedByUserId = dto.ChangedByUserId ?? Guid.Empty,
            ChangedAt       = dto.ChangedAt ?? DateTime.Now
        };

        _db.StatusHistories.Add(history);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Historial de baja registrado.", history.Id });
    }
}

public class BajaHistoryDto
{
    public string? PreviousStatus  { get; set; }
    public string  NewStatus       { get; set; } = "Dado de baja";
    public string? Comment         { get; set; }
    public Guid?   ChangedByUserId { get; set; }
    public DateTime? ChangedAt     { get; set; }
}
