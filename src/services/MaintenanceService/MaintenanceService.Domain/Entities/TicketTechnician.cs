namespace MaintenanceService.Domain.Entities;

public class TicketTechnician
{
    public Guid Id { get; set; }
    public Guid TechnicianUserId { get; set; }          // Laboratorista asignado (UserService)
    public DateTime AssignedAt { get; set; }

    // Relación con TicketEquipment
    public Guid TicketEquipmentId { get; set; }
    public TicketEquipment TicketEquipment { get; set; } = null!;
}