using EquipmentService.Domain.Entities;
using EquipmentService.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EquipmentService.API.Controllers;

[ApiController]
[Route("api/import")]
public class ImportController : ControllerBase
{
    private readonly EquipmentDbContext _context;

    public ImportController(EquipmentDbContext context)
    {
        _context = context;
    }

    // POST: api/import/preview
    [HttpPost("preview")]
    public async Task<IActionResult> Preview(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Archivo requerido." });

        if (!file.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Solo se aceptan archivos .csv" });

        string content;
        using (var reader = new StreamReader(file.OpenReadStream()))
            content = await reader.ReadToEndAsync();

        var lines = content.Split('\n', StringSplitOptions.RemoveEmptyEntries)
                           .Select(l => l.TrimEnd('\r'))
                           .ToList();

        if (lines.Count == 0)
            return BadRequest(new { message = "Archivo vacío." });

        var actualHeaders = lines[0].Split(',').Select(h => h.Trim()).ToArray();
        var requiredHeaders = new[] { "Code", "Brand", "Model", "SerialNumber", "EquipmentTypeName" };

        foreach (var required in requiredHeaders)
            if (!actualHeaders.Contains(required))
                return BadRequest(new { message = $"Columna requerida faltante: {required}" });

        var rows = new List<object>();

        for (int i = 1; i < lines.Count; i++)
        {
            var raw = lines[i];
            if (string.IsNullOrWhiteSpace(raw)) continue;

            var cols = raw.Split(',').Select(c => c.Trim()).ToArray();
            var dict = new Dictionary<string, string>();
            for (int j = 0; j < actualHeaders.Length && j < cols.Length; j++)
                dict[actualHeaders[j]] = cols[j];

            rows.Add(new
            {
                line              = i + 1,
                code              = dict.GetValueOrDefault("Code", ""),
                brand             = dict.GetValueOrDefault("Brand", ""),
                model             = dict.GetValueOrDefault("Model", ""),
                serialNumber      = dict.GetValueOrDefault("SerialNumber", ""),
                equipmentTypeName = dict.GetValueOrDefault("EquipmentTypeName", ""),
                purchaseDate      = dict.GetValueOrDefault("PurchaseDate", ""),
                price             = dict.GetValueOrDefault("Price", ""),
                supplier          = dict.GetValueOrDefault("Supplier", ""),
                invoiceNumber     = dict.GetValueOrDefault("InvoiceNumber", "")
            });
        }

        return Ok(new { totalRows = rows.Count, rows });
    }

    // POST: api/import/confirm
    [HttpPost("confirm")]
    public async Task<IActionResult> Confirm(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Archivo requerido." });

        if (!file.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Solo se aceptan archivos .csv" });

        string content;
        using (var reader = new StreamReader(file.OpenReadStream()))
            content = await reader.ReadToEndAsync();

        var lines = content.Split('\n', StringSplitOptions.RemoveEmptyEntries)
                           .Select(l => l.TrimEnd('\r'))
                           .ToList();

        if (lines.Count == 0)
            return BadRequest(new { message = "Archivo vacío." });

        var actualHeaders = lines[0].Split(',').Select(h => h.Trim()).ToArray();
        var successCount = 0;
        var errors = new List<object>();

        for (int i = 1; i < lines.Count; i++)
        {
            var raw = lines[i];
            if (string.IsNullOrWhiteSpace(raw)) continue;

            var cols = raw.Split(',').Select(c => c.Trim()).ToArray();
            var dict = new Dictionary<string, string>();
            for (int j = 0; j < actualHeaders.Length && j < cols.Length; j++)
                dict[actualHeaders[j]] = cols[j];

            var code     = dict.GetValueOrDefault("Code", "");
            var brand    = dict.GetValueOrDefault("Brand", "");
            var model    = dict.GetValueOrDefault("Model", "");
            var serial   = dict.GetValueOrDefault("SerialNumber", "");
            var typeName = dict.GetValueOrDefault("EquipmentTypeName", "");
            int lineNum  = i + 1;

            // Validaciones de campos obligatorios
            if (string.IsNullOrEmpty(code) || string.IsNullOrEmpty(brand) ||
                string.IsNullOrEmpty(model) || string.IsNullOrEmpty(serial) ||
                string.IsNullOrEmpty(typeName))
            {
                errors.Add(new { line = lineNum, serial, error = "Campos obligatorios incompletos." });
                continue;
            }

            // Validar duplicado de serie
            if (await _context.Equipments.AnyAsync(e => e.SerialNumber == serial))
            {
                errors.Add(new { line = lineNum, serial, error = "Número de serie duplicado." });
                continue;
            }

            // Validar duplicado de código
            if (await _context.Equipments.AnyAsync(e => e.Code == code))
            {
                errors.Add(new { line = lineNum, serial, error = "Código duplicado." });
                continue;
            }

            // Validar tipo de equipo
            var equipmentType = await _context.EquipmentTypes
                .FirstOrDefaultAsync(t => t.Name.ToLower() == typeName.ToLower());

            if (equipmentType == null)
            {
                errors.Add(new { line = lineNum, serial, error = $"Tipo de equipo '{typeName}' no existe." });
                continue;
            }

            // Construir equipo
            var equipment = new Equipment
            {
                Id              = Guid.NewGuid(),
                Code            = code,
                Brand           = brand,
                Model           = model,
                SerialNumber    = serial,
                Status          = "Activo",
                EquipmentTypeId = equipmentType.Id,
                IsActive        = true,
                CreatedAt       = DateTime.UtcNow
            };

            var priceStr = dict.GetValueOrDefault("Price", "");
            var dateStr  = dict.GetValueOrDefault("PurchaseDate", "");

            if (!string.IsNullOrEmpty(dateStr) && DateTime.TryParse(dateStr, out var purchaseDate))
            {
                decimal.TryParse(priceStr, System.Globalization.NumberStyles.Any,
                    System.Globalization.CultureInfo.InvariantCulture, out var price);

                equipment.Purchase = new Purchase
                {
                    Id            = Guid.NewGuid(),
                    PurchaseDate  = purchaseDate,
                    Price         = price,
                    Supplier      = dict.GetValueOrDefault("Supplier", ""),
                    InvoiceNumber = dict.GetValueOrDefault("InvoiceNumber", ""),
                    EquipmentId   = equipment.Id
                };
            }

            // Guardar uno por uno para que un fallo no cancele el resto
            try
            {
                _context.Equipments.Add(equipment);
                await _context.SaveChangesAsync();
                successCount++;
            }
            catch (Exception)
            {
                // Si falla al guardar (ej. duplicado a nivel BD que se escapó),
                // limpiar el tracker y reportar el error
                _context.ChangeTracker.Clear();
                errors.Add(new { line = lineNum, serial, error = "Error al guardar en base de datos." });
            }
        }

        return Ok(new { successCount, errorCount = errors.Count, errors });
    }
}