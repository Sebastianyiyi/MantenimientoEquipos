namespace AuthService.Domain.Entities;

public class UserSession
{
    public Guid Id { get; set; }
    public string MicrosoftId { get; set; } = null!;  // ID único de Microsoft
    public string Email { get; set; } = null!;
    public string FullName { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public bool IsActive { get; set; }

    // Navegación
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}