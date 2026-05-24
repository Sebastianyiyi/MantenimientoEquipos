namespace LocationService.Domain.Entities;

public class Laboratory
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public string? Building { get; set; }
    public string? Floor { get; set; }

    // Temporal: mantener mientras migramos de capacidad global a capacidad por tipo
    public int Capacity { get; set; }

    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }

    public ICollection<EquipmentLocation> EquipmentLocations { get; set; } = new List<EquipmentLocation>();
    public ICollection<LaboratoryCapacity> LaboratoryCapacities { get; set; } = new List<LaboratoryCapacity>();
}