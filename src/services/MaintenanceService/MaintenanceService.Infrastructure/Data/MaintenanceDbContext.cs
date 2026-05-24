using MaintenanceService.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace MaintenanceService.Infrastructure.Data;

public class MaintenanceDbContext : DbContext
{
    public MaintenanceDbContext(DbContextOptions<MaintenanceDbContext> options) : base(options) { }

    public DbSet<Ticket> Tickets => Set<Ticket>();
    public DbSet<TicketEquipment> TicketEquipments => Set<TicketEquipment>();
    public DbSet<TicketTechnician> TicketTechnicians => Set<TicketTechnician>();
    public DbSet<Activity> Activities => Set<Activity>();
    public DbSet<Resource> Resources => Set<Resource>();
    public DbSet<StatusHistory> StatusHistories => Set<StatusHistory>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Ticket>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.TicketNumber).IsRequired().HasMaxLength(32);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(256);
            entity.Property(e => e.Description).HasMaxLength(1024);
            entity.Property(e => e.MaintenanceType).IsRequired().HasMaxLength(64);
            entity.Property(e => e.Status).IsRequired().HasMaxLength(64);
            entity.Property(e => e.Priority).IsRequired().HasMaxLength(32);
            entity.HasIndex(e => e.TicketNumber).IsUnique();
        });

        modelBuilder.Entity<TicketEquipment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Diagnosis).HasMaxLength(1024);
            entity.Property(e => e.Observation).HasMaxLength(1024);
            entity.Property(e => e.Status).IsRequired().HasMaxLength(64);

            entity.HasOne(e => e.Ticket)
                  .WithMany(t => t.TicketEquipments)
                  .HasForeignKey(e => e.TicketId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => new { e.TicketId, e.EquipmentId }).IsUnique();
        });

        modelBuilder.Entity<TicketTechnician>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasOne(e => e.TicketEquipment)
                  .WithMany(te => te.TicketTechnicians)
                  .HasForeignKey(e => e.TicketEquipmentId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => new { e.TicketEquipmentId, e.TechnicianUserId }).IsUnique();
        });

        modelBuilder.Entity<Activity>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Description).IsRequired().HasMaxLength(1024);

            entity.HasOne(e => e.TicketEquipment)
                  .WithMany(te => te.Activities)
                  .HasForeignKey(e => e.TicketEquipmentId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Resource>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(256);
            entity.Property(e => e.Description).HasMaxLength(512);

            entity.HasOne(e => e.TicketEquipment)
                  .WithMany(te => te.Resources)
                  .HasForeignKey(e => e.TicketEquipmentId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<StatusHistory>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.EntityType).IsRequired().HasMaxLength(32);
            entity.Property(e => e.PreviousStatus).IsRequired().HasMaxLength(64);
            entity.Property(e => e.NewStatus).IsRequired().HasMaxLength(64);
            entity.Property(e => e.Comment).HasMaxLength(512);
            entity.HasIndex(e => new { e.EntityType, e.EntityId });
        });
    }
}