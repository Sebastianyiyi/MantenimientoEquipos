using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using AuthService.Application.DTOs;
using AuthService.Application.Interfaces;
using AuthService.Domain.Entities;
using AuthService.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace AuthService.Infrastructure.Services;

public class AuthAppService : IAuthService
{
    private readonly AuthDbContext _context;
    private readonly JwtService _jwtService;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _config;

    public AuthAppService(AuthDbContext context, JwtService jwtService, IHttpClientFactory httpClientFactory, IConfiguration config)
    {
        _context = context;
        _jwtService = jwtService;
        _httpClientFactory = httpClientFactory;
        _config = config;
    }

    public async Task<AuthResponseDto?> AuthenticateWithMicrosoftAsync(string microsoftAccessToken)
    {
        // Cliente exclusivo para Microsoft Graph (con el token de Microsoft)
        var microsoftUser = await GetMicrosoftUserAsync(microsoftAccessToken);
        if (microsoftUser == null) return null;

        var session = await _context.UserSessions
            .FirstOrDefaultAsync(u => u.MicrosoftId == microsoftUser.MicrosoftId);

        if (session == null)
        {
            session = new UserSession
            {
                Id = Guid.NewGuid(),
                MicrosoftId = microsoftUser.MicrosoftId,
                Email = microsoftUser.Email,
                FullName = microsoftUser.FullName,
                CreatedAt = DateTime.UtcNow,
                LastLoginAt = DateTime.UtcNow,
                IsActive = true
            };
            _context.UserSessions.Add(session);
        }
        else
        {
            session.LastLoginAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        // Cliente separado y limpio para UserService (sin headers de Microsoft)
        var role = await GetUserRoleAsync(microsoftUser.MicrosoftId, microsoftUser.Email, microsoftUser.FullName);

        var token = _jwtService.GenerateToken(
            session.Id.ToString(),
            session.Email,
            session.FullName,
            role
        );

        return new AuthResponseDto
        {
            AccessToken = token,
            Email = session.Email,
            FullName = session.FullName,
            Role = role,
            ExpiresIn = 480 * 60
        };
    }

    private async Task<string> GetUserRoleAsync(string microsoftId, string email, string fullName)
    {
        try
        {
            var userServiceUrl = _config["Services:UserServiceUrl"] ?? "http://localhost:5001";

            // Cliente limpio sin ningún header de Authorization
            var client = _httpClientFactory.CreateClient();

            var getResponse = await client.GetAsync(
                $"{userServiceUrl}/api/users/by-microsoft-id/{microsoftId}");

            if (getResponse.IsSuccessStatusCode)
            {
                var content = await getResponse.Content.ReadAsStringAsync();
                var json = JsonDocument.Parse(content).RootElement;
                if (json.TryGetProperty("role", out var roleProp))
                    return roleProp.GetString() ?? "Laboratorista";
            }

            // Usuario no existe → crearlo con rol Laboratorista por defecto
            var payload = JsonSerializer.Serialize(new
            {
                microsoftId,
                email,
                fullName,
                role = "Laboratorista"
            });

            var postResponse = await client.PostAsync(
                $"{userServiceUrl}/api/users",
                new StringContent(payload, Encoding.UTF8, "application/json"));

            if (postResponse.IsSuccessStatusCode)
            {
                var content = await postResponse.Content.ReadAsStringAsync();
                var json = JsonDocument.Parse(content).RootElement;
                if (json.TryGetProperty("role", out var roleProp))
                    return roleProp.GetString() ?? "Laboratorista";
            }

            return "Laboratorista";
        }
        catch
        {
            return "Laboratorista";
        }
    }

    private async Task<MicrosoftUserDto?> GetMicrosoftUserAsync(string microsoftAccessToken)
    {
        // Cliente exclusivo para Graph, descartado después de usarse
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