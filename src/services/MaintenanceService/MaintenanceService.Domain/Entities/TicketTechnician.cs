namespace MaintenanceService.Domain.Entities;

public class TicketTechnician
{
    public Guid Id { get; set; }
    public Guid TechnicianUserId { get; set; }          // Usuario técnico (UserService)
    public DateTime AssignedAt { get; set; }
    public string? ActivityDescription { get; set; }    // Actividades que realizó
    public string? Observations { get; set; }           // Observaciones del técnico

    // Relación con TicketEquipment
    public Guid TicketEquipmentId { get; set; }
    public TicketEquipment TicketEquipment { get; set; } = null!;
}