namespace MaintenanceService.Domain.Entities;

public class CatalogActivity
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;           // Ej: "Limpieza interna"
    public string? Description { get; set; }            // Descripción detallada
    public string Category { get; set; } = null!;       // "Correctivo", "Preventivo", "Adaptativo"
    public bool IsActive { get; set; } = true;

    // Navegación inversa
    public ICollection<TicketEquipmentActivity> TicketEquipmentActivities { get; set; } = new List<TicketEquipmentActivity>();
}
