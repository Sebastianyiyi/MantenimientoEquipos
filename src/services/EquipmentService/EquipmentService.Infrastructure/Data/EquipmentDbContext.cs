using EquipmentService.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace EquipmentService.Infrastructure.Data;

public class EquipmentDbContext : DbContext
{
    public EquipmentDbContext(DbContextOptions<EquipmentDbContext> options) : base(options) { }

    public DbSet<EquipmentType> EquipmentTypes => Set<EquipmentType>();
    public DbSet<Equipment> Equipments => Set<Equipment>();
    public DbSet<EquipmentAttribute> EquipmentAttributes => Set<EquipmentAttribute>();
    public DbSet<Purchase> Purchases => Set<Purchase>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // EquipmentType
        modelBuilder.Entity<EquipmentType>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(64);
            entity.HasIndex(e => e.Name).IsUnique();
        });

        // Equipment
        modelBuilder.Entity<Equipment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Code).IsRequired().HasMaxLength(64);
            entity.Property(e => e.Brand).IsRequired().HasMaxLength(128);
            entity.Property(e => e.Model).IsRequired().HasMaxLength(128);
            entity.Property(e => e.SerialNumber).IsRequired().HasMaxLength(128);
            entity.Property(e => e.Status).IsRequired().HasMaxLength(64);
            entity.HasIndex(e => e.Code).IsUnique();
            entity.HasIndex(e => e.SerialNumber).IsUnique();

            entity.HasOne(e => e.EquipmentType)
                  .WithMany(t => t.Equipments)
                  .HasForeignKey(e => e.EquipmentTypeId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // EquipmentAttribute
        modelBuilder.Entity<EquipmentAttribute>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Key).IsRequired().HasMaxLength(128);
            entity.Property(e => e.Value).IsRequired().HasMaxLength(256);

            entity.HasOne(e => e.Equipment)
                  .WithMany(eq => eq.Attributes)
                  .HasForeignKey(e => e.EquipmentId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Purchase — relación 1 a 1 con Equipment
        modelBuilder.Entity<Purchase>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Price).HasColumnType("decimal(18,2)");
            entity.Property(e => e.Supplier).HasMaxLength(256);
            entity.Property(e => e.InvoiceNumber).HasMaxLength(128);

            entity.HasOne(e => e.Equipment)
                  .WithOne(eq => eq.Purchase)
                  .HasForeignKey<Purchase>(e => e.EquipmentId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Seed de tipos de equipo
        modelBuilder.Entity<EquipmentType>().HasData(
            new EquipmentType { Id = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"), Name = "PC", Description = "Computadora de escritorio" },
            new EquipmentType { Id = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"), Name = "Laptop", Description = "Computadora portátil" },
            new EquipmentType { Id = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccccc"), Name = "Proyector", Description = "Proyector de imagen" },
            new EquipmentType { Id = Guid.Parse("dddddddd-dddd-dddd-dddd-dddddddddddd"), Name = "Impresora", Description = "Impresora" },
            new EquipmentType { Id = Guid.Parse("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"), Name = "Monitor", Description = "Monitor de pantalla" },
            new EquipmentType { Id = Guid.Parse("ffffffff-ffff-ffff-ffff-ffffffffffff"), Name = "Teclado", Description = "Teclado" },
            new EquipmentType { Id = Guid.Parse("11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa"), Name = "Mouse", Description = "Mouse" }
        );
    }
}