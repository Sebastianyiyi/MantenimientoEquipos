using System.Net.Http.Headers;
using System.Text.Json;
using AuthService.Application.DTOs;
using AuthService.Application.Interfaces;
using AuthService.Domain.Entities;
using AuthService.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace AuthService.Infrastructure.Services;

public class AuthAppService : IAuthService
{
    private readonly AuthDbContext _context;
    private readonly JwtService _jwtService;
    private readonly IHttpClientFactory _httpClientFactory;

    public AuthAppService(
        AuthDbContext context,
        JwtService jwtService,
        IHttpClientFactory httpClientFactory)
    {
        _context = context;
        _jwtService = jwtService;
        _httpClientFactory = httpClientFactory;
    }

    public async Task<AuthResponseDto?> AuthenticateWithMicrosoftAsync(string microsoftAccessToken)
    {
        var microsoftUser = await GetMicrosoftUserAsync(microsoftAccessToken);
        if (microsoftUser == null) return null;

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.MicrosoftId == microsoftUser.MicrosoftId);

        if (user == null)
        {
            user = new User
            {
                Id = Guid.NewGuid(),
                MicrosoftId = microsoftUser.MicrosoftId,
                Email = microsoftUser.Email,
                FullName = microsoftUser.FullName,
                Role = "Laboratorista",
                CreatedAt = DateTime.UtcNow,
                LastLoginAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.Users.Add(user);
        }
        else
        {
            if (!user.IsActive) return null;

            user.Email = microsoftUser.Email;
            user.FullName = microsoftUser.FullName;
            user.LastLoginAt = DateTime.UtcNow;
            user.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        var token = _jwtService.GenerateToken(
            user.Id.ToString(),
            user.Email,
            user.FullName,
            user.Role
        );

        return new AuthResponseDto
        {
            Id = user.Id,
            AccessToken = token,
            Email = user.Email,
            FullName = user.FullName,
            Role = user.Role,
            ExpiresIn = 480 * 60
        };
    }

    private async Task<MicrosoftUserDto?> GetMicrosoftUserAsync(string microsoftAccessToken)
    {
        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", microsoftAccessToken);

        var response = await client.GetAsync("https://graph.microsoft.com/v1.0/me");
        if (!response.IsSuccessStatusCode) return null;

        var content = await response.Content.ReadAsStringAsync();
        var json = JsonDocument.Parse(content).RootElement;

        return new MicrosoftUserDto
        {
            MicrosoftId = json.GetProperty("id").GetString()!,
            Email = json.GetProperty("mail").GetString()
                    ?? json.GetProperty("userPrincipalName").GetString()!,
            FullName = json.GetProperty("displayName").GetString()!
        };
    }
}