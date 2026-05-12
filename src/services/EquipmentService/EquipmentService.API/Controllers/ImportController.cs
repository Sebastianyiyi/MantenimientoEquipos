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

    // POST: api/import/preview — parsea el CSV sin guardar
    [HttpPost("preview")]
    public async Task<IActionResult> Preview(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Archivo requerido." });

        var extension = Path.GetExtension(file.FileName).ToLower();
        if (extension != ".csv")
            return BadRequest(new { message = "Solo se aceptan archivos .csv" });

        var rows = new List<object>();
        using var reader = new StreamReader(file.OpenReadStream());

        var header = await reader.ReadLineAsync();
        if (header == null)
            return BadRequest(new { message = "Archivo vacío." });

        var expectedHeaders = new[] { "Code", "Brand", "Model", "SerialNumber", "EquipmentTypeName", "PurchaseDate", "Price", "Supplier", "InvoiceNumber" };
        var actualHeaders = header.Split(',').Select(h => h.Trim()).ToArray();

        foreach (var expected in expectedHeaders.Take(5)) // primeros 5 son obligatorios
            if (!actualHeaders.Contains(expected))
                return BadRequest(new { message = $"Columna requerida faltante: {expected}" });

        int line = 1;
        while (!reader.EndOfStream)
        {
            line++;
            var raw = await reader.ReadLineAsync();
            if (string.IsNullOrWhiteSpace(raw)) continue;

            var cols = raw.Split(',').Select(c => c.Trim()).ToArray();
            var dict = new Dictionary<string, string>();
            for (int i = 0; i < actualHeaders.Length && i < cols.Length; i++)
                dict[actualHeaders[i]] = cols[i];

            rows.Add(new
            {
                line,
                code = dict.GetValueOrDefault("Code", ""),
                brand = dict.GetValueOrDefault("Brand", ""),
                model = dict.GetValueOrDefault("Model", ""),
                serialNumber = dict.GetValueOrDefault("SerialNumber", ""),
                equipmentTypeName = dict.GetValueOrDefault("EquipmentTypeName", ""),
                purchaseDate = dict.GetValueOrDefault("PurchaseDate", ""),
                price = dict.GetValueOrDefault("Price", ""),
                supplier = dict.GetValueOrDefault("Supplier", ""),
                invoiceNumber = dict.GetValueOrDefault("InvoiceNumber", "")
            });
        }

        return Ok(new { totalRows = rows.Count, rows });
    }

    // POST: api/import/confirm — guarda los registros del CSV
    [HttpPost("confirm")]
    public async Task<IActionResult> Confirm(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Archivo requerido." });

        var extension = Path.GetExtension(file.FileName).ToLower();
        if (extension != ".csv")
            return BadRequest(new { message = "Solo se aceptan archivos .csv" });

        var successCount = 0;
        var errors = new List<object>();

        using var reader = new StreamReader(file.OpenReadStream());
        var header = await reader.ReadLineAsync();
        if (header == null) return BadRequest(new { message = "Archivo vacío." });

        var actualHeaders = header.Split(',').Select(h => h.Trim()).ToArray();
        int line = 1;

        while (!reader.EndOfStream)
        {
            line++;
            var raw = await reader.ReadLineAsync();
            if (string.IsNullOrWhiteSpace(raw)) continue;

            var cols = raw.Split(',').Select(c => c.Trim()).ToArray();
            var dict = new Dictionary<string, string>();
            for (int i = 0; i < actualHeaders.Length && i < cols.Length; i++)
                dict[actualHeaders[i]] = cols[i];

            var code = dict.GetValueOrDefault("Code", "");
            var brand = dict.GetValueOrDefault("Brand", "");
            var model = dict.GetValueOrDefault("Model", "");
            var serial = dict.GetValueOrDefault("SerialNumber", "");
            var typeName = dict.GetValueOrDefault("EquipmentTypeName", "");

            if (string.IsNullOrEmpty(code) || string.IsNullOrEmpty(brand) ||
                string.IsNullOrEmpty(model) || string.IsNullOrEmpty(serial) || string.IsNullOrEmpty(typeName))
            {
                errors.Add(new { line, serial, error = "Campos obligatorios incompletos." });
                continue;
            }

            if (await _context.Equipments.AnyAsync(e => e.SerialNumber == serial))
            {
                errors.Add(new { line, serial, error = "Número de serie duplicado." });
                continue;
            }

            if (await _context.Equipments.AnyAsync(e => e.Code == code))
            {
                errors.Add(new { line, serial, error = "Código duplicado." });
                continue;
            }

            var equipmentType = await _context.EquipmentTypes
                .FirstOrDefaultAsync(t => t.Name.ToLower() == typeName.ToLower());

            if (equipmentType == null)
            {
                errors.Add(new { line, serial, error = $"Tipo de equipo '{typeName}' no existe." });
                continue;
            }

            var equipment = new Equipment
            {
                Id = Guid.NewGuid(),
                Code = code,
                Brand = brand,
                Model = model,
                SerialNumber = serial,
                Status = "Activo",
                EquipmentTypeId = equipmentType.Id,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            var priceStr = dict.GetValueOrDefault("Price", "");
            var dateStr = dict.GetValueOrDefault("PurchaseDate", "");
            if (!string.IsNullOrEmpty(dateStr) && DateTime.TryParse(dateStr, out var purchaseDate))
            {
                decimal.TryParse(priceStr, out var price);
                equipment.Purchase = new Purchase
                {
                    Id = Guid.NewGuid(),
                    PurchaseDate = purchaseDate,
                    Price = price,
                    Supplier = dict.GetValueOrDefault("Supplier", ""),
                    InvoiceNumber = dict.GetValueOrDefault("InvoiceNumber", ""),
                    EquipmentId = equipment.Id
                };
            }

            _context.Equipments.Add(equipment);
            successCount++;
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            successCount,
            errorCount = errors.Count,
            errors
        });
    }
}