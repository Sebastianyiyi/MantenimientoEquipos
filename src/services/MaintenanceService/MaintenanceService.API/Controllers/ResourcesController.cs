using MaintenanceService.Domain.Entities;
using MaintenanceService.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MaintenanceService.API.Controllers;

[ApiController]
[Route("api/ticket-equipments/{ticketEquipmentId:guid}/resources")]
public class ResourcesController : ControllerBase
{
    private readonly MaintenanceDbContext _db;

    public ResourcesController(MaintenanceDbContext db)
    {
        _db = db;
    }

    // GET api/ticket-equipments/{ticketEquipmentId}/resources
    [HttpGet]
    public async Task<IActionResult> GetResources(Guid ticketEquipmentId)
    {
        var exists = await _db.TicketEquipments.AnyAsync(te => te.Id == ticketEquipmentId);
        if (!exists)
            return NotFound(new { message = "TicketEquipment no encontrado." });

        var resources = await _db.Resources
            .Where(r => r.TicketEquipmentId == ticketEquipmentId)
            .Select(r => new
            {
                r.Id,
                r.Name,
                r.Description,
                r.Quantity,
                r.TicketEquipmentId
            })
            .ToListAsync();

        return Ok(resources);
    }

    // POST api/ticket-equipments/{ticketEquipmentId}/resources
    [HttpPost]
    public async Task<IActionResult> AddResource(
        Guid ticketEquipmentId,
        [FromBody] ResourceRequest request)
    {
        var ticketEquipment = await _db.TicketEquipments
            .Include(te => te.Ticket)
            .FirstOrDefaultAsync(te => te.Id == ticketEquipmentId);

        if (ticketEquipment == null)
            return NotFound(new { message = "TicketEquipment no encontrado." });

        if (ticketEquipment.Ticket.Status == "Cerrado")
            return BadRequest(new { message = "No se pueden agregar recursos a un caso cerrado." });

        // HU-11: cantidad debe ser mayor a cero
        if (request.Quantity <= 0)
            return BadRequest(new { message = "La cantidad debe ser mayor a cero." });

        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "El nombre del recurso es requerido." });

        var resource = new Resource
        {
            Id = Guid.NewGuid(),
            TicketEquipmentId = ticketEquipmentId,
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            Quantity = request.Quantity
        };

        _db.Resources.Add(resource);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetResources), new { ticketEquipmentId }, new
        {
            resource.Id,
            resource.Name,
            resource.Description,
            resource.Quantity,
            resource.TicketEquipmentId
        });
    }

    // PUT api/ticket-equipments/{ticketEquipmentId}/resources/{resourceId}
    [HttpPut("{resourceId:guid}")]
    public async Task<IActionResult> UpdateResource(
        Guid ticketEquipmentId,
        Guid resourceId,
        [FromBody] ResourceRequest request)
    {
        var resource = await _db.Resources
            .Include(r => r.TicketEquipment)
                .ThenInclude(te => te.Ticket)
            .FirstOrDefaultAsync(r => r.Id == resourceId && r.TicketEquipmentId == ticketEquipmentId);

        if (resource == null)
            return NotFound(new { message = "Recurso no encontrado." });

        // HU-11: no se puede editar si el caso está Terminado/Cerrado
        if (resource.TicketEquipment.Ticket.Status == "Cerrado")
            return BadRequest(new { message = "No se pueden editar recursos de un caso cerrado." });

        if (request.Quantity <= 0)
            return BadRequest(new { message = "La cantidad debe ser mayor a cero." });

        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "El nombre del recurso es requerido." });

        resource.Name = request.Name.Trim();
        resource.Description = request.Description?.Trim();
        resource.Quantity = request.Quantity;

        await _db.SaveChangesAsync();

        return Ok(new
        {
            resource.Id,
            resource.Name,
            resource.Description,
            resource.Quantity,
            resource.TicketEquipmentId
        });
    }

    // DELETE api/ticket-equipments/{ticketEquipmentId}/resources/{resourceId}
    [HttpDelete("{resourceId:guid}")]
    public async Task<IActionResult> DeleteResource(Guid ticketEquipmentId, Guid resourceId)
    {
        var resource = await _db.Resources
            .Include(r => r.TicketEquipment)
                .ThenInclude(te => te.Ticket)
            .FirstOrDefaultAsync(r => r.Id == resourceId && r.TicketEquipmentId == ticketEquipmentId);

        if (resource == null)
            return NotFound(new { message = "Recurso no encontrado." });

        if (resource.TicketEquipment.Ticket.Status == "Cerrado")
            return BadRequest(new { message = "No se pueden eliminar recursos de un caso cerrado." });

        _db.Resources.Remove(resource);
        await _db.SaveChangesAsync();

        return NoContent();
    }
}

// ── Request Model ────────────────────────────────────────────────────────────

public record ResourceRequest(
    string Name,
    string? Description,
    int Quantity
);
