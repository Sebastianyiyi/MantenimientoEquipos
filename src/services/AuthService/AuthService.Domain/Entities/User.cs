namespace AuthService.Domain.Entities;

public class User
{
    public Guid Id { get; set; }
    public string MicrosoftId { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string FullName { get; set; } = null!;
    public bool IsActive { get; set; } = true;
    public string Role { get; set; } = "Laboratorista";
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }

    // Navegación
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}