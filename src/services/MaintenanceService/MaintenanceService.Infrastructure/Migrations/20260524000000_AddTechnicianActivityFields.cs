using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MaintenanceService.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTechnicianActivityFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // HU-09: campos de notas por técnico
            migrationBuilder.AddColumn<string>(
                name: "ActivityDescription",
                table: "TicketTechnicians",
                type: "nvarchar(2048)",
                maxLength: 2048,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Observations",
                table: "TicketTechnicians",
                type: "nvarchar(2048)",
                maxLength: 2048,
                nullable: true);

            // HU-12: campos de seguimiento de estado en TicketEquipment
            migrationBuilder.AddColumn<DateTime>(
                name: "LastStatusChangedAt",
                table: "TicketEquipments",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "LastStatusChangedByUserId",
                table: "TicketEquipments",
                type: "uniqueidentifier",
                nullable: true);

            // HU-12: tabla de historial de estados
            migrationBuilder.CreateTable(
                name: "StatusHistories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EntityType = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    EntityId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PreviousStatus = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    NewStatus = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Comment = table.Column<string>(type: "nvarchar(1024)", maxLength: 1024, nullable: true),
                    ChangedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ChangedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StatusHistories", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "StatusHistories");

            migrationBuilder.DropColumn(name: "LastStatusChangedAt", table: "TicketEquipments");
            migrationBuilder.DropColumn(name: "LastStatusChangedByUserId", table: "TicketEquipments");
            migrationBuilder.DropColumn(name: "ActivityDescription", table: "TicketTechnicians");
            migrationBuilder.DropColumn(name: "Observations", table: "TicketTechnicians");
        }
    }
}