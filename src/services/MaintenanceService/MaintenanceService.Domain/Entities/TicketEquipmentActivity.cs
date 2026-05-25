namespace MaintenanceService.Domain.Entities;

public class TicketEquipmentActivity
{
    public Guid Id { get; set; }

    public Guid TicketEquipmentId { get; set; }
    public TicketEquipment TicketEquipment { get; set; } = null!;

    public Guid CatalogActivityId { get; set; }
    public CatalogActivity CatalogActivity { get; set; } = null!;

    public Guid AddedByUserId { get; set; }
    public DateTime AddedAt { get; set; }
}
