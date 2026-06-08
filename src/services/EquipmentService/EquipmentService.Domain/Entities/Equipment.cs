namespace EquipmentService.Domain.Entities;

public class Equipment
{
    public Guid Id { get; set; }
    public string Code { get; set; } = null!;
    public string AssetTag { get; set; } = null!;
    public string Brand { get; set; } = null!;
    public string Model { get; set; } = null!;
    public string SerialNumber { get; set; } = null!;
    public string Status { get; set; } = "Operativo";
    public bool IsActive { get; set; } = true;
    public DateOnly PurchaseDate { get; set; }
    public string SpecificationsJson { get; set; } = "{}";
    public string ImportSource { get; set; } = "Manual";
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public Guid EquipmentTypeId { get; set; }
    public EquipmentType EquipmentType { get; set; } = null!;

    public Guid? LaboratoristaUserId { get; set; }
    public string? LaboratoristaNombre { get; set; }

    public string? BajaMotivo { get; set; }
    public DateTime? BajaAt { get; set; }
}