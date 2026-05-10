namespace UserService.Domain.Entities;

public class UserRole
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public Guid RoleId { get; set; }
    public Role Role { get; set; } = null!;

    public DateTime AssignedAt { get; set; }
    public Guid AssignedByUserId { get; set; }   // Quién asignó el rol (siempre un admin)
}