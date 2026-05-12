using UserService.Application.DTOs;

namespace UserService.Application.Interfaces;

public interface IUserService
{
    Task<UserDto?> GetByMicrosoftIdAsync(string microsoftId);
    Task<UserDto?> GetByIdAsync(Guid id);
    Task<IEnumerable<UserDto>> GetAllAsync();
    Task<UserDto> CreateOrEnsureAsync(CreateUserDto dto);
    Task<UserDto?> UpdateRoleAsync(Guid id, string role);
    Task<UserDto?> ToggleActiveAsync(Guid id);
}
