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

    // HU-10: catálogos de actividades y diagnósticos
    public DbSet<CatalogActivity> CatalogActivities => Set<CatalogActivity>();
    public DbSet<CatalogDiagnosis> CatalogDiagnoses => Set<CatalogDiagnosis>();
    public DbSet<TicketEquipmentActivity> TicketEquipmentActivities => Set<TicketEquipmentActivity>();
    public DbSet<TicketEquipmentDiagnosis> TicketEquipmentDiagnoses => Set<TicketEquipmentDiagnosis>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Ticket
        modelBuilder.Entity<Ticket>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.TicketNumber).IsRequired().HasMaxLength(32);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(256);
            entity.Property(e => e.Description).HasMaxLength(1024);
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

            entity.HasIndex(e => new { e.TicketId, e.EquipmentId }).IsUnique();
        });

        // StatusHistory
        modelBuilder.Entity<StatusHistory>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.EntityType).IsRequired().HasMaxLength(64);
            entity.Property(e => e.PreviousStatus).IsRequired().HasMaxLength(64);
            entity.Property(e => e.NewStatus).IsRequired().HasMaxLength(64);
            entity.Property(e => e.Comment).HasMaxLength(1024);
        });

        // TicketTechnician
        modelBuilder.Entity<TicketTechnician>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ActivityDescription).HasMaxLength(2048);
            entity.Property(e => e.Observations).HasMaxLength(2048);

            entity.HasOne(e => e.TicketEquipment)
                  .WithMany(te => te.TicketTechnicians)
                  .HasForeignKey(e => e.TicketEquipmentId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => new { e.TicketEquipmentId, e.TechnicianUserId }).IsUnique();
        });

        // Activity (libre, legado)
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

        // ── HU-10: Catálogo de Actividades ──────────────────────────────────────
        modelBuilder.Entity<CatalogActivity>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(256);
            entity.Property(e => e.Description).HasMaxLength(1024);
            entity.Property(e => e.Category).IsRequired().HasMaxLength(64);
        });

        // ── HU-10: Catálogo de Diagnósticos ─────────────────────────────────────
        modelBuilder.Entity<CatalogDiagnosis>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(256);
            entity.Property(e => e.Description).HasMaxLength(1024);
            entity.Property(e => e.Severity).IsRequired().HasMaxLength(32);
        });

        // ── HU-10: TicketEquipmentActivity (N:M) ────────────────────────────────
        modelBuilder.Entity<TicketEquipmentActivity>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasOne(e => e.TicketEquipment)
                  .WithMany(te => te.TicketEquipmentActivities)
                  .HasForeignKey(e => e.TicketEquipmentId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.CatalogActivity)
                  .WithMany(ca => ca.TicketEquipmentActivities)
                  .HasForeignKey(e => e.CatalogActivityId)
                  .OnDelete(DeleteBehavior.Restrict);

            // Una actividad no se puede vincular dos veces al mismo equipo del ticket
            entity.HasIndex(e => new { e.TicketEquipmentId, e.CatalogActivityId }).IsUnique();
        });

        // ── HU-10: TicketEquipmentDiagnosis (N:M) ───────────────────────────────
        modelBuilder.Entity<TicketEquipmentDiagnosis>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasOne(e => e.TicketEquipment)
                  .WithMany(te => te.TicketEquipmentDiagnoses)
                  .HasForeignKey(e => e.TicketEquipmentId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.CatalogDiagnosis)
                  .WithMany(cd => cd.TicketEquipmentDiagnoses)
                  .HasForeignKey(e => e.CatalogDiagnosisId)
                  .OnDelete(DeleteBehavior.Restrict);

            // Un diagnóstico no se puede vincular dos veces al mismo equipo del ticket
            entity.HasIndex(e => new { e.TicketEquipmentId, e.CatalogDiagnosisId }).IsUnique();
        });
    }
}
