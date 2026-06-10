using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MaintenanceService.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class HU10_CatalogosYRelaciones : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CatalogActivities",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1024)", maxLength: 1024, nullable: true),
                    Category = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CatalogActivities", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CatalogDiagnoses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1024)", maxLength: 1024, nullable: true),
                    Severity = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CatalogDiagnoses", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TicketEquipmentActivities",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TicketEquipmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CatalogActivityId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AddedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AddedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TicketEquipmentActivities", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TicketEquipmentActivities_CatalogActivities_CatalogActivityId",
                        column: x => x.CatalogActivityId,
                        principalTable: "CatalogActivities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TicketEquipmentActivities_TicketEquipments_TicketEquipmentId",
                        column: x => x.TicketEquipmentId,
                        principalTable: "TicketEquipments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TicketEquipmentDiagnoses",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TicketEquipmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CatalogDiagnosisId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AddedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AddedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TicketEquipmentDiagnoses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TicketEquipmentDiagnoses_CatalogDiagnoses_CatalogDiagnosisId",
                        column: x => x.CatalogDiagnosisId,
                        principalTable: "CatalogDiagnoses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TicketEquipmentDiagnoses_TicketEquipments_TicketEquipmentId",
                        column: x => x.TicketEquipmentId,
                        principalTable: "TicketEquipments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TicketEquipmentActivities_CatalogActivityId",
                table: "TicketEquipmentActivities",
                column: "CatalogActivityId");

            migrationBuilder.CreateIndex(
                name: "IX_TicketEquipmentActivities_TicketEquipmentId_CatalogActivityId",
                table: "TicketEquipmentActivities",
                columns: new[] { "TicketEquipmentId", "CatalogActivityId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TicketEquipmentDiagnoses_CatalogDiagnosisId",
                table: "TicketEquipmentDiagnoses",
                column: "CatalogDiagnosisId");

            migrationBuilder.CreateIndex(
                name: "IX_TicketEquipmentDiagnoses_TicketEquipmentId_CatalogDiagnosisId",
                table: "TicketEquipmentDiagnoses",
                columns: new[] { "TicketEquipmentId", "CatalogDiagnosisId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TicketEquipmentActivities");

            migrationBuilder.DropTable(
                name: "TicketEquipmentDiagnoses");

            migrationBuilder.DropTable(
                name: "CatalogActivities");

            migrationBuilder.DropTable(
                name: "CatalogDiagnoses");
        }
    }
}
