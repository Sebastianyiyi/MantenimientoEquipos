namespace MaintenanceService.Application.DTOs;

public class UpdateStatusDto
{
    public string NewStatus { get; set; } = null!;
    public string? Comment { get; set; }
    public Guid ChangedByUserId { get; set; }
}