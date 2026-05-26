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
    private readonly IHttpClientFactory _httpClientFactory;


    public TicketsController(MaintenanceDbContext db, TicketCodeService codeService, IHttpClientFactory httpClientFactory)
    {
        _db = db;
        _codeService = codeService;
        _httpClientFactory = httpClientFactory;
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

        if (ticket == null) return NotFound();

        // Projection explícita: evita la referencia circular
        // TicketEquipment.Ticket → Ticket.TicketEquipments → TicketEquipment.Ticket ...
        return Ok(new
        {
            ticket.Id,
            ticket.TicketNumber,
            ticket.Title,
            ticket.Description,
            ticket.MaintenanceType,
            ticket.Status,
            ticket.Priority,
            ticket.CreatedByUserId,
            ticket.CreatedAt,
            ticket.UpdatedAt,
            ticket.ClosedAt,
            TicketEquipments = ticket.TicketEquipments.Select(te => new
            {
                te.Id,
                te.EquipmentId,
                te.Status,
                te.Diagnosis,
                te.Observation,
                te.LastStatusChangedAt,
                te.LastStatusChangedByUserId,
                te.TicketId,
                TicketTechnicians = te.TicketTechnicians.Select(tt => new
                {
                    tt.Id,
                    tt.TechnicianUserId,
                    tt.AssignedAt,
                    tt.TicketEquipmentId
                }).ToList(),
                Activities = te.Activities.Select(a => new
                {
                    a.Id,
                    a.Description,
                    a.PerformedAt,
                    a.PerformedByUserId,
                    a.TicketEquipmentId
                }).ToList(),
                Resources = te.Resources.Select(r => new
                {
                    r.Id,
                    r.Name,
                    r.Description,
                    r.Quantity,
                    r.TicketEquipmentId
                }).ToList(),
            }).ToList()
        });
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
            CreatedAt = DateTime.Now,
            TicketEquipments = dto.EquipmentIds.Select(eId => new TicketEquipment
            {
                Id = Guid.NewGuid(),
                EquipmentId = eId,
                Status = "Pendiente"
            }).ToList()
        };

        _db.Tickets.Add(ticket);
        await _db.SaveChangesAsync();

        // Cambiar estado de equipos a "En mantenimiento"
        // Se reenvía el token JWT del request entrante para que el EquipmentService lo acepte
        try
        {
            var client = _httpClientFactory.CreateClient();
            var authHeader = Request.Headers["Authorization"].FirstOrDefault();
            if (!string.IsNullOrEmpty(authHeader))
                client.DefaultRequestHeaders.Add("Authorization", authHeader);

            foreach (var equipmentId in dto.EquipmentIds)
            {
                await client.PatchAsJsonAsync(
                    $"http://localhost:5002/api/equipments/{equipmentId}/status",
                    new { status = "En mantenimiento" }
                );
            }
        }
        catch { /* silencioso */ }

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
        ticket.UpdatedAt = DateTime.Now;

        await _db.SaveChangesAsync();
        return Ok(ticket);
    }
}