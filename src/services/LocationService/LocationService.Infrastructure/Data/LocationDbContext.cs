using LocationService.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace LocationService.Infrastructure.Data;

public class LocationDbContext : DbContext
{
    public LocationDbContext(DbContextOptions<LocationDbContext> options) : base(options) { }

    public DbSet<Laboratory> Laboratories => Set<Laboratory>();
    public DbSet<EquipmentLocation> EquipmentLocations => Set<EquipmentLocation>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Laboratory
        modelBuilder.Entity<Laboratory>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(128);
            entity.Property(e => e.Building).HasMaxLength(128);
            entity.Property(e => e.Floor).HasMaxLength(32);
            entity.HasIndex(e => e.Name).IsUnique();
        });

        // EquipmentLocation
        modelBuilder.Entity<EquipmentLocation>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Notes).HasMaxLength(512);

            entity.HasOne(e => e.Laboratory)
                  .WithMany(l => l.EquipmentLocations)
                  .HasForeignKey(e => e.LaboratoryId)
                  .OnDelete(DeleteBehavior.Restrict);

            // Índice para consultar rápido la ubicación actual de un equipo
            entity.HasIndex(e => new { e.EquipmentId, e.IsCurrent });
        });
    }
}