using MaintenanceService.Domain.Entities;
using MaintenanceService.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MaintenanceService.API.Controllers;

[ApiController]
[Route("api/tickets")]
public class TicketsController : ControllerBase
{
    private readonly MaintenanceDbContext _db;

    public TicketsController(MaintenanceDbContext db)
    {
        _db = db;
    }

    // GET api/tickets
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var tickets = await _db.Tickets
            .Include(t => t.TicketEquipments)
                .ThenInclude(te => te.TicketTechnicians)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();
        return Ok(tickets);
    }

    // GET api/tickets/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var ticket = await _db.Tickets
            .Include(t => t.TicketEquipments)
                .ThenInclude(te => te.TicketTechnicians)
            .Include(t => t.TicketEquipments)
                .ThenInclude(te => te.Activities)
            .Include(t => t.TicketEquipments)
                .ThenInclude(te => te.Resources)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (ticket == null) return NotFound();
        return Ok(ticket);
    }

    // POST api/tickets
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTicketRequest req)
    {
        // Generar número de ticket automático
        var count = await _db.Tickets.CountAsync();
        var ticketNumber = $"TKT-{DateTime.UtcNow.Year}-{(count + 1):D3}";

        var ticket = new Ticket
        {
            Id = Guid.NewGuid(),
            TicketNumber = ticketNumber,
            Title = req.Title,
            Description = req.Description,
            Status = "Abierto",
            Priority = req.Priority,
            CreatedByUserId = req.CreatedByUserId,
            CreatedAt = DateTime.UtcNow,
        };

        // Agregar equipos con sus técnicos
        foreach (var equipReq in req.Equipments)
        {
            var ticketEquipment = new TicketEquipment
            {
                Id = Guid.NewGuid(),
                EquipmentId = equipReq.EquipmentId,
                Status = "Pendiente",
                Diagnosis = equipReq.Diagnosis,
                Observation = equipReq.Observation,
                TicketId = ticket.Id,
            };

            // Asignar técnicos a este equipo
            foreach (var techId in equipReq.TechnicianUserIds)
            {
                ticketEquipment.TicketTechnicians.Add(new TicketTechnician
                {
                    Id = Guid.NewGuid(),
                    TechnicianUserId = techId,
                    AssignedAt = DateTime.UtcNow,
                    TicketEquipmentId = ticketEquipment.Id,
                });
            }

            ticket.TicketEquipments.Add(ticketEquipment);
        }

        _db.Tickets.Add(ticket);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = ticket.Id }, ticket);
    }

    // PATCH api/tickets/{id}/status
    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateStatusRequest req)
    {
        var ticket = await _db.Tickets.FindAsync(id);
        if (ticket == null) return NotFound();

        ticket.Status = req.Status;
        ticket.UpdatedAt = DateTime.UtcNow;
        if (req.Status == "Cerrado") ticket.ClosedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(ticket);
    }
}

// DTOs
public record CreateTicketRequest(
    string Title,
    string? Description,
    string Priority,
    Guid CreatedByUserId,
    List<EquipmentRequest> Equipments
);

public record EquipmentRequest(
    Guid EquipmentId,
    string? Diagnosis,
    string? Observation,
    List<Guid> TechnicianUserIds
);

public record UpdateStatusRequest(string Status);