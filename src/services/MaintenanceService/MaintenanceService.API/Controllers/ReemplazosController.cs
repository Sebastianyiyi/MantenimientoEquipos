using MaintenanceService.Domain.Entities;
using MaintenanceService.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace MaintenanceService.API.Controllers;

[ApiController]
[Route("api/reemplazos")]
public class ReemplazosController : ControllerBase
{
    private readonly MaintenanceDbContext _db;
    private readonly IHttpClientFactory _httpClientFactory;

    public ReemplazosController(MaintenanceDbContext db, IHttpClientFactory httpClientFactory)
    {
        _db = db;
        _httpClientFactory = httpClientFactory;
    }

    // ── GET: equipos salientes ya sustituidos (para excluirlos del listado) ──
    [HttpGet("sustituidos")]
    public async Task<IActionResult> GetSustituidos()
    {
        var ids = await _db.DeviceReplacements
            .Select(r => r.EquipoSalienteId)
            .ToListAsync();
        return Ok(ids);
    }

    // ── GET: ids de equipos entrantes ya usados (para validar asignación única) ──
    [HttpGet("entrantes-usados")]
    public async Task<IActionResult> GetEntrantesUsados()
    {
        var ids = await _db.DeviceReplacements
            .Select(r => r.EquipoEntranteId)
            .ToListAsync();
        return Ok(ids);
    }

