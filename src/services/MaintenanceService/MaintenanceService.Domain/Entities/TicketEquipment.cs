namespace MaintenanceService.Domain.Entities;

public class TicketEquipment
{
    public Guid Id { get; set; }
    public Guid EquipmentId { get; set; }               // Referencia al equipo (EquipmentService)
    public string? Diagnosis { get; set; }              // Diagnóstico del equipo
    public string? Observation { get; set; }            // Observaciones
    public string Status { get; set; } = null!;         // "Pendiente", "En Proceso", "Terminado"

    // HU-12: campos para historial de cambio de estado
    public DateTime? LastStatusChangedAt { get; set; }
    public Guid? LastStatusChangedByUserId { get; set; }

    // Relación con Ticket
    public Guid TicketId { get; set; }
    public Ticket Ticket { get; set; } = null!;

    // Navegación
    public ICollection<TicketTechnician> TicketTechnicians { get; set; } = new List<TicketTechnician>();
    public ICollection<Activity> Activities { get; set; } = new List<Activity>();
    public ICollection<Resource> Resources { get; set; } = new List<Resource>();
}