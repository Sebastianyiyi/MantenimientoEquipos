namespace MaintenanceService.Domain.Entities;

public class Resource
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;           // Ej: "Pasta térmica", "Memoria RAM 8GB"
    public string? Description { get; set; }            // Descripción adicional
    public int Quantity { get; set; } = 1;              // Cantidad utilizada

    // Relación con TicketEquipment
    public Guid TicketEquipmentId { get; set; }
    public TicketEquipment TicketEquipment { get; set; } = null!;
}