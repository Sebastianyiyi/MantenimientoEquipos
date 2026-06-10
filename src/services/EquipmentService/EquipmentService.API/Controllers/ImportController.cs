using System.Text.Json;
using EquipmentService.Domain.Entities;
using EquipmentService.Infrastructure.Data;
using EquipmentService.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EquipmentService.API.Controllers;

[ApiController]
[Route("api/import")]
public class ImportController : ControllerBase
{
    private readonly EquipmentDbContext _context;
    private readonly EquipmentCodeService _codeService;

    public ImportController(EquipmentDbContext context, EquipmentCodeService codeService)
    {
        _context = context;
        _codeService = codeService;
    }

    [HttpPost("preview")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Preview([FromForm] ImportEquipmentCsvRequest request)
    {
        if (request.File == null || request.File.Length == 0)
            return BadRequest(new { message = "Archivo requerido." });

        if (request.EquipmentTypeId == Guid.Empty)
            return BadRequest(new { message = "Debe seleccionar un tipo de equipo." });

        var equipmentType = await _context.EquipmentTypes
            .FirstOrDefaultAsync(t => t.Id == request.EquipmentTypeId);

        if (equipmentType == null)
            return BadRequest(new { message = "El tipo de equipo no existe." });

        if (!request.File.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Solo se aceptan archivos .csv" });

        string content;
        using (var reader = new StreamReader(request.File.OpenReadStream()))
            content = await reader.ReadToEndAsync();

        var lines = content.Split('\n', StringSplitOptions.RemoveEmptyEntries)
                           .Select(l => l.TrimEnd('\r'))
                           .ToList();

        if (lines.Count == 0)
            return BadRequest(new { message = "Archivo vacío." });

        var headers = lines[0].Split(',').Select(h => h.Trim()).ToArray();
        var requiredHeaders = new[] { "AssetTag", "Brand", "Model", "SerialNumber", "PurchaseDate" };

        foreach (var required in requiredHeaders)
            if (!headers.Contains(required))
                return BadRequest(new { message = $"Columna requerida faltante: {required}" });

        var rows = new List<object>();

        for (int i = 1; i < lines.Count; i++)
        {
            var cols = lines[i].Split(',').Select(c => c.Trim()).ToArray();
            var dict = new Dictionary<string, string>();

            for (int j = 0; j < headers.Length && j < cols.Length; j++)
                dict[headers[j]] = cols[j];

            var dynamicSpecs = dict
                .Where(kvp => !requiredHeaders.Contains(kvp.Key))
                .ToDictionary(kvp => kvp.Key, kvp => kvp.Value);

            rows.Add(new
            {
                line = i + 1,
                assetTag = dict.GetValueOrDefault("AssetTag", ""),
                brand = dict.GetValueOrDefault("Brand", ""),
                model = dict.GetValueOrDefault("Model", ""),
                serialNumber = dict.GetValueOrDefault("SerialNumber", ""),
                purchaseDate = dict.GetValueOrDefault("PurchaseDate", ""),
                specs = dynamicSpecs
            });
        }

        return Ok(new
        {
            equipmentType = new { equipmentType.Id, equipmentType.Name },
            totalRows = rows.Count,
            rows
        });
    }

    [HttpPost("confirm")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Confirm([FromForm] ImportEquipmentCsvRequest request)
    {
        if (request.File == null || request.File.Length == 0)
            return BadRequest(new { message = "Archivo requerido." });

        if (request.EquipmentTypeId == Guid.Empty)
            return BadRequest(new { message = "Debe seleccionar un tipo de equipo." });

        var equipmentType = await _context.EquipmentTypes
            .FirstOrDefaultAsync(t => t.Id == request.EquipmentTypeId);

        if (equipmentType == null)
            return BadRequest(new { message = "El tipo de equipo no existe." });

        if (!request.File.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Solo se aceptan archivos .csv" });

        string content;
        using (var reader = new StreamReader(request.File.OpenReadStream()))
            content = await reader.ReadToEndAsync();

        var lines = content.Split('\n', StringSplitOptions.RemoveEmptyEntries)
                           .Select(l => l.TrimEnd('\r'))
                           .ToList();

        if (lines.Count == 0)
            return BadRequest(new { message = "Archivo vacío." });

        var headers = lines[0].Split(',').Select(h => h.Trim()).ToArray();
        var requiredHeaders = new[] { "AssetTag", "Brand", "Model", "SerialNumber", "PurchaseDate" };

        foreach (var required in requiredHeaders)
            if (!headers.Contains(required))
                return BadRequest(new { message = $"Columna requerida faltante: {required}" });

        var equipmentsToInsert = new List<Equipment>();
        var errors = new List<object>();
        var fileName = request.File.FileName;

        var seenAssetTags = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var seenSerials = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        for (int i = 1; i < lines.Count; i++)
        {
            var cols = lines[i].Split(',').Select(c => c.Trim()).ToArray();
            var dict = new Dictionary<string, string>();

            for (int j = 0; j < headers.Length && j < cols.Length; j++)
                dict[headers[j]] = cols[j];

            var assetTag = dict.GetValueOrDefault("AssetTag", "");
            var brand = dict.GetValueOrDefault("Brand", "");
            var model = dict.GetValueOrDefault("Model", "");
            var serial = dict.GetValueOrDefault("SerialNumber", "");
            var purchaseDateRaw = dict.GetValueOrDefault("PurchaseDate", "");
            var lineNum = i + 1;

            if (string.IsNullOrWhiteSpace(assetTag) ||
                string.IsNullOrWhiteSpace(brand) ||
                string.IsNullOrWhiteSpace(model) ||
                string.IsNullOrWhiteSpace(serial) ||
                string.IsNullOrWhiteSpace(purchaseDateRaw))
            {
                errors.Add(new { line = lineNum, serial, error = "Campos obligatorios incompletos." });
                continue;
            }

            if (!DateOnly.TryParse(purchaseDateRaw, out var purchaseDate))
            {
                errors.Add(new { line = lineNum, serial, error = "Fecha de compra inválida." });
                continue;
            }

            if (!seenAssetTags.Add(assetTag))
            {
                errors.Add(new { line = lineNum, serial, error = "AssetTag duplicado dentro del archivo." });
                continue;
            }

            if (!seenSerials.Add(serial))
            {
                errors.Add(new { line = lineNum, serial, error = "Número de serie duplicado dentro del archivo." });
                continue;
            }

            var dynamicSpecs = dict
                .Where(kvp => !requiredHeaders.Contains(kvp.Key))
                .ToDictionary(kvp => kvp.Key, kvp => kvp.Value);

            equipmentsToInsert.Add(new Equipment
            {
                Id = Guid.NewGuid(),
                AssetTag = assetTag,
                Brand = brand,
                Model = model,
                SerialNumber = serial,
                PurchaseDate = purchaseDate,
                SpecificationsJson = JsonSerializer.Serialize(dynamicSpecs),
                ImportSource = fileName,
                EquipmentTypeId = request.EquipmentTypeId,
                Status = "Activo",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            });
        }

        if (errors.Count > 0)
            return BadRequest(new { message = "El archivo contiene errores. No se insertó ningún registro.", errors });

        var assetTags = equipmentsToInsert.Select(e => e.AssetTag).ToList();
        var serials = equipmentsToInsert.Select(e => e.SerialNumber).ToList();

        var duplicatedAssetTagsInDb = await _context.Equipments
            .Where(e => assetTags.Contains(e.AssetTag))
            .Select(e => e.AssetTag)
            .ToListAsync();

        var duplicatedSerialsInDb = await _context.Equipments
            .Where(e => serials.Contains(e.SerialNumber))
            .Select(e => e.SerialNumber)
            .ToListAsync();

        if (duplicatedAssetTagsInDb.Any() || duplicatedSerialsInDb.Any())
        {
            return BadRequest(new
            {
                message = "Hay registros duplicados en la base de datos. No se insertó ningún registro.",
                duplicatedAssetTags = duplicatedAssetTagsInDb,
                duplicatedSerials = duplicatedSerialsInDb
            });
        }

        await using var tx = await _context.Database.BeginTransactionAsync();

        try
        {
            var codes = await _codeService.GenerateNextCodesAsync(
                equipmentType.Id,
                equipmentType.Name,
                equipmentsToInsert.Count);

            for (int i = 0; i < equipmentsToInsert.Count; i++)
            {
                equipmentsToInsert[i].Code = codes[i];
            }

            _context.Equipments.AddRange(equipmentsToInsert);
            await _context.SaveChangesAsync();
            await tx.CommitAsync();

            return Ok(new
            {
                successCount = equipmentsToInsert.Count,
                errorCount = 0
            });
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }
}

public class ImportEquipmentCsvRequest
{
    public IFormFile File { get; set; } = null!;
    public Guid EquipmentTypeId { get; set; }
}