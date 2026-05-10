namespace EquipmentService.Domain.Entities;

public class EquipmentType
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;           // "PC", "Laptop", "Proyector", etc.
    public string? Description { get; set; }

    // Navegación
    public ICollection<Equipment> Equipments { get; set; } = new List<Equipment>();
}