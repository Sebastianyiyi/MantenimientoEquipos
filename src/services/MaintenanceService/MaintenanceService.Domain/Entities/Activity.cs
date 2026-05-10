namespace MaintenanceService.Domain.Entities;

public class Activity
{
    public Guid Id { get; set; }
    public string Description { get; set; } = null!;   // Actividad realizada
    public DateTime PerformedAt { get; set; }           // Fecha/hora de la actividad
    public Guid PerformedByUserId { get; set; }         // Laboratorista que la realizó

    // Relación con TicketEquipment
    public Guid TicketEquipmentId { get; set; }
    public TicketEquipment TicketEquipment { get; set; } = null!;
}