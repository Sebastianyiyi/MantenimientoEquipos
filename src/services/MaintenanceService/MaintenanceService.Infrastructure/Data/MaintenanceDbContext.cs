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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Ticket
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

        // TicketEquipment
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

            // Un equipo no puede estar duplicado en el mismo ticket
            entity.HasIndex(e => new { e.TicketId, e.EquipmentId }).IsUnique();
        });

        // TicketTechnician
        modelBuilder.Entity<TicketTechnician>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasOne(e => e.TicketEquipment)
                  .WithMany(te => te.TicketTechnicians)
                  .HasForeignKey(e => e.TicketEquipmentId)
                  .OnDelete(DeleteBehavior.Cascade);

            // Un laboratorista no puede estar asignado dos veces al mismo equipo del ticket
            entity.HasIndex(e => new { e.TicketEquipmentId, e.TechnicianUserId }).IsUnique();
        });

        // Activity
        modelBuilder.Entity<Activity>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Description).IsRequired().HasMaxLength(1024);

            entity.HasOne(e => e.TicketEquipment)
                  .WithMany(te => te.Activities)
                  .HasForeignKey(e => e.TicketEquipmentId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Resource
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
    }
}