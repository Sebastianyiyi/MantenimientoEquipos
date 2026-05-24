using MaintenanceService.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace MaintenanceService.API.Services;

public class TicketCodeService
{
    private readonly MaintenanceDbContext _db;

    public TicketCodeService(MaintenanceDbContext db)
    {
        _db = db;
    }

    public async Task<string> GenerateAsync()
    {
        int year = DateTime.UtcNow.Year;
        int count = await _db.Tickets
            .CountAsync(t => t.CreatedAt.Year == year);
        return $"CASE-{year}-{(count + 1):D4}";
    }
}