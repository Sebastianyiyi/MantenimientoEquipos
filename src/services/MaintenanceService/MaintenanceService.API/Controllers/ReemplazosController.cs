using MaintenanceService.Domain.Entities;
using MaintenanceService.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MaintenanceService.API.Controllers;

[ApiController]
[Route("api/reemplazos")]
public class ReemplazosController : ControllerBase
{
    private readonly MaintenanceDbContext _db;

    public ReemplazosController(MaintenanceDbContext db)
    {
        _db = db;
    }

    [HttpPost]
    public async Task<IActionResult> RegistrarReemplazo([FromBody] RegistrarReemplazoDto dto)
    {
        if (dto.EquipoEntranteId == Guid.Empty || dto.EquipoSalienteId == Guid.Empty)
            return BadRequest(new { message = "Debe indicar el equipo saliente y el entrante." });

        if (string.IsNullOrWhiteSpace(dto.EquipoSalienteCodigo))
            return BadRequest(new { message = "Debe incluir el código del equipo saliente." });

        await using var tx = await _db.Database.BeginTransactionAsync();

        try
        {
            // Generar número de ticket de reemplazo
            var count = await _db.Tickets.CountAsync() + 1;
            var ticketNumber = $"RPL-{DateTime.UtcNow:yyyy}-{count:D4}";

            var ticket = new Ticket
            {
                Id = Guid.NewGuid(),
                TicketNumber = ticketNumber,
                Title = $"Registro por reemplazo del equipo {dto.EquipoSalienteCodigo}",
                Description = dto.Nota ?? $"El equipo {dto.EquipoEntranteCodigo} fue registrado como sustituto del equipo dado de baja {dto.EquipoSalienteCodigo}.",
                MaintenanceType = "Reemplazo",
                Status = "Terminado",
                Priority = "Media",
                CreatedByUserId = dto.EjecutadoPorUserId ?? Guid.Empty,
                CreatedAt = DateTime.UtcNow,
                ClosedAt = DateTime.UtcNow,
            };

            var ticketEquipment = new TicketEquipment
            {
                Id = Guid.NewGuid(),
                TicketId = ticket.Id,
                EquipmentId = dto.EquipoEntranteId,
                Diagnosis = $"Reemplazo del equipo {dto.EquipoSalienteCodigo}",
                Observation = $"Equipo registrado en el sistema como sustituto de {dto.EquipoSalienteCodigo}. {dto.Nota}",
                Status = "Terminado",
                LastStatusChangedAt = DateTime.UtcNow,
            };

            ticket.TicketEquipments.Add(ticketEquipment);
            _db.Tickets.Add(ticket);

            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            return Ok(new
            {
                message = "Reemplazo registrado en Hoja de Vida correctamente.",
                ticketId = ticket.Id,
                ticketNumber = ticket.TicketNumber,
                equipoEntranteId = dto.EquipoEntranteId,
                equipoSalienteId = dto.EquipoSalienteId
            });
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }
}

public class RegistrarReemplazoDto
{
    public Guid EquipoSalienteId { get; set; }
    public string EquipoSalienteCodigo { get; set; } = null!;
    public Guid EquipoEntranteId { get; set; }
    public string? EquipoEntranteCodigo { get; set; }
    public string? Nota { get; set; }
    public Guid? EjecutadoPorUserId { get; set; }
}
