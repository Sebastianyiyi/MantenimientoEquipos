using MaintenanceService.Domain.Entities;
using MaintenanceService.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MaintenanceService.API.Controllers;

[ApiController]
[Route("api/ticket-equipments/{ticketEquipmentId:guid}")]
public class TicketActivitiesDiagnosesController : ControllerBase
{
    private readonly MaintenanceDbContext _db;

    public TicketActivitiesDiagnosesController(MaintenanceDbContext db) => _db = db;

    [HttpGet("activities")]
    public async Task<IActionResult> GetLinkedActivities(Guid ticketEquipmentId)
    {
        var exists = await _db.TicketEquipments.AnyAsync(te => te.Id == ticketEquipmentId);
        if (!exists) return NotFound(new { message = "TicketEquipment no encontrado." });

        var items = await _db.TicketEquipmentActivities
            .Where(tea => tea.TicketEquipmentId == ticketEquipmentId)
            .Include(tea => tea.CatalogActivity)
            .Select(tea => new
            {
                tea.Id,
                tea.TicketEquipmentId,
                tea.CatalogActivityId,
                tea.AddedByUserId,
                tea.AddedAt,
                ActivityName        = tea.CatalogActivity.Name,
                ActivityDescription = tea.CatalogActivity.Description,
                ActivityCategory    = tea.CatalogActivity.Category,
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost("activities")]
    public async Task<IActionResult> LinkActivities(
        Guid ticketEquipmentId,
        [FromBody] LinkCatalogItemsRequest request)
    {
        if (request.CatalogItemIds == null || request.CatalogItemIds.Count == 0)
            return BadRequest(new { message = "Debe seleccionar al menos una actividad o diagnóstico." });

        var ticketEquipment = await _db.TicketEquipments
            .Include(te => te.Ticket)
            .FirstOrDefaultAsync(te => te.Id == ticketEquipmentId);

        if (ticketEquipment == null)
            return NotFound(new { message = "TicketEquipment no encontrado." });

        if (ticketEquipment.Ticket.Status == "Terminado")
            return BadRequest(new { message = "El caso ya está terminado." });

        // Verificar que todos los IDs existen en el catálogo y están activos
        var validIds = await _db.CatalogActivities
            .Where(a => request.CatalogItemIds.Contains(a.Id) && a.IsActive)
            .Select(a => a.Id)
            .ToListAsync();

        var invalidIds = request.CatalogItemIds.Except(validIds).ToList();
        if (invalidIds.Count != 0)
            return BadRequest(new { message = "Uno o más IDs de actividades no son válidos o están inactivos.", invalidIds });

        // Obtener los ya vinculados para evitar duplicados (HU-10 CA-3)
        var alreadyLinked = await _db.TicketEquipmentActivities
            .Where(tea => tea.TicketEquipmentId == ticketEquipmentId
                       && request.CatalogItemIds.Contains(tea.CatalogActivityId))
            .Select(tea => tea.CatalogActivityId)
            .ToListAsync();

        var toAdd = validIds.Except(alreadyLinked).ToList();

        if (toAdd.Count == 0)
            return Conflict(new { message = "Todas las actividades seleccionadas ya estaban vinculadas." });

        var newLinks = toAdd.Select(activityId => new TicketEquipmentActivity
        {
            Id                = Guid.NewGuid(),
            TicketEquipmentId = ticketEquipmentId,
            CatalogActivityId = activityId,
            AddedByUserId     = request.AddedByUserId,
            AddedAt           = DateTime.Now
        }).ToList();

        _db.TicketEquipmentActivities.AddRange(newLinks);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = $"{toAdd.Count} actividad(es) vinculada(s) correctamente.",
            linked  = toAdd.Count,
            skipped = alreadyLinked.Count
        });
    }

