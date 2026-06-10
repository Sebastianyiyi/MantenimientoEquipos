namespace AuthService.Application.DTOs;

public class MicrosoftUserDto
{
    public string MicrosoftId { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string FullName { get; set; } = null!;
}