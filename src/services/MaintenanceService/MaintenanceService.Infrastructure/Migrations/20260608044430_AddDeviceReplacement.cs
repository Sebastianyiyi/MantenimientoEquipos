using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MaintenanceService.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDeviceReplacement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DeviceReplacements",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EquipoSalienteId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EquipoSalienteCodigo = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    EquipoEntranteId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EquipoEntranteCodigo = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Motivo = table.Column<string>(type: "nvarchar(1024)", maxLength: 1024, nullable: false),
                    AsignadoPorUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FechaReemplazo = table.Column<DateTime>(type: "datetime2", nullable: false),
                    TicketId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeviceReplacements", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DeviceReplacements_Tickets_TicketId",
                        column: x => x.TicketId,
                        principalTable: "Tickets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DeviceReplacements_EquipoEntranteId",
                table: "DeviceReplacements",
                column: "EquipoEntranteId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DeviceReplacements_TicketId",
                table: "DeviceReplacements",
                column: "TicketId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DeviceReplacements");
        }
    }
}
