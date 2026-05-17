namespace AuthService.Application.DTOs;

public class CreateUserDto
{
    public string MicrosoftId { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string FullName { get; set; } = null!;
    public string Role { get; set; } = "Laboratorista";
}