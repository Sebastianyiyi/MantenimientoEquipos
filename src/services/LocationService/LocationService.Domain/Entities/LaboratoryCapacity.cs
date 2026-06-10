namespace LocationService.Domain.Entities;

public class LaboratoryCapacity
{
    public Guid Id { get; set; }

    public Guid LaboratoryId { get; set; }
    public Laboratory Laboratory { get; set; } = null!;

    // Id del tipo de equipo definido en EquipmentService
    public Guid EquipmentTypeId { get; set; }

    // Snapshot opcional para mostrar nombre sin consultar otro servicio
    public string? EquipmentTypeName { get; set; }

    // Máximo permitido de ese tipo de equipo en este laboratorio
    public int MaxCapacity { get; set; }

    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}