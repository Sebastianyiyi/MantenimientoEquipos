namespace UserService.Domain.Entities;

public class Role
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;        // "Administrador" | "Laboratorista"
    public string? Description { get; set; }

    // Navegación
    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
}