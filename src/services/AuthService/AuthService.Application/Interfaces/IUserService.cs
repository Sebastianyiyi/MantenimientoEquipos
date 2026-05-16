using AuthService.Application.DTOs;

namespace AuthService.Application.Interfaces;

public interface IUserService
{
    Task<List<UserDto>> GetAllAsync();
    Task<UserDto?> GetByIdAsync(Guid id);
    Task<UserDto?> GetByMicrosoftIdAsync(string microsoftId);
    Task<UserDto> CreateOrEnsureAsync(CreateUserDto dto);
    Task<UserDto?> UpdateRoleAsync(Guid id, string role);
    Task<UserDto?> ToggleActiveAsync(Guid id);
}