namespace LocationService.Domain.Entities;

public class EquipmentLocation
{
    public Guid Id { get; set; }

    // Referencia al equipo en EquipmentService
    public Guid EquipmentId { get; set; }

    // Referencia al tipo de equipo en EquipmentService
    public Guid EquipmentTypeId { get; set; }

    // Snapshot opcional para lectura rápida y trazabilidad
    public string? EquipmentTypeName { get; set; }

    public DateTime AssignedAt { get; set; }
    public DateTime? RemovedAt { get; set; }
    public bool IsCurrent { get; set; } = true;
    public string? Notes { get; set; }

    // Relación con Laboratory
    public Guid LaboratoryId { get; set; }
    public Laboratory Laboratory { get; set; } = null!;
}