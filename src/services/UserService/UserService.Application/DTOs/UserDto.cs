namespace UserService.Application.DTOs;

public class UserDto
{
    public Guid Id { get; set; }
    public string MicrosoftId { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string FullName { get; set; } = null!;
    public string Role { get; set; } = null!;
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateUserDto
{
    public string MicrosoftId { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string FullName { get; set; } = null!;
    public string Role { get; set; } = "Laboratorista";
}

public class UpdateUserRoleDto
{
    public string Role { get; set; } = null!;
}
