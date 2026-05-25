namespace MaintenanceService.Domain.Entities;

public class TicketEquipment
{
    public Guid Id { get; set; }
    public Guid EquipmentId { get; set; }
    public string? Diagnosis { get; set; }
    public string? Observation { get; set; }
    public string Status { get; set; } = null!;      // "Pendiente", "En Proceso", "Terminado"
    public DateTime? LastStatusChangedAt { get; set; }
    public Guid? LastStatusChangedByUserId { get; set; }

    public Guid TicketId { get; set; }
    public Ticket Ticket { get; set; } = null!;

    public ICollection<TicketTechnician> TicketTechnicians { get; set; } = new List<TicketTechnician>();
    public ICollection<Activity> Activities { get; set; } = new List<Activity>();
    public ICollection<Resource> Resources { get; set; } = new List<Resource>();
}