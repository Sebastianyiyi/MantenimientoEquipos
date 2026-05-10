using AuthService.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace AuthService.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    /// <summary>
    /// Recibe el token de Microsoft y retorna un JWT del sistema
    /// </summary>
    [HttpPost("microsoft")]
    public async Task<IActionResult> LoginWithMicrosoft([FromBody] MicrosoftLoginRequest request)
    {
        if (string.IsNullOrEmpty(request.AccessToken))
            return BadRequest("Token de Microsoft requerido");

        var result = await _authService.AuthenticateWithMicrosoftAsync(request.AccessToken);

        if (result == null)
            return Unauthorized("Token de Microsoft inválido o usuario no autorizado");

        return Ok(result);
    }
}

public record MicrosoftLoginRequest(string AccessToken);