    [HttpDelete("activities/{linkId:guid}")]
    public async Task<IActionResult> UnlinkActivity(Guid ticketEquipmentId, Guid linkId)
    {
        var link = await _db.TicketEquipmentActivities
            .Include(tea => tea.TicketEquipment)
                .ThenInclude(te => te.Ticket)
            .FirstOrDefaultAsync(tea => tea.Id == linkId && tea.TicketEquipmentId == ticketEquipmentId);

        if (link == null) return NotFound(new { message = "Vínculo no encontrado." });

        if (link.TicketEquipment.Ticket.Status == "Terminado")
            return BadRequest(new { message = "No se puede desvincular actividades de un caso terminado." });

        _db.TicketEquipmentActivities.Remove(link);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("diagnoses")]
    public async Task<IActionResult> GetLinkedDiagnoses(Guid ticketEquipmentId)
    {
        var exists = await _db.TicketEquipments.AnyAsync(te => te.Id == ticketEquipmentId);
        if (!exists) return NotFound(new { message = "TicketEquipment no encontrado." });

        var items = await _db.TicketEquipmentDiagnoses
            .Where(ted => ted.TicketEquipmentId == ticketEquipmentId)
            .Include(ted => ted.CatalogDiagnosis)
            .Select(ted => new
            {
                ted.Id,
                ted.TicketEquipmentId,
                ted.CatalogDiagnosisId,
                ted.AddedByUserId,
                ted.AddedAt,
                DiagnosisName        = ted.CatalogDiagnosis.Name,
                DiagnosisDescription = ted.CatalogDiagnosis.Description,
                DiagnosisSeverity    = ted.CatalogDiagnosis.Severity,
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost("diagnoses")]
    public async Task<IActionResult> LinkDiagnoses(
        Guid ticketEquipmentId,
        [FromBody] LinkCatalogItemsRequest request)
    {
        if (request.CatalogItemIds == null || request.CatalogItemIds.Count == 0)
            return BadRequest(new { message = "Debe seleccionar al menos un diagnóstico." });

        var ticketEquipment = await _db.TicketEquipments
            .Include(te => te.Ticket)
            .FirstOrDefaultAsync(te => te.Id == ticketEquipmentId);

        if (ticketEquipment == null)
            return NotFound(new { message = "TicketEquipment no encontrado." });

        if (ticketEquipment.Ticket.Status == "Terminado")
            return BadRequest(new { message = "El caso ya está terminado." });

        var validIds = await _db.CatalogDiagnoses
            .Where(d => request.CatalogItemIds.Contains(d.Id) && d.IsActive)
            .Select(d => d.Id)
            .ToListAsync();

        var invalidIds = request.CatalogItemIds.Except(validIds).ToList();
        if (invalidIds.Count != 0)
            return BadRequest(new { message = "Uno o más IDs de diagnósticos no son válidos o están inactivos.", invalidIds });

        var alreadyLinked = await _db.TicketEquipmentDiagnoses
            .Where(ted => ted.TicketEquipmentId == ticketEquipmentId
                       && request.CatalogItemIds.Contains(ted.CatalogDiagnosisId))
            .Select(ted => ted.CatalogDiagnosisId)
            .ToListAsync();

        var toAdd = validIds.Except(alreadyLinked).ToList();

        if (toAdd.Count == 0)
            return Conflict(new { message = "Todos los diagnósticos seleccionados ya estaban vinculados." });

        var newLinks = toAdd.Select(diagnosisId => new TicketEquipmentDiagnosis
        {
            Id                 = Guid.NewGuid(),
            TicketEquipmentId  = ticketEquipmentId,
            CatalogDiagnosisId = diagnosisId,
            AddedByUserId      = request.AddedByUserId,
            AddedAt            = DateTime.Now
        }).ToList();

        _db.TicketEquipmentDiagnoses.AddRange(newLinks);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = $"{toAdd.Count} diagnóstico(s) vinculado(s) correctamente.",
            linked  = toAdd.Count,
            skipped = alreadyLinked.Count
        });
    }

    [HttpDelete("diagnoses/{linkId:guid}")]
    public async Task<IActionResult> UnlinkDiagnosis(Guid ticketEquipmentId, Guid linkId)
    {
        var link = await _db.TicketEquipmentDiagnoses
            .Include(ted => ted.TicketEquipment)
                .ThenInclude(te => te.Ticket)
            .FirstOrDefaultAsync(ted => ted.Id == linkId && ted.TicketEquipmentId == ticketEquipmentId);

        if (link == null) return NotFound(new { message = "Vínculo no encontrado." });

        if (link.TicketEquipment.Ticket.Status == "Terminado")
            return BadRequest(new { message = "No se puede desvincular diagnósticos de un caso terminado." });

        _db.TicketEquipmentDiagnoses.Remove(link);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}

public record LinkCatalogItemsRequest(
    List<Guid> CatalogItemIds,
    Guid AddedByUserId
);
