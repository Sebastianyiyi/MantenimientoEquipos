using EquipmentService.Domain.Entities;
using EquipmentService.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EquipmentService.API.Controllers;

[ApiController]
[Route("api/equipments")]
public class EquipmentsController : ControllerBase
{
    private readonly EquipmentDbContext _context;

    public EquipmentsController(EquipmentDbContext context)
    {
        _context = context;
    }

    // GET: api/equipments
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? status, [FromQuery] string? search)
    {
        var query = _context.Equipments
            .Include(e => e.EquipmentType)
            .Include(e => e.Purchase)
            .Include(e => e.Attributes)
            .Where(e => e.IsActive)
            .AsQueryable();

        if (!string.IsNullOrEmpty(status))
            query = query.Where(e => e.Status == status);

        if (!string.IsNullOrEmpty(search))
            query = query.Where(e =>
                e.Code.Contains(search) ||
                e.Brand.Contains(search) ||
                e.Model.Contains(search) ||
                e.SerialNumber.Contains(search));

        var equipments = await query
            .OrderByDescending(e => e.CreatedAt)
            .Select(e => new
            {
                e.Id,
                e.Code,
                e.Brand,
                e.Model,
                e.SerialNumber,
                e.Status,
                e.CreatedAt,
                e.UpdatedAt,
                EquipmentType = new { e.EquipmentType.Id, e.EquipmentType.Name },
                Purchase = e.Purchase == null ? null : new
                {
                    e.Purchase.PurchaseDate,
                    e.Purchase.Price,
                    e.Purchase.Supplier,
                    e.Purchase.InvoiceNumber,
                    e.Purchase.Notes
                },
                Attributes = e.Attributes.Select(a => new { a.Id, a.Key, a.Value })
            })
            .ToListAsync();

        return Ok(equipments);
    }

    // GET: api/equipments/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var e = await _context.Equipments
            .Include(e => e.EquipmentType)
            .Include(e => e.Purchase)
            .Include(e => e.Attributes)
            .FirstOrDefaultAsync(e => e.Id == id && e.IsActive);

        if (e == null)
            return NotFound(new { message = "Equipo no encontrado." });

        return Ok(new
        {
            e.Id, e.Code, e.Brand, e.Model, e.SerialNumber, e.Status, e.CreatedAt, e.UpdatedAt,
            EquipmentType = new { e.EquipmentType.Id, e.EquipmentType.Name },
            Purchase = e.Purchase == null ? null : new
            {
                e.Purchase.PurchaseDate, e.Purchase.Price,
                e.Purchase.Supplier, e.Purchase.InvoiceNumber, e.Purchase.Notes
            },
            Attributes = e.Attributes.Select(a => new { a.Id, a.Key, a.Value })
        });
    }

    // POST: api/equipments (registro unitario)
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateEquipmentDto dto)
    {
        if (await _context.Equipments.AnyAsync(e => e.SerialNumber == dto.SerialNumber))
            return BadRequest(new { message = "Ya existe un equipo con ese número de serie." });

        if (await _context.Equipments.AnyAsync(e => e.Code == dto.Code))
            return BadRequest(new { message = "Ya existe un equipo con ese código." });

        if (!await _context.EquipmentTypes.AnyAsync(t => t.Id == dto.EquipmentTypeId))
            return BadRequest(new { message = "El tipo de equipo no existe." });

        var equipment = new Equipment
        {
            Id = Guid.NewGuid(),
            Code = dto.Code,
            Brand = dto.Brand,
            Model = dto.Model,
            SerialNumber = dto.SerialNumber,
            Status = "Activo",
            EquipmentTypeId = dto.EquipmentTypeId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        if (dto.Attributes != null)
            foreach (var attr in dto.Attributes)
                equipment.Attributes.Add(new EquipmentAttribute
                {
                    Id = Guid.NewGuid(),
                    Key = attr.Key,
                    Value = attr.Value,
                    EquipmentId = equipment.Id
                });

        if (dto.Purchase != null)
            equipment.Purchase = new Purchase
            {
                Id = Guid.NewGuid(),
                PurchaseDate = dto.Purchase.PurchaseDate,
                Price = dto.Purchase.Price,
                Supplier = dto.Purchase.Supplier,
                InvoiceNumber = dto.Purchase.InvoiceNumber,
                Notes = dto.Purchase.Notes,
                EquipmentId = equipment.Id
            };

        _context.Equipments.Add(equipment);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = equipment.Id }, new { equipment.Id, equipment.Code });
    }

    // POST: api/equipments/batch (registro por lote)
    [HttpPost("batch")]
    public async Task<IActionResult> CreateBatch([FromBody] List<CreateEquipmentDto> dtos)
    {
        var results = new List<object>();

        foreach (var dto in dtos)
        {
            if (await _context.Equipments.AnyAsync(e => e.SerialNumber == dto.SerialNumber))
            {
                results.Add(new { dto.SerialNumber, success = false, error = "Número de serie duplicado." });
                continue;
            }

            if (await _context.Equipments.AnyAsync(e => e.Code == dto.Code))
            {
                results.Add(new { dto.SerialNumber, success = false, error = "Código duplicado." });
                continue;
            }

            var equipment = new Equipment
            {
                Id = Guid.NewGuid(),
                Code = dto.Code,
                Brand = dto.Brand,
                Model = dto.Model,
                SerialNumber = dto.SerialNumber,
                Status = "Activo",
                EquipmentTypeId = dto.EquipmentTypeId,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            if (dto.Attributes != null)
                foreach (var attr in dto.Attributes)
                    equipment.Attributes.Add(new EquipmentAttribute
                    {
                        Id = Guid.NewGuid(),
                        Key = attr.Key,
                        Value = attr.Value,
                        EquipmentId = equipment.Id
                    });

            if (dto.Purchase != null)
                equipment.Purchase = new Purchase
                {
                    Id = Guid.NewGuid(),
                    PurchaseDate = dto.Purchase.PurchaseDate,
                    Price = dto.Purchase.Price,
                    Supplier = dto.Purchase.Supplier,
                    InvoiceNumber = dto.Purchase.InvoiceNumber,
                    Notes = dto.Purchase.Notes,
                    EquipmentId = equipment.Id
                };

            _context.Equipments.Add(equipment);
            results.Add(new { dto.SerialNumber, success = true, error = (string?)null });
        }

        await _context.SaveChangesAsync();
        return Ok(results);
    }

    // PUT: api/equipments/{id}
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateEquipmentDto dto)
    {
        var equipment = await _context.Equipments
            .Include(e => e.Attributes)
            .Include(e => e.Purchase)
            .FirstOrDefaultAsync(e => e.Id == id && e.IsActive);

        if (equipment == null)
            return NotFound(new { message = "Equipo no encontrado." });

        equipment.Brand = dto.Brand;
        equipment.Model = dto.Model;
        equipment.UpdatedAt = DateTime.UtcNow;

        // Actualizar atributos: reemplazar todos
        _context.EquipmentAttributes.RemoveRange(equipment.Attributes);
        if (dto.Attributes != null)
            foreach (var attr in dto.Attributes)
                equipment.Attributes.Add(new EquipmentAttribute
                {
                    Id = Guid.NewGuid(),
                    Key = attr.Key,
                    Value = attr.Value,
                    EquipmentId = equipment.Id
                });

        // Actualizar compra
        if (dto.Purchase != null)
        {
            if (equipment.Purchase == null)
                equipment.Purchase = new Purchase { Id = Guid.NewGuid(), EquipmentId = equipment.Id };

            equipment.Purchase.PurchaseDate = dto.Purchase.PurchaseDate;
            equipment.Purchase.Price = dto.Purchase.Price;
            equipment.Purchase.Supplier = dto.Purchase.Supplier;
            equipment.Purchase.InvoiceNumber = dto.Purchase.InvoiceNumber;
            equipment.Purchase.Notes = dto.Purchase.Notes;
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Equipo actualizado correctamente." });
    }

    // PATCH: api/equipments/{id}/status
    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateStatusDto dto)
    {
        var validStatuses = new[] { "Activo", "En mantenimiento", "Dado de baja" };
        if (!validStatuses.Contains(dto.Status))
            return BadRequest(new { message = "Estado inválido." });

        var equipment = await _context.Equipments.FindAsync(id);
        if (equipment == null || !equipment.IsActive)
            return NotFound(new { message = "Equipo no encontrado." });

        equipment.Status = dto.Status;
        equipment.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Estado actualizado.", equipment.Status });
    }

    // DELETE: api/equipments/{id} (baja lógica)
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var equipment = await _context.Equipments.FindAsync(id);
        if (equipment == null || !equipment.IsActive)
            return NotFound(new { message = "Equipo no encontrado." });

        equipment.IsActive = false;
        equipment.Status = "Dado de baja";
        equipment.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Equipo dado de baja correctamente." });
    }

    // GET: api/equipments/stats
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var total = await _context.Equipments.CountAsync(e => e.IsActive);
        var activos = await _context.Equipments.CountAsync(e => e.IsActive && e.Status == "Activo");
        var enMantenimiento = await _context.Equipments.CountAsync(e => e.IsActive && e.Status == "En mantenimiento");
        var dadosDeBaja = await _context.Equipments.CountAsync(e => e.IsActive && e.Status == "Dado de baja");

        var porTipo = await _context.Equipments
            .Where(e => e.IsActive)
            .GroupBy(e => e.EquipmentType.Name)
            .Select(g => new { tipo = g.Key, cantidad = g.Count() })
            .ToListAsync();

        return Ok(new { total, activos, enMantenimiento, dadosDeBaja, porTipo });
    }
}

// DTOs
public class CreateEquipmentDto
{
    public string Code { get; set; } = null!;
    public string Brand { get; set; } = null!;
    public string Model { get; set; } = null!;
    public string SerialNumber { get; set; } = null!;
    public Guid EquipmentTypeId { get; set; }
    public List<AttributeDto>? Attributes { get; set; }
    public PurchaseDto? Purchase { get; set; }
}

public class UpdateEquipmentDto
{
    public string Brand { get; set; } = null!;
    public string Model { get; set; } = null!;
    public List<AttributeDto>? Attributes { get; set; }
    public PurchaseDto? Purchase { get; set; }
}

public class AttributeDto
{
    public string Key { get; set; } = null!;
    public string Value { get; set; } = null!;
}

public class PurchaseDto
{
    public DateTime PurchaseDate { get; set; }
    public decimal Price { get; set; }
    public string? Supplier { get; set; }
    public string? InvoiceNumber { get; set; }
    public string? Notes { get; set; }
}

public class UpdateStatusDto
{
    public string Status { get; set; } = null!;
}