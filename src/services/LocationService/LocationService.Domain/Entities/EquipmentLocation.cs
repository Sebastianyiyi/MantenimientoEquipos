namespace LocationService.Domain.Entities;

public class EquipmentLocation
{
    public Guid Id { get; set; }
    public Guid EquipmentId { get; set; }             // Referencia al equipo (EquipmentService)
    public DateTime AssignedAt { get; set; }          // Fecha en que se ubicó el equipo
    public DateTime? RemovedAt { get; set; }          // Fecha en que se retiró (null = sigue ahí)
    public bool IsCurrent { get; set; } = true;       // ¿Es la ubicación actual?
    public string? Notes { get; set; }                // Observaciones

    // Relación con Laboratory
    public Guid LaboratoryId { get; set; }
    public Laboratory Laboratory { get; set; } = null!;
}