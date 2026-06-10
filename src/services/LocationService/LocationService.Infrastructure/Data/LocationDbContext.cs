      using LocationService.Domain.Entities;
      using Microsoft.EntityFrameworkCore;

      namespace LocationService.Infrastructure.Data;

      public class LocationDbContext : DbContext
      {
            public LocationDbContext(DbContextOptions<LocationDbContext> options) : base(options) { }

            public DbSet<Laboratory> Laboratories => Set<Laboratory>();
            public DbSet<EquipmentLocation> EquipmentLocations => Set<EquipmentLocation>();
            public DbSet<LaboratoryCapacity> LaboratoryCapacities => Set<LaboratoryCapacity>();

            protected override void OnModelCreating(ModelBuilder modelBuilder)
            {
                  // Laboratory
                  modelBuilder.Entity<Laboratory>(entity =>
                  {
                        entity.HasKey(e => e.Id);

                        entity.Property(e => e.Name)
                        .IsRequired()
                        .HasMaxLength(128);

                        entity.Property(e => e.Building)
                        .HasMaxLength(128);

                        entity.Property(e => e.Floor)
                        .HasMaxLength(32);

                        entity.HasIndex(e => e.Name)
                        .IsUnique()
                        .HasFilter("[IsActive] = 1");
                  });

                  // LaboratoryCapacity
                  modelBuilder.Entity<LaboratoryCapacity>(entity =>
                  {
                        entity.HasKey(e => e.Id);

                        entity.Property(e => e.EquipmentTypeName)
                        .HasMaxLength(128);

                        entity.Property(e => e.MaxCapacity)
                        .IsRequired();

                        entity.HasOne(e => e.Laboratory)
                        .WithMany(l => l.LaboratoryCapacities)
                        .HasForeignKey(e => e.LaboratoryId)
                        .OnDelete(DeleteBehavior.Cascade);

                        entity.HasIndex(e => new { e.LaboratoryId, e.EquipmentTypeId })
                        .IsUnique();

                        entity.HasIndex(e => e.LaboratoryId);
                        entity.HasIndex(e => e.EquipmentTypeId);
                  });

                  // EquipmentLocation
                  modelBuilder.Entity<EquipmentLocation>(entity =>
                  {
                        entity.HasKey(e => e.Id);

                        entity.Property(e => e.EquipmentTypeName)
                        .HasMaxLength(128);

                        entity.Property(e => e.Notes)
                        .HasMaxLength(512);

                        entity.HasOne(e => e.Laboratory)
                        .WithMany(l => l.EquipmentLocations)
                        .HasForeignKey(e => e.LaboratoryId)
                        .OnDelete(DeleteBehavior.Restrict);

                        // Un equipo solo puede tener una ubicación actual
                        entity.HasIndex(e => e.EquipmentId)
                        .IsUnique()
                        .HasFilter("[IsCurrent] = 1");

                        // Consultas por equipo actual
                        entity.HasIndex(e => new { e.EquipmentId, e.IsCurrent });

                        // Consultas de ocupación actual por laboratorio y tipo
                        entity.HasIndex(e => new { e.LaboratoryId, e.EquipmentTypeId, e.IsCurrent });

                        // Historial por equipo
                        entity.HasIndex(e => new { e.EquipmentId, e.AssignedAt });
                  });
            }
      }