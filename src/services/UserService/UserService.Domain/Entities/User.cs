namespace UserService.Domain.Entities;

public class User
{
    public Guid Id { get; set; }
    public string MicrosoftId { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string FullName { get; set; } = null!;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navegación
    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
}