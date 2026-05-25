using MaintenanceService.Domain.Entities;
using MaintenanceService.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MaintenanceService.API.Controllers;

[ApiController]
[Route("api/catalog")]
public class CatalogController : ControllerBase
{
    private readonly MaintenanceDbContext _db;

    public CatalogController(MaintenanceDbContext db) => _db = db;

    [HttpGet("activities")]
    public async Task<IActionResult> GetActivities([FromQuery] bool? activeOnly)
    {
        var query = _db.CatalogActivities.AsQueryable();

        if (activeOnly == true)
            query = query.Where(a => a.IsActive);

        var items = await query
            .OrderBy(a => a.Category)
            .ThenBy(a => a.Name)
            .Select(a => new
            {
                a.Id,
                a.Name,
                a.Description,
                a.Category,
                a.IsActive
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost("activities")]
    public async Task<IActionResult> CreateActivity([FromBody] CatalogActivityRequest dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { message = "El nombre es obligatorio." });

        var validCategories = new[] { "Correctivo", "Preventivo", "Adaptativo" };
        if (!validCategories.Contains(dto.Category))
            return BadRequest(new { message = "Categoría inválida. Use: Correctivo, Preventivo o Adaptativo." });

        var duplicate = await _db.CatalogActivities
            .AnyAsync(a => a.Name.ToLower() == dto.Name.Trim().ToLower());
        if (duplicate)
            return Conflict(new { message = "Ya existe una actividad con ese nombre." });

        var activity = new CatalogActivity
        {
            Id          = Guid.NewGuid(),
            Name        = dto.Name.Trim(),
            Description = dto.Description?.Trim(),
            Category    = dto.Category,
            IsActive    = true
        };

        _db.CatalogActivities.Add(activity);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetActivities), new { },
            new { activity.Id, activity.Name, activity.Description, activity.Category, activity.IsActive });
    }

    [HttpPut("activities/{id:guid}")]
    public async Task<IActionResult> UpdateActivity(Guid id, [FromBody] CatalogActivityRequest dto)
    {
        var activity = await _db.CatalogActivities.FindAsync(id);
        if (activity == null) return NotFound(new { message = "Actividad no encontrada." });

        var validCategories = new[] { "Correctivo", "Preventivo", "Adaptativo" };
        if (!validCategories.Contains(dto.Category))
            return BadRequest(new { message = "Categoría inválida." });

        activity.Name        = dto.Name.Trim();
        activity.Description = dto.Description?.Trim();
        activity.Category    = dto.Category;
        activity.IsActive    = dto.IsActive;

        await _db.SaveChangesAsync();
        return Ok(new { activity.Id, activity.Name, activity.Description, activity.Category, activity.IsActive });
    }

    [HttpDelete("activities/{id:guid}")]
    public async Task<IActionResult> DeleteActivity(Guid id)
    {
        var activity = await _db.CatalogActivities
            .Include(a => a.TicketEquipmentActivities)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (activity == null) return NotFound(new { message = "Actividad no encontrada." });

        if (activity.TicketEquipmentActivities.Count != 0)
            return BadRequest(new { message = "No se puede eliminar: la actividad está en uso en uno o más casos. Puedes desactivarla en su lugar." });

        _db.CatalogActivities.Remove(activity);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("diagnoses")]
    public async Task<IActionResult> GetDiagnoses([FromQuery] bool? activeOnly)
    {
        var query = _db.CatalogDiagnoses.AsQueryable();

        if (activeOnly == true)
            query = query.Where(d => d.IsActive);

        var items = await query
            .OrderBy(d => d.Severity)
            .ThenBy(d => d.Name)
            .Select(d => new
            {
                d.Id,
                d.Name,
                d.Description,
                d.Severity,
                d.IsActive
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost("diagnoses")]
    public async Task<IActionResult> CreateDiagnosis([FromBody] CatalogDiagnosisRequest dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { message = "El nombre es obligatorio." });

        var validSeverities = new[] { "Baja", "Media", "Alta" };
        if (!validSeverities.Contains(dto.Severity))
            return BadRequest(new { message = "Severidad inválida. Use: Baja, Media o Alta." });

        var duplicate = await _db.CatalogDiagnoses
            .AnyAsync(d => d.Name.ToLower() == dto.Name.Trim().ToLower());
        if (duplicate)
            return Conflict(new { message = "Ya existe un diagnóstico con ese nombre." });

        var diagnosis = new CatalogDiagnosis
        {
            Id          = Guid.NewGuid(),
            Name        = dto.Name.Trim(),
            Description = dto.Description?.Trim(),
            Severity    = dto.Severity,
            IsActive    = true
        };

        _db.CatalogDiagnoses.Add(diagnosis);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetDiagnoses), new { },
            new { diagnosis.Id, diagnosis.Name, diagnosis.Description, diagnosis.Severity, diagnosis.IsActive });
    }

    [HttpPut("diagnoses/{id:guid}")]
    public async Task<IActionResult> UpdateDiagnosis(Guid id, [FromBody] CatalogDiagnosisRequest dto)
    {
        var diagnosis = await _db.CatalogDiagnoses.FindAsync(id);
        if (diagnosis == null) return NotFound(new { message = "Diagnóstico no encontrado." });

        var validSeverities = new[] { "Baja", "Media", "Alta" };
        if (!validSeverities.Contains(dto.Severity))
            return BadRequest(new { message = "Severidad inválida." });

        diagnosis.Name        = dto.Name.Trim();
        diagnosis.Description = dto.Description?.Trim();
        diagnosis.Severity    = dto.Severity;
        diagnosis.IsActive    = dto.IsActive;

        await _db.SaveChangesAsync();
        return Ok(new { diagnosis.Id, diagnosis.Name, diagnosis.Description, diagnosis.Severity, diagnosis.IsActive });
    }

    [HttpDelete("diagnoses/{id:guid}")]
    public async Task<IActionResult> DeleteDiagnosis(Guid id)
    {
        var diagnosis = await _db.CatalogDiagnoses
            .Include(d => d.TicketEquipmentDiagnoses)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (diagnosis == null) return NotFound(new { message = "Diagnóstico no encontrado." });

        if (diagnosis.TicketEquipmentDiagnoses.Count != 0)
            return BadRequest(new { message = "No se puede eliminar: el diagnóstico está en uso en uno o más casos." });

        _db.CatalogDiagnoses.Remove(diagnosis);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}

// ── Request Models ──────────────────────────────────────────────────────────

public record CatalogActivityRequest(
    string Name,
    string? Description,
    string Category,
    bool IsActive = true
);

public record CatalogDiagnosisRequest(
    string Name,
    string? Description,
    string Severity,
    bool IsActive = true
);
