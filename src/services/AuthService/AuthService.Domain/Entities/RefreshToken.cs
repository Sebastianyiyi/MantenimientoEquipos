namespace AuthService.Domain.Entities;

public class RefreshToken
{
    public Guid Id { get; set; }
    public string Token { get; set; } = null!;
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsRevoked { get; set; }

    // Relación con UserSession
    public Guid UserSessionId { get; set; }
    public UserSession UserSession { get; set; } = null!;
}