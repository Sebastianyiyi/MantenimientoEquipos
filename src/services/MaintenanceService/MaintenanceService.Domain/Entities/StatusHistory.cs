namespace MaintenanceService.Domain.Entities;

public class StatusHistory
{
    public Guid Id { get; set; }
    public string EntityType { get; set; } = null!;       // "Ticket" o "TicketEquipment"
    public Guid EntityId { get; set; }                    // Id del Ticket o TicketEquipment
    public string PreviousStatus { get; set; } = null!;
    public string NewStatus { get; set; } = null!;
    public string? Comment { get; set; }
    public Guid ChangedByUserId { get; set; }
    public DateTime ChangedAt { get; set; }
}