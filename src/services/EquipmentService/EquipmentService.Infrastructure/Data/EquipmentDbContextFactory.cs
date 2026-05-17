using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace EquipmentService.Infrastructure.Data;

public class EquipmentDbContextFactory : IDesignTimeDbContextFactory<EquipmentDbContext>
{
    public EquipmentDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<EquipmentDbContext>();

        optionsBuilder.UseSqlServer(
            "Server=localhost\\SQLEXPRESS;Database=FISEI_EquipmentDB;Trusted_Connection=True;TrustServerCertificate=True;");

        return new EquipmentDbContext(optionsBuilder.Options);
    }
}