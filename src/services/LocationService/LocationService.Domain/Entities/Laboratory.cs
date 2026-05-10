namespace LocationService.Domain.Entities;

public class Laboratory
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;         // Ej: "Laboratorio A", "Lab. Redes"
    public string? Building { get; set; }             // Edificio donde está
    public string? Floor { get; set; }                // Piso
    public int Capacity { get; set; }                 // Capacidad de equipos
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }

    // Navegación
    public ICollection<EquipmentLocation> EquipmentLocations { get; set; } = new List<EquipmentLocation>();
}