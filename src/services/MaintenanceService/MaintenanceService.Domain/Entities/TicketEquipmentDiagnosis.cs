namespace MaintenanceService.Domain.Entities;

public class TicketEquipmentDiagnosis
{
    public Guid Id { get; set; }

    public Guid TicketEquipmentId { get; set; }
    public TicketEquipment TicketEquipment { get; set; } = null!;

    public Guid CatalogDiagnosisId { get; set; }
    public CatalogDiagnosis CatalogDiagnosis { get; set; } = null!;

    public Guid AddedByUserId { get; set; }
    public DateTime AddedAt { get; set; }
}
