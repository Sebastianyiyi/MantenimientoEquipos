using Microsoft.EntityFrameworkCore;
using UserService.Application.DTOs;
using UserService.Application.Interfaces;
using UserService.Domain.Entities;
using UserService.Infrastructure.Data;

namespace UserService.Infrastructure.Services;

public class UserAppService : IUserService
{
    private readonly UserDbContext _context;

    private static readonly Guid AdminRoleId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid LaboratoristaRoleId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    public UserAppService(UserDbContext context)
    {
        _context = context;
    }

    public async Task<UserDto?> GetByMicrosoftIdAsync(string microsoftId)
    {
        var user = await _context.Users
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.MicrosoftId == microsoftId);

        return user == null ? null : ToDto(user);
    }

    public async Task<UserDto?> GetByIdAsync(Guid id)
    {
        var user = await _context.Users
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == id);

        return user == null ? null : ToDto(user);
    }

    public async Task<IEnumerable<UserDto>> GetAllAsync()
    {
        var users = await _context.Users
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .OrderBy(u => u.FullName)
            .ToListAsync();

        return users.Select(ToDto);
    }

    public async Task<UserDto> CreateOrEnsureAsync(CreateUserDto dto)
    {
        var existing = await _context.Users
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.MicrosoftId == dto.MicrosoftId);

        if (existing != null)
            return ToDto(existing);

        var roleId = dto.Role == "Administrador" ? AdminRoleId : LaboratoristaRoleId;

        var user = new User
        {
            Id = Guid.NewGuid(),
            MicrosoftId = dto.MicrosoftId,
            Email = dto.Email,
            FullName = dto.FullName,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        user.UserRoles.Add(new UserRole
        {
            UserId = user.Id,
            RoleId = roleId,
            AssignedAt = DateTime.UtcNow,
            AssignedByUserId = Guid.Empty
        });

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return (await GetByIdAsync(user.Id))!;
    }

    public async Task<UserDto?> UpdateRoleAsync(Guid id, string role)
    {
        var user = await _context.Users
            .Include(u => u.UserRoles)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user == null) return null;

        var roleId = role == "Administrador" ? AdminRoleId : LaboratoristaRoleId;

        _context.UserRoles.RemoveRange(user.UserRoles);
        user.UserRoles.Add(new UserRole
        {
            UserId = user.Id,
            RoleId = roleId,
            AssignedAt = DateTime.UtcNow,
            AssignedByUserId = Guid.Empty
        });

        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return await GetByIdAsync(id);
    }

    public async Task<UserDto?> ToggleActiveAsync(Guid id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return null;

        user.IsActive = !user.IsActive;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return await GetByIdAsync(id);
    }

    private static UserDto ToDto(User user)
    {
        var role = user.UserRoles.FirstOrDefault()?.Role?.Name ?? "Laboratorista";
        return new UserDto
        {
            Id = user.Id,
            MicrosoftId = user.MicrosoftId,
            Email = user.Email,
            FullName = user.FullName,
            Role = role,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt
        };
    }
}
