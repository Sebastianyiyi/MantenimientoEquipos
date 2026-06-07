using MaintenanceService.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MaintenanceService.API.Controllers;

[ApiController]
[Route("api/reportes")]
public class ReportesController : ControllerBase
{
    private readonly MaintenanceDbContext _db;
    public ReportesController(MaintenanceDbContext db) => _db = db;

    // GET /api/reportes/hoja-vida/{equipmentId}
    [HttpGet("hoja-vida/{equipmentId:guid}")]
    public async Task<IActionResult> GetHojaVida(Guid equipmentId)
    {
        var ticketEquipments = await _db.TicketEquipments
            .Where(te => te.EquipmentId == equipmentId)
            .Include(te => te.Ticket)
            .Include(te => te.TicketTechnicians)
            .Include(te => te.Resources)
            .Include(te => te.TicketEquipmentActivities)
                .ThenInclude(tea => tea.CatalogActivity)
            .Include(te => te.TicketEquipmentDiagnoses)
                .ThenInclude(ted => ted.CatalogDiagnosis)
            .ToListAsync();

        var historia = ticketEquipments
            .GroupBy(te => te.Ticket)
            .OrderByDescending(g => g.Key.CreatedAt)
            .Select(g =>
            {
                var ticket = g.Key;
                var tecnicos = g.SelectMany(te => te.TicketTechnicians)
                    .GroupBy(tt => tt.TechnicianUserId)
                    .Select(tg => new
                    {
                        TechnicianUserId = tg.Key,
                        ActivityDescription = string.Join(" | ", tg
                            .Where(tt => !string.IsNullOrWhiteSpace(tt.ActivityDescription))
                            .Select(tt => tt.ActivityDescription!)),
                        Observations = string.Join(" | ", tg
                            .Where(tt => !string.IsNullOrWhiteSpace(tt.Observations))
                            .Select(tt => tt.Observations!))
                    }).ToList();

                var actividades = g.SelectMany(te => te.TicketEquipmentActivities)
                    .Select(tea => new
                    {
                        Nombre = tea.CatalogActivity.Name,
                        Categoria = tea.CatalogActivity.Category,
                        tea.AddedAt
                    }).ToList();

                var diagnosticos = g.SelectMany(te => te.TicketEquipmentDiagnoses)
                    .Select(ted => new
                    {
                        Nombre = ted.CatalogDiagnosis.Name,
                        Severidad = ted.CatalogDiagnosis.Severity,
                        ted.AddedAt
                    }).ToList();

                var recursos = g.SelectMany(te => te.Resources)
                    .Select(r => new { r.Name, r.Description, r.Quantity }).ToList();

                return new
                {
                    TicketNumber = ticket.TicketNumber,
                    Title = ticket.Title,
                    MaintenanceType = ticket.MaintenanceType,
                    TicketStatus = ticket.Status,
                    Priority = ticket.Priority,
                    FechaInicio = ticket.CreatedAt,
                    FechaCierre = ticket.ClosedAt,
                    Tecnicos = tecnicos,
                    Actividades = actividades,
                    Diagnosticos = diagnosticos,
                    Recursos = recursos
                };
            }).ToList();

        return Ok(new
        {
            EquipmentId = equipmentId,
            TotalCasos = historia.Count,
            TotalActividades = historia.Sum(h => h.Actividades.Count),
            TotalRecursos = historia.Sum(h => h.Recursos.Count),
            UltimoMantenimiento = historia.FirstOrDefault()?.FechaInicio,
            Historia = historia
        });
    }

    // GET /api/reportes/estadisticas
    [HttpGet("estadisticas")]
    public async Task<IActionResult> GetEstadisticas(
        [FromQuery] DateTime? desde,
        [FromQuery] DateTime? hasta)
    {
        var query = _db.Tickets.AsQueryable();

        if (desde.HasValue) query = query.Where(t => t.CreatedAt >= desde.Value);
        if (hasta.HasValue) query = query.Where(t => t.CreatedAt <= hasta.Value.AddDays(1));

        var tickets = await query
            .Include(t => t.TicketEquipments)
                .ThenInclude(te => te.TicketTechnicians)
            .Include(t => t.TicketEquipments)
                .ThenInclude(te => te.Resources)
            .ToListAsync();

        var porTipo = tickets
            .GroupBy(t => t.MaintenanceType)
            .Select(g => new { Tipo = g.Key, Total = g.Count() })
            .ToList();

        var porEstado = tickets
            .GroupBy(t => t.Status)
            .Select(g => new { Estado = g.Key, Total = g.Count() })
            .ToList();

        var tecnicosCarga = tickets
            .SelectMany(t => t.TicketEquipments)
            .SelectMany(te => te.TicketTechnicians)
            .GroupBy(tt => tt.TechnicianUserId)
            .Select(g => new { TechnicianUserId = g.Key, TotalCasos = g.Count() })
            .OrderByDescending(x => x.TotalCasos)
            .Take(10)
            .ToList();

        var recursosMasUsados = tickets
            .SelectMany(t => t.TicketEquipments)
            .SelectMany(te => te.Resources)
            .GroupBy(r => r.Name)
            .Select(g => new { Recurso = g.Key, TotalUsado = g.Sum(r => r.Quantity) })
            .OrderByDescending(x => x.TotalUsado)
            .Take(10)
            .ToList();

        return Ok(new
        {
            TotalCasos = tickets.Count,
            CasosPorTipo = porTipo,
            CasosPorEstado = porEstado,
            TecnicosCarga = tecnicosCarga,
            RecursosMasUsados = recursosMasUsados,
            Desde = desde,
            Hasta = hasta
        });
    }
}