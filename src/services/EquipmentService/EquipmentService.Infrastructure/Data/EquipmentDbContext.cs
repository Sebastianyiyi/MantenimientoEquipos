using EquipmentService.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace EquipmentService.Infrastructure.Data;

public class EquipmentDbContext : DbContext
{
    public EquipmentDbContext(DbContextOptions<EquipmentDbContext> options) : base(options) { }

    public DbSet<Equipment> Equipments => Set<Equipment>();
    public DbSet<EquipmentType> EquipmentTypes => Set<EquipmentType>();
    public DbSet<EquipmentCodeCounter> EquipmentCodeCounters => Set<EquipmentCodeCounter>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<EquipmentType>(entity =>
        {
            entity.ToTable("EquipmentTypes");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id)
                .ValueGeneratedNever();

            entity.Property(e => e.Name)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(e => e.Description)
                .HasMaxLength(255);
        });

        modelBuilder.Entity<Equipment>(entity =>
        {
            entity.ToTable("Equipments");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id)
                .HasDefaultValueSql("NEWSEQUENTIALID()");

            entity.Property(e => e.Code)
                .IsRequired()
                .HasMaxLength(50);

            entity.Property(e => e.AssetTag)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(e => e.Brand)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(e => e.Model)
                .IsRequired()
                .HasMaxLength(150);

            entity.Property(e => e.SerialNumber)
                .IsRequired()
                .HasMaxLength(150);

            entity.Property(e => e.Status)
                .IsRequired()
                .HasMaxLength(50)
                .HasDefaultValue("Operativo");

            entity.Property(e => e.IsActive)
                .IsRequired()
                .HasDefaultValue(true);

            entity.Property(e => e.PurchaseDate)
                .IsRequired();

            entity.Property(e => e.SpecificationsJson)
                .IsRequired()
                .HasColumnType("nvarchar(max)")
                .HasDefaultValue("{}");

            entity.Property(e => e.ImportSource)
                .IsRequired()
                .HasMaxLength(255)
                .HasDefaultValue("Manual");

            entity.Property(e => e.CreatedAt)
                .IsRequired()
                .HasDefaultValueSql("SYSUTCDATETIME()");

            entity.Property(e => e.UpdatedAt);

            entity.HasIndex(e => e.Code).IsUnique();
            entity.HasIndex(e => e.AssetTag).IsUnique();
            entity.HasIndex(e => e.SerialNumber).IsUnique();

            entity.HasOne(e => e.EquipmentType)
                .WithMany(t => t.Equipments)
                .HasForeignKey(e => e.EquipmentTypeId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.ToTable(t =>
            {
                t.HasCheckConstraint(
                    "CK_Equipments_SpecificationsJson",
                    "ISJSON([SpecificationsJson]) = 1");
            });

            entity.Property(e => e.LaboratoristaUserId);

            entity.Property(e => e.LaboratoristaNombre)
                .HasMaxLength(150);
        });

        modelBuilder.Entity<EquipmentCodeCounter>(entity =>
        {
            entity.ToTable("EquipmentCodeCounters");

            entity.HasKey(e => e.EquipmentTypeId);

            entity.Property(e => e.Prefix)
                .IsRequired()
                .HasMaxLength(30);

            entity.Property(e => e.LastNumber)
                .IsRequired()
                .HasDefaultValue(0);

            entity.HasOne(e => e.EquipmentType)
                .WithOne()
                .HasForeignKey<EquipmentCodeCounter>(e => e.EquipmentTypeId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}