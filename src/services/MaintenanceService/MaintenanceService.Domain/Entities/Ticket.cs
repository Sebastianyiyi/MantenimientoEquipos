namespace MaintenanceService.Domain.Entities;

public class Ticket
{
    public Guid Id { get; set; }
    public string TicketNumber { get; set; } = null!;   // Ej: "TKT-2024-001"
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public string MaintenanceType { get; set; } = null!;    // "Correctivo", "Preventivo", "Adaptativo"
    public string Status { get; set; } = null!;         // "Abierto", "En progreso", "Cerrado"
    public string Priority { get; set; } = null!;       // "Baja", "Media", "Alta"
    public Guid CreatedByUserId { get; set; }           // Laboratorista que abrió el ticket
    public DateTime CreatedAt { get; set; }
    public DateTime? ClosedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navegación
    public ICollection<TicketEquipment> TicketEquipments { get; set; } = new List<TicketEquipment>();
}