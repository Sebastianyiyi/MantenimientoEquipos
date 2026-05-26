using MaintenanceService.Application.DTOs;
using MaintenanceService.Domain.Entities;
using MaintenanceService.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MaintenanceService.API.Controllers;

[ApiController]
[Route("api")]
public class StatusController : ControllerBase
{
    private readonly MaintenanceDbContext _db;

    private static readonly string[] ValidStatuses =
        ["Pendiente", "En Proceso", "Terminado"];

    private static bool IsValidTransition(string current, string next)
    {
        return (current, next) switch
        {
            ("Pendiente",  "En Proceso") => true,
            ("En Proceso", "Terminado")  => true,
            _ => false
        };
    }

    private readonly IHttpClientFactory _httpClientFactory;

    public StatusController(MaintenanceDbContext db, IHttpClientFactory httpClientFactory)
    {
        _db = db;
        _httpClientFactory = httpClientFactory;
    }

    // PUT /api/tickets/{id}/status  → estado general del caso
    [HttpPut("tickets/{id:guid}/status")]
    public async Task<IActionResult> UpdateTicketStatus(Guid id, [FromBody] UpdateStatusDto dto)
    {
        if (!ValidStatuses.Contains(dto.NewStatus))
            return BadRequest("Estado inválido.");

        var ticket = await _db.Tickets.FindAsync(id);
        if (ticket == null) return NotFound("Caso no encontrado.");

        if (!IsValidTransition(ticket.Status, dto.NewStatus))
            return BadRequest($"No se puede cambiar el estado de '{ticket.Status}' a '{dto.NewStatus}'.");

        var history = new StatusHistory
        {
            Id              = Guid.NewGuid(),
            EntityType      = "Ticket",
            EntityId        = ticket.Id,
            PreviousStatus  = ticket.Status,
            NewStatus       = dto.NewStatus,
            Comment         = dto.Comment,
            ChangedByUserId = dto.ChangedByUserId,
            ChangedAt       = DateTime.Now
        };

        ticket.Status    = dto.NewStatus;
        ticket.UpdatedAt = DateTime.Now;

        if (dto.NewStatus == "Terminado")
        {
            ticket.ClosedAt = DateTime.Now;

            // Volver equipos a "Activo"
            try
            {
                var teList = await _db.TicketEquipments
                    .Where(te => te.TicketId == ticket.Id)
                    .ToListAsync();

                var client = _httpClientFactory.CreateClient();
                foreach (var te in teList)
                {
                    await client.PatchAsJsonAsync(
                        $"http://localhost:5002/api/equipments/{te.EquipmentId}/status",
                        new { status = "Activo" }
                    );
                }
            }
            catch { /* silencioso */ }
        }

        _db.StatusHistories.Add(history);
        await _db.SaveChangesAsync();

        return Ok(new { ticket.Id, ticket.Status, ticket.UpdatedAt, ticket.ClosedAt });
    }

    // PUT /api/ticket-equipments/{id}/status  → estado por equipo
    [HttpPut("ticket-equipments/{id:guid}/status")]
    public async Task<IActionResult> UpdateEquipmentStatus(Guid id, [FromBody] UpdateStatusDto dto)
    {
        if (!ValidStatuses.Contains(dto.NewStatus))
            return BadRequest("Estado inválido.");

        var te = await _db.TicketEquipments
            .Include(x => x.Ticket)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (te == null) return NotFound("Equipo del caso no encontrado.");
        if (te.Ticket.Status == "Terminado")
            return BadRequest("El caso ya está terminado y no permite cambios.");

        if (!IsValidTransition(te.Status, dto.NewStatus))
            return BadRequest($"No se puede cambiar el estado de '{te.Status}' a '{dto.NewStatus}'.");

        var history = new StatusHistory
        {
            Id              = Guid.NewGuid(),
            EntityType      = "TicketEquipment",
            EntityId        = te.Id,
            PreviousStatus  = te.Status,
            NewStatus       = dto.NewStatus,
            Comment         = dto.Comment,
            ChangedByUserId = dto.ChangedByUserId,
            ChangedAt       = DateTime.Now
        };

        te.Status                    = dto.NewStatus;
        te.LastStatusChangedAt       = DateTime.Now;
        te.LastStatusChangedByUserId = dto.ChangedByUserId;

        _db.StatusHistories.Add(history);
        await _db.SaveChangesAsync();

        return Ok(new { te.Id, te.Status, te.LastStatusChangedAt });
    }

    // GET /api/tickets/{id}/status-history  → historial del caso completo
    [HttpGet("tickets/{id:guid}/status-history")]
    public async Task<IActionResult> GetTicketHistory(Guid id)
    {
        var ticket = await _db.Tickets
            .Include(t => t.TicketEquipments)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (ticket == null) return NotFound();

        var teIds = ticket.TicketEquipments.Select(te => te.Id).ToList();

        var history = await _db.StatusHistories
            .Where(h =>
                (h.EntityType == "Ticket" && h.EntityId == id) ||
                (h.EntityType == "TicketEquipment" && teIds.Contains(h.EntityId)))
            .OrderByDescending(h => h.ChangedAt)
            .Select(h => new
            {
                h.Id,
                h.EntityType,
                h.EntityId,
                h.PreviousStatus,
                h.NewStatus,
                h.Comment,
                h.ChangedByUserId,
                h.ChangedAt
            })
            .ToListAsync();

        return Ok(history);
    }
}