    [HttpPost]
    public async Task<IActionResult> RegistrarReemplazo([FromBody] RegistrarReemplazoDto dto)
    {
        // ── Regla: Obligatoriedad de campos ────────────────────────────────────
        if (dto.EquipoSalienteId == Guid.Empty)
            return BadRequest(new { message = "El equipo saliente es obligatorio." });
        if (dto.EquipoEntranteId == Guid.Empty)
            return BadRequest(new { message = "El equipo entrante (sustituto) es obligatorio." });
        if (string.IsNullOrWhiteSpace(dto.EquipoSalienteCodigo))
            return BadRequest(new { message = "El código del equipo saliente es obligatorio." });
        if (string.IsNullOrWhiteSpace(dto.EquipoEntranteCodigo))
            return BadRequest(new { message = "El código del equipo entrante es obligatorio." });
        if (string.IsNullOrWhiteSpace(dto.Motivo))
            return BadRequest(new { message = "El motivo del reemplazo es obligatorio." });
        if (dto.AsignadoPorUserId == null || dto.AsignadoPorUserId == Guid.Empty)
            return BadRequest(new { message = "Debe indicar quién asigna el reemplazo." });
        if (dto.FechaReemplazo == default)
            return BadRequest(new { message = "La fecha del reemplazo es obligatoria." });

        var client = _httpClientFactory.CreateClient();

        // ── Regla: Validación de Existencia ────────────────────────────────────
        var eqEntranteRes = await client.GetAsync(
            $"http://localhost:5002/api/equipments/{dto.EquipoEntranteId}");
        if (!eqEntranteRes.IsSuccessStatusCode)
            return BadRequest(new { message = "El equipo sustituto no existe en la base de datos." });

        var eqEntrante = JsonSerializer.Deserialize<EquipmentSnapshot>(
            await eqEntranteRes.Content.ReadAsStringAsync(),
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        // ── Regla: Disponibilidad Exclusiva (activo + sin ubicación) ───────────
        if (eqEntrante?.Status != "Activo")
            return BadRequest(new { message = $"El equipo sustituto no está Activo (estado actual: {eqEntrante?.Status})." });

        var locationRes = await client.GetAsync(
            $"http://localhost:5003/api/equipment-locations/current/{dto.EquipoEntranteId}");
        if (locationRes.IsSuccessStatusCode)
            return BadRequest(new { message = "El equipo sustituto ya está asignado a un laboratorio y no está disponible." });

        // ── Regla: Restricción de Asignación Única ─────────────────────────────
        var yaUsadoComoEntrante = await _db.DeviceReplacements
            .AnyAsync(r => r.EquipoEntranteId == dto.EquipoEntranteId);
        if (yaUsadoComoEntrante)
            return BadRequest(new { message = "El equipo sustituto ya fue asignado en un proceso de reemplazo previo." });

        // ── Regla: equipo saliente no debe aparecer dos veces como saliente ─────
        var yaFueSustituido = await _db.DeviceReplacements
            .AnyAsync(r => r.EquipoSalienteId == dto.EquipoSalienteId);
        if (yaFueSustituido)
            return BadRequest(new { message = "Este equipo ya fue sustituido en un reemplazo previo." });

        // ── Todo OK: registrar el reemplazo ────────────────────────────────────
        await using var tx = await _db.Database.BeginTransactionAsync();
        try
        {
            var count = await _db.Tickets.CountAsync() + 1;
            var ticketNumber = $"RPL-{DateTime.UtcNow:yyyy}-{count:D4}";

            var ticket = new Ticket
            {
                Id              = Guid.NewGuid(),
                TicketNumber    = ticketNumber,
                Title           = $"Registro por reemplazo del equipo {dto.EquipoSalienteCodigo}",
                Description     = $"El equipo {dto.EquipoEntranteCodigo} fue registrado como sustituto del equipo dado de baja {dto.EquipoSalienteCodigo}. Motivo: {dto.Motivo.Trim()}",
                MaintenanceType = "Reemplazo",
                Status          = "Terminado",
                Priority        = "Media",
                CreatedByUserId = dto.AsignadoPorUserId.Value,
                CreatedAt       = dto.FechaReemplazo,
                ClosedAt        = dto.FechaReemplazo,
            };

            var ticketEquipment = new TicketEquipment
            {
                Id                  = Guid.NewGuid(),
                TicketId            = ticket.Id,
                EquipmentId         = dto.EquipoEntranteId,
                Diagnosis           = $"Reemplazo del equipo {dto.EquipoSalienteCodigo}",
                Observation         = $"Equipo registrado como sustituto de {dto.EquipoSalienteCodigo}. {dto.Motivo.Trim()}",
                Status              = "Terminado",
                LastStatusChangedAt = dto.FechaReemplazo,
            };

            ticket.TicketEquipments.Add(ticketEquipment);
            _db.Tickets.Add(ticket);

            // ── Regla: Persistencia del Historial ──────────────────────────────
            // Registro permanente que vincula ambos equipos
            var reemplazo = new DeviceReplacement
            {
                Id                  = Guid.NewGuid(),
                EquipoSalienteId    = dto.EquipoSalienteId,
                EquipoSalienteCodigo= dto.EquipoSalienteCodigo,
                EquipoEntranteId    = dto.EquipoEntranteId,
                EquipoEntranteCodigo= dto.EquipoEntranteCodigo,
                Motivo              = dto.Motivo.Trim(),
                AsignadoPorUserId   = dto.AsignadoPorUserId.Value,
                FechaReemplazo      = dto.FechaReemplazo,
                TicketId            = ticket.Id,
            };
            _db.DeviceReplacements.Add(reemplazo);

            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            return Ok(new
            {
                message          = "Reemplazo registrado correctamente.",
                ticketId         = ticket.Id,
                ticketNumber     = ticket.TicketNumber,
                reemplazoId      = reemplazo.Id,
                equipoEntranteId = dto.EquipoEntranteId,
                equipoSalienteId = dto.EquipoSalienteId,
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
    public Guid   EquipoSalienteId     { get; set; }
    public string EquipoSalienteCodigo { get; set; } = null!;
    public Guid   EquipoEntranteId     { get; set; }
    public string EquipoEntranteCodigo { get; set; } = null!;
    public string Motivo               { get; set; } = null!;
    public Guid?  AsignadoPorUserId    { get; set; }
    public DateTime FechaReemplazo     { get; set; }
}

// DTO mínimo para leer el equipo desde EquipmentService
file sealed class EquipmentSnapshot
{
    [JsonPropertyName("status")]
    public string? Status { get; set; }
}
