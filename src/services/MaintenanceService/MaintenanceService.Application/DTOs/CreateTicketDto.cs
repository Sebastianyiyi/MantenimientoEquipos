namespace MaintenanceService.Application.DTOs;

public class CreateTicketDto
{
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public string MaintenanceType { get; set; } = null!;
    public string Priority { get; set; } = "Media";
    public Guid CreatedByUserId { get; set; }
    public List<Guid> EquipmentIds { get; set; } = new();
}