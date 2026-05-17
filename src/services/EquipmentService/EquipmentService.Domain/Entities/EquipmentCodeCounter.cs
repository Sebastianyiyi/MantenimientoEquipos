namespace EquipmentService.Domain.Entities;

public class EquipmentCodeCounter
{
    public Guid EquipmentTypeId { get; set; }
    public string Prefix { get; set; } = null!;
    public int LastNumber { get; set; }

    public EquipmentType EquipmentType { get; set; } = null!;
}