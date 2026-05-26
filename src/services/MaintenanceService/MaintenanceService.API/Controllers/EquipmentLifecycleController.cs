using MaintenanceService.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MaintenanceService.API.Controllers;

[ApiController]
[Route("api/equipments/{equipmentId:guid}/hoja-de-vida")]
public class EquipmentLifecycleController : ControllerBase
{
    private readonly MaintenanceDbContext _db;

    public EquipmentLifecycleController(MaintenanceDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetHojaDeVida(Guid equipmentId)
    {
        // Verificar que existen tickets para el equipo
        var hasAny = await _db.TicketEquipments.AnyAsync(te => te.EquipmentId == equipmentId);

        // Obtenemos todos los TicketEquipment del equipo con todo el detalle JOIN
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

        // Agrupar por ticket y ordenar por fecha de creación DESC (HU-13 CA-2)
        var historia = ticketEquipments
            .GroupBy(te => te.Ticket)
            .OrderByDescending(g => g.Key.CreatedAt)
            .Select(g =>
            {
                var ticket = g.Key;

                // Consolidar técnicos únicos de todos los equipments del mismo ticket
                // (un técnico puede haber trabajado en varios equipos del mismo ticket)
                var tecnicos = g
                    .SelectMany(te => te.TicketTechnicians)
                    .GroupBy(tt => tt.TechnicianUserId)
                    .Select(tg => new
                    {
                        TechnicianUserId = tg.Key,
                        AssignedAt = tg.Min(tt => tt.AssignedAt),
                        // Unir las descripciones si hay varias por técnico en distintos equipos
                        ActivityDescription = string.Join(" | ", tg
                            .Where(tt => !string.IsNullOrWhiteSpace(tt.ActivityDescription))
                            .Select(tt => tt.ActivityDescription!)),
                        Observations = string.Join(" | ", tg
                            .Where(tt => !string.IsNullOrWhiteSpace(tt.Observations))
                            .Select(tt => tt.Observations!))
                    })
                    .OrderBy(t => t.AssignedAt)
                    .ToList();

                // Actividades del equipo en este ticket
                var actividades = g
                    .SelectMany(te => te.TicketEquipmentActivities)
                    .Select(tea => new
                    {
                        tea.Id,
                        tea.CatalogActivityId,
                        ActivityName = tea.CatalogActivity.Name,
                        ActivityDescription = tea.CatalogActivity.Description,
                        ActivityCategory = tea.CatalogActivity.Category,
                        tea.AddedAt,
                        tea.AddedByUserId
                    })
                    .OrderBy(a => a.AddedAt)
                    .ToList();

                // Diagnósticos del equipo en este ticket
                var diagnosticos = g
                    .SelectMany(te => te.TicketEquipmentDiagnoses)
                    .Select(ted => new
                    {
                        ted.Id,
                        ted.CatalogDiagnosisId,
                        DiagnosisName = ted.CatalogDiagnosis.Name,
                        DiagnosisDescription = ted.CatalogDiagnosis.Description,
                        DiagnosisSeverity = ted.CatalogDiagnosis.Severity,
                        ted.AddedAt,
                        ted.AddedByUserId
                    })
                    .OrderBy(d => d.AddedAt)
                    .ToList();

                // Recursos del equipo en este ticket
                var recursos = g
                    .SelectMany(te => te.Resources)
                    .Select(r => new
                    {
                        r.Id,
                        r.Name,
                        r.Description,
                        r.Quantity,
                        r.TicketEquipmentId
                    })
                    .ToList();

                // Estado del equipo dentro de este ticket
                var estadoEquipo = g.First().Status;
                var lastStatusChange = g.Max(te => te.LastStatusChangedAt);

                return new
                {
                    // Datos del ticket/caso
                    TicketId = ticket.Id,
                    TicketNumber = ticket.TicketNumber,
                    Title = ticket.Title,
                    MaintenanceType = ticket.MaintenanceType,
                    TicketStatus = ticket.Status,
                    Priority = ticket.Priority,
                    FechaInicio = ticket.CreatedAt,
                    FechaCierre = ticket.ClosedAt,

                    // Estado del equipo específico en este ticket
                    EstadoEquipo = estadoEquipo,
                    UltimoCambioEstado = lastStatusChange,

                    // Detalle completo de la intervención
                    Tecnicos = tecnicos,
                    Actividades = actividades,
                    Diagnosticos = diagnosticos,
                    Recursos = recursos,

                    // Estadísticas rápidas
                    TotalTecnicos = tecnicos.Count,
                    TotalActividades = actividades.Count,
                    TotalDiagnosticos = diagnosticos.Count,
                    TotalRecursos = recursos.Count
                };
            })
            .ToList();

        // Resumen general del equipo
        var resumen = new
        {
            EquipmentId = equipmentId,
            TotalCasos = historia.Count,
            TotalActividades = historia.Sum(h => h.TotalActividades),
            TotalRecursos = historia.Sum(h => h.TotalRecursos),
            UltimoMantenimiento = historia.FirstOrDefault()?.FechaInicio,
            UltimoCaso = historia.FirstOrDefault()?.TicketNumber
        };

        return Ok(new
        {
            Resumen = resumen,
            Historia = historia
        });
    }
}
