namespace EquipmentService.Domain.Entities;

public class EquipmentAttribute
{
    public Guid Id { get; set; }
    public string Key { get; set; } = null!;        // Ej: "RAM", "Almacenamiento", "Lúmenes"
    public string Value { get; set; } = null!;      // Ej: "8GB", "512GB SSD", "3200"

    // Relación con Equipment
    public Guid EquipmentId { get; set; }
    public Equipment Equipment { get; set; } = null!;
}