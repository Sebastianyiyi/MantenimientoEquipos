using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LocationService.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddLaboratoryCapacityAndEquipmentTypeToLocation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_EquipmentLocations_LaboratoryId",
                table: "EquipmentLocations");

            migrationBuilder.AddColumn<Guid>(
                name: "EquipmentTypeId",
                table: "EquipmentLocations",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<string>(
                name: "EquipmentTypeName",
                table: "EquipmentLocations",
                type: "nvarchar(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "LaboratoryCapacities",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LaboratoryId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EquipmentTypeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EquipmentTypeName = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    MaxCapacity = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LaboratoryCapacities", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LaboratoryCapacities_Laboratories_LaboratoryId",
                        column: x => x.LaboratoryId,
                        principalTable: "Laboratories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EquipmentLocations_EquipmentId",
                table: "EquipmentLocations",
                column: "EquipmentId",
                unique: true,
                filter: "[IsCurrent] = 1");

            migrationBuilder.CreateIndex(
                name: "IX_EquipmentLocations_EquipmentId_AssignedAt",
                table: "EquipmentLocations",
                columns: new[] { "EquipmentId", "AssignedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_EquipmentLocations_LaboratoryId_EquipmentTypeId_IsCurrent",
                table: "EquipmentLocations",
                columns: new[] { "LaboratoryId", "EquipmentTypeId", "IsCurrent" });

            migrationBuilder.CreateIndex(
                name: "IX_LaboratoryCapacities_EquipmentTypeId",
                table: "LaboratoryCapacities",
                column: "EquipmentTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_LaboratoryCapacities_LaboratoryId",
                table: "LaboratoryCapacities",
                column: "LaboratoryId");

            migrationBuilder.CreateIndex(
                name: "IX_LaboratoryCapacities_LaboratoryId_EquipmentTypeId",
                table: "LaboratoryCapacities",
                columns: new[] { "LaboratoryId", "EquipmentTypeId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LaboratoryCapacities");

            migrationBuilder.DropIndex(
                name: "IX_EquipmentLocations_EquipmentId",
                table: "EquipmentLocations");

            migrationBuilder.DropIndex(
                name: "IX_EquipmentLocations_EquipmentId_AssignedAt",
                table: "EquipmentLocations");

            migrationBuilder.DropIndex(
                name: "IX_EquipmentLocations_LaboratoryId_EquipmentTypeId_IsCurrent",
                table: "EquipmentLocations");

            migrationBuilder.DropColumn(
                name: "EquipmentTypeId",
                table: "EquipmentLocations");

            migrationBuilder.DropColumn(
                name: "EquipmentTypeName",
                table: "EquipmentLocations");

            migrationBuilder.CreateIndex(
                name: "IX_EquipmentLocations_LaboratoryId",
                table: "EquipmentLocations",
                column: "LaboratoryId");
        }
    }
}
