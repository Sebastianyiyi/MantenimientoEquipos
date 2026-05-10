namespace EquipmentService.Domain.Entities;

public class Equipment
{
    public Guid Id { get; set; }
    public string Code { get; set; } = null!;           // Código interno FISEI
    public string Brand { get; set; } = null!;          // Marca
    public string Model { get; set; } = null!;          // Modelo
    public string SerialNumber { get; set; } = null!;   // Número de serie
    public string Status { get; set; } = null!;         // "Activo", "En mantenimiento", "Dado de baja"
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Relación con EquipmentType
    public Guid EquipmentTypeId { get; set; }
    public EquipmentType EquipmentType { get; set; } = null!;

    // Navegación
    public ICollection<EquipmentAttribute> Attributes { get; set; } = new List<EquipmentAttribute>();
    public Purchase? Purchase { get; set; }
}