namespace EquipmentService.Domain.Entities;

public class EquipmentType
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public string? Description { get; set; }

    public ICollection<Equipment> Equipments { get; set; } = new List<Equipment>();
}