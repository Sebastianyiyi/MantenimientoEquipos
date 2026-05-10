using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LocationService.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Laboratories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    Building = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    Floor = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: true),
                    Capacity = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Laboratories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "EquipmentLocations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    EquipmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AssignedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    RemovedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsCurrent = table.Column<bool>(type: "bit", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: true),
                    LaboratoryId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EquipmentLocations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EquipmentLocations_Laboratories_LaboratoryId",
                        column: x => x.LaboratoryId,
                        principalTable: "Laboratories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EquipmentLocations_EquipmentId_IsCurrent",
                table: "EquipmentLocations",
                columns: new[] { "EquipmentId", "IsCurrent" });

            migrationBuilder.CreateIndex(
                name: "IX_EquipmentLocations_LaboratoryId",
                table: "EquipmentLocations",
                column: "LaboratoryId");

            migrationBuilder.CreateIndex(
                name: "IX_Laboratories_Name",
                table: "Laboratories",
                column: "Name",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EquipmentLocations");

            migrationBuilder.DropTable(
                name: "Laboratories");
        }
    }
}
