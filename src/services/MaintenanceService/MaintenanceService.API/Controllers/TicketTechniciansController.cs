using MaintenanceService.Domain.Entities;
using MaintenanceService.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MaintenanceService.API.Controllers;

[ApiController]
[Route("api/ticket-equipments/{ticketEquipmentId:guid}/technicians")]
public class TicketTechniciansController : ControllerBase
{
    private readonly MaintenanceDbContext _db;

    public TicketTechniciansController(MaintenanceDbContext db)
    {
        _db = db;
    }

    // GET api/ticket-equipments/{ticketEquipmentId}/technicians
    [HttpGet]
    public async Task<IActionResult> GetTechnicians(Guid ticketEquipmentId)
    {
        var exists = await _db.TicketEquipments.AnyAsync(te => te.Id == ticketEquipmentId);
        if (!exists)
            return NotFound(new { message = "TicketEquipment no encontrado." });

        var technicians = await _db.TicketTechnicians
            .Where(tt => tt.TicketEquipmentId == ticketEquipmentId)
            .Select(tt => new
            {
                tt.Id,
                tt.TechnicianUserId,
                tt.AssignedAt,
                tt.ActivityDescription,
                tt.Observations,
                tt.TicketEquipmentId
            })
            .ToListAsync();

        return Ok(technicians);
    }

    // POST api/ticket-equipments/{ticketEquipmentId}/technicians
    [HttpPost]
    public async Task<IActionResult> AssignTechnician(
        Guid ticketEquipmentId,
        [FromBody] AssignTechnicianRequest request)
    {
        var ticketEquipment = await _db.TicketEquipments
            .Include(te => te.Ticket)
            .FirstOrDefaultAsync(te => te.Id == ticketEquipmentId);

        if (ticketEquipment == null)
            return NotFound(new { message = "TicketEquipment no encontrado." });

        if (ticketEquipment.Ticket.Status == "Cerrado")
            return BadRequest(new { message = "No se pueden asignar técnicos a un caso cerrado." });

        // Validar que no esté ya asignado (HU-09: no duplicados)
        var alreadyAssigned = await _db.TicketTechnicians.AnyAsync(tt =>
            tt.TicketEquipmentId == ticketEquipmentId &&
            tt.TechnicianUserId == request.TechnicianUserId);

        if (alreadyAssigned)
            return Conflict(new { message = "El técnico ya está asignado a este equipo en el caso." });

        var technician = new TicketTechnician
        {
            Id = Guid.NewGuid(),
            TicketEquipmentId = ticketEquipmentId,
            TechnicianUserId = request.TechnicianUserId,
            AssignedAt = DateTime.UtcNow,
            ActivityDescription = request.ActivityDescription,
            Observations = request.Observations
        };

        _db.TicketTechnicians.Add(technician);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetTechnicians), new { ticketEquipmentId }, new
        {
            technician.Id,
            technician.TechnicianUserId,
            technician.AssignedAt,
            technician.ActivityDescription,
            technician.Observations,
            technician.TicketEquipmentId
        });
    }

    // PUT api/ticket-equipments/{ticketEquipmentId}/technicians/{technicianId}
    // Solo el propio técnico puede actualizar sus notas (HU-09 CA-2)
    [HttpPut("{technicianId:guid}")]
    public async Task<IActionResult> UpdateTechnicianNotes(
        Guid ticketEquipmentId,
        Guid technicianId,
        [FromBody] UpdateTechnicianNotesRequest request)
    {
        var technician = await _db.TicketTechnicians
            .FirstOrDefaultAsync(tt => tt.Id == technicianId && tt.TicketEquipmentId == ticketEquipmentId);

        if (technician == null)
            return NotFound(new { message = "Asignación de técnico no encontrada." });

        // Verificar que el usuario logueado es el propio técnico
        var currentUserIdClaim = User.FindFirst("sub")?.Value ?? User.FindFirst("userId")?.Value;
        if (currentUserIdClaim == null || !Guid.TryParse(currentUserIdClaim, out var currentUserId))
            return Unauthorized(new { message = "No se pudo identificar al usuario." });

        if (technician.TechnicianUserId != currentUserId)
            return Forbid(); // 403 — solo puedes editar tus propias notas

        technician.ActivityDescription = request.ActivityDescription;
        technician.Observations = request.Observations;

        await _db.SaveChangesAsync();

        return Ok(new
        {
            technician.Id,
            technician.TechnicianUserId,
            technician.AssignedAt,
            technician.ActivityDescription,
            technician.Observations,
            technician.TicketEquipmentId
        });
    }

    // DELETE api/ticket-equipments/{ticketEquipmentId}/technicians/{technicianId}
    [HttpDelete("{technicianId:guid}")]
    public async Task<IActionResult> RemoveTechnician(Guid ticketEquipmentId, Guid technicianId)
    {
        var technician = await _db.TicketTechnicians
            .Include(tt => tt.TicketEquipment)
                .ThenInclude(te => te.Ticket)
            .FirstOrDefaultAsync(tt => tt.Id == technicianId && tt.TicketEquipmentId == ticketEquipmentId);

        if (technician == null)
            return NotFound(new { message = "Asignación de técnico no encontrada." });

        if (technician.TicketEquipment.Ticket.Status == "Cerrado")
            return BadRequest(new { message = "No se pueden quitar técnicos de un caso cerrado." });

        _db.TicketTechnicians.Remove(technician);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}

// ── Request Models ──────────────────────────────────────────────────────────

public record AssignTechnicianRequest(
    Guid TechnicianUserId,
    string? ActivityDescription,
    string? Observations
);

public record UpdateTechnicianNotesRequest(
    string? ActivityDescription,
    string? Observations
);
