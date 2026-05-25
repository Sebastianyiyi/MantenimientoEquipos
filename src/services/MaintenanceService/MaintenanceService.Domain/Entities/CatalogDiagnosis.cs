namespace MaintenanceService.Domain.Entities;

public class CatalogDiagnosis
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;           // Ej: "Sobrecalentamiento"
    public string? Description { get; set; }
    public string Severity { get; set; } = "Media";    // "Baja", "Media", "Alta"
    public bool IsActive { get; set; } = true;

    // Navegación inversa
    public ICollection<TicketEquipmentDiagnosis> TicketEquipmentDiagnoses { get; set; } = new List<TicketEquipmentDiagnosis>();
}
