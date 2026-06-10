namespace EquipmentService.Domain.Entities;

public class Purchase
{
    public Guid Id { get; set; }
    public DateTime PurchaseDate { get; set; }          // Fecha de compra
    public decimal Price { get; set; }                  // Precio de compra
    public string? Supplier { get; set; }               // Proveedor
    public string? InvoiceNumber { get; set; }          // Número de factura
    public string? Notes { get; set; }                  // Observaciones

    // Relación con Equipment (1 a 1)
    public Guid EquipmentId { get; set; }
    public Equipment Equipment { get; set; } = null!;
}