using AuthService.Application.DTOs;
using AuthService.Application.Interfaces;
using AuthService.Domain.Entities;
using AuthService.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AuthService.Infrastructure.Services;

public class UserAppService : IUserService
{
    private readonly AuthDbContext _context;

    public UserAppService(AuthDbContext context)
    {
        _context = context;
    }

    public async Task<List<UserDto>> GetAllAsync()
    {
        return await _context.Users
            .OrderByDescending(u => u.CreatedAt)
            .Select(u => new UserDto
            {
                Id = u.Id,
                MicrosoftId = u.MicrosoftId,
                Email = u.Email,
                FullName = u.FullName,
                Role = u.Role,
                IsActive = u.IsActive,
                CreatedAt = u.CreatedAt,
                UpdatedAt = u.UpdatedAt,
                LastLoginAt = u.LastLoginAt
            })
            .ToListAsync();
    }

    public async Task<UserDto?> GetByIdAsync(Guid id)
    {
        return await _context.Users
            .Where(u => u.Id == id)
            .Select(u => new UserDto
            {
                Id = u.Id,
                MicrosoftId = u.MicrosoftId,
                Email = u.Email,
                FullName = u.FullName,
                Role = u.Role,
                IsActive = u.IsActive,
                CreatedAt = u.CreatedAt,
                UpdatedAt = u.UpdatedAt,
                LastLoginAt = u.LastLoginAt
            })
            .FirstOrDefaultAsync();
    }

    public async Task<UserDto?> GetByMicrosoftIdAsync(string microsoftId)
    {
        return await _context.Users
            .Where(u => u.MicrosoftId == microsoftId)
            .Select(u => new UserDto
            {
                Id = u.Id,
                MicrosoftId = u.MicrosoftId,
                Email = u.Email,
                FullName = u.FullName,
                Role = u.Role,
                IsActive = u.IsActive,
                CreatedAt = u.CreatedAt,
                UpdatedAt = u.UpdatedAt,
                LastLoginAt = u.LastLoginAt
            })
            .FirstOrDefaultAsync();
    }

    public async Task<UserDto> CreateOrEnsureAsync(CreateUserDto dto)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.MicrosoftId == dto.MicrosoftId);

        if (user == null)
        {
            user = new User
            {
                Id = Guid.NewGuid(),
                MicrosoftId = dto.MicrosoftId,
                Email = dto.Email,
                FullName = dto.FullName,
                Role = string.IsNullOrWhiteSpace(dto.Role) ? "Laboratorista" : dto.Role,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
        }
        else
        {
            user.Email = dto.Email;
            user.FullName = dto.FullName;
            user.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        return new UserDto
        {
            Id = user.Id,
            MicrosoftId = user.MicrosoftId,
            Email = user.Email,
            FullName = user.FullName,
            Role = user.Role,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt,
            LastLoginAt = user.LastLoginAt
        };
    }

    public async Task<UserDto?> UpdateRoleAsync(Guid id, string role)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user == null) return null;

        user.Role = role;
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new UserDto
        {
            Id = user.Id,
            MicrosoftId = user.MicrosoftId,
            Email = user.Email,
            FullName = user.FullName,
            Role = user.Role,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt,
            LastLoginAt = user.LastLoginAt
        };
    }

    public async Task<UserDto?> ToggleActiveAsync(Guid id)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user == null) return null;

        user.IsActive = !user.IsActive;
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new UserDto
        {
            Id = user.Id,
            MicrosoftId = user.MicrosoftId,
            Email = user.Email,
            FullName = user.FullName,
            Role = user.Role,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt,
            LastLoginAt = user.LastLoginAt
        };
    }
}