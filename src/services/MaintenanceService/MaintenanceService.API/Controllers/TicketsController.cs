using MaintenanceService.API.Services;
using MaintenanceService.Application.DTOs;
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
    private readonly TicketCodeService _codeService;

    public TicketsController(MaintenanceDbContext db, TicketCodeService codeService)
    {
        _db = db;
        _codeService = codeService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var tickets = await _db.Tickets
            .Include(t => t.TicketEquipments)
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new
            {
                t.Id,
                t.TicketNumber,
                t.Title,
                t.Description,
                t.MaintenanceType,
                t.Status,
                t.Priority,
                t.CreatedByUserId,
                t.CreatedAt,
                t.ClosedAt,
                EquipmentIds = t.TicketEquipments.Select(te => te.EquipmentId).ToList()
            })
            .ToListAsync();

        return Ok(tickets);
    }

    [HttpGet("{id:guid}")]
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

        return ticket == null ? NotFound() : Ok(ticket);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTicketDto dto)
    {
        if (!dto.EquipmentIds.Any())
            return BadRequest("Debe agregar al menos un equipo al caso.");

        var validTypes = new[] { "Correctivo", "Preventivo", "Adaptativo" };
        if (!validTypes.Contains(dto.MaintenanceType))
            return BadRequest("Tipo de mantenimiento inválido.");

        var code = await _codeService.GenerateAsync();

        var ticket = new Ticket
        {
            Id = Guid.NewGuid(),
            TicketNumber = code,
            Title = dto.Title,
            Description = dto.Description,
            MaintenanceType = dto.MaintenanceType,
            Status = "Pendiente",
            Priority = dto.Priority,
            CreatedByUserId = dto.CreatedByUserId,
            CreatedAt = DateTime.UtcNow,
            TicketEquipments = dto.EquipmentIds.Select(eId => new TicketEquipment
            {
                Id = Guid.NewGuid(),
                EquipmentId = eId,
                Status = "Pendiente"
            }).ToList()
        };

        _db.Tickets.Add(ticket);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = ticket.Id }, new
        {
            ticket.Id,
            ticket.TicketNumber,
            ticket.Title,
            ticket.MaintenanceType,
            ticket.Status,
            ticket.Priority,
            ticket.CreatedAt
        });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateTicketDto dto)
    {
        var ticket = await _db.Tickets.FindAsync(id);
        if (ticket == null) return NotFound();
        if (ticket.Status == "Terminado")
            return BadRequest("No se puede editar un caso terminado.");

        ticket.Title = dto.Title;
        ticket.Description = dto.Description;
        ticket.MaintenanceType = dto.MaintenanceType;
        ticket.Priority = dto.Priority;
        ticket.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(ticket);
    }
}