using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MaintenanceService.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTechnicianAndStatusFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_StatusHistories_EntityType_EntityId",
                table: "StatusHistories");

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

            migrationBuilder.AlterColumn<string>(
                name: "MaintenanceType",
                table: "Tickets",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(64)",
                oldMaxLength: 64);

            migrationBuilder.AlterColumn<string>(
                name: "EntityType",
                table: "StatusHistories",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(32)",
                oldMaxLength: 32);

            migrationBuilder.AlterColumn<string>(
                name: "Comment",
                table: "StatusHistories",
                type: "nvarchar(1024)",
                maxLength: 1024,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(512)",
                oldMaxLength: 512,
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ActivityDescription",
                table: "TicketTechnicians");

            migrationBuilder.DropColumn(
                name: "Observations",
                table: "TicketTechnicians");

            migrationBuilder.AlterColumn<string>(
                name: "MaintenanceType",
                table: "Tickets",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "EntityType",
                table: "StatusHistories",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(64)",
                oldMaxLength: 64);

            migrationBuilder.AlterColumn<string>(
                name: "Comment",
                table: "StatusHistories",
                type: "nvarchar(512)",
                maxLength: 512,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(1024)",
                oldMaxLength: 1024,
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_StatusHistories_EntityType_EntityId",
                table: "StatusHistories",
                columns: new[] { "EntityType", "EntityId" });
        }
    }
}
