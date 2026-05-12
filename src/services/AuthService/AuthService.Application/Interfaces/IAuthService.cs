using AuthService.Application.DTOs;

namespace AuthService.Application.Interfaces;

public interface IAuthService
{
    Task<AuthResponseDto?> AuthenticateWithMicrosoftAsync(string microsoftAccessToken);
}