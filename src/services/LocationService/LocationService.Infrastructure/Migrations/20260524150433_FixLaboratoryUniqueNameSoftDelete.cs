using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LocationService.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixLaboratoryUniqueNameSoftDelete : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Laboratories_Name",
                table: "Laboratories");

            migrationBuilder.CreateIndex(
                name: "IX_Laboratories_Name",
                table: "Laboratories",
                column: "Name",
                unique: true,
                filter: "[IsActive] = 1");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Laboratories_Name",
                table: "Laboratories");

            migrationBuilder.CreateIndex(
                name: "IX_Laboratories_Name",
                table: "Laboratories",
                column: "Name",
                unique: true);
        }
    }
}
