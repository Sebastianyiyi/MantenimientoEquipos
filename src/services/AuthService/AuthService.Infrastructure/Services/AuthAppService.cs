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
    private readonly HttpClient _httpClient;

    public AuthAppService(AuthDbContext context, JwtService jwtService, IHttpClientFactory httpClientFactory)
    {
        _context = context;
        _jwtService = jwtService;
        _httpClient = httpClientFactory.CreateClient();
    }

    public async Task<AuthResponseDto?> AuthenticateWithMicrosoftAsync(string microsoftAccessToken)
    {
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

        var role = "Laboratorista";

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

    private async Task<MicrosoftUserDto?> GetMicrosoftUserAsync(string accessToken)
    {
        _httpClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", accessToken);

        var response = await _httpClient.GetAsync("https://graph.microsoft.com/v1.0/me");
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