using AuthService.Application.DTOs;
using AuthService.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AuthService.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpGet]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> GetAll()
    {
        var users = await _userService.GetAllAsync();
        return Ok(users);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var user = await _userService.GetByIdAsync(id);
        return user == null ? NotFound() : Ok(user);
    }

    [HttpGet("by-microsoft-id/{microsoftId}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetByMicrosoftId(string microsoftId)
    {
        var user = await _userService.GetByMicrosoftIdAsync(microsoftId);
        return user == null ? NotFound() : Ok(user);
    }

    [HttpGet("{id:guid}/laboratorista-validation")]
    [AllowAnonymous]
    public async Task<IActionResult> ValidateLaboratorista(Guid id)
    {
        var user = await _userService.GetByIdAsync(id);

        if (user == null)
            return NotFound(new { message = "Usuario no encontrado." });

        if (!user.IsActive)
            return BadRequest(new { message = "El usuario está inactivo." });

        if (user.Role != "Laboratorista")
            return BadRequest(new { message = "El usuario no tiene rol de laboratorista." });

        return Ok(new
        {
            user.Id,
            user.FullName,
            user.Email,
            user.Role,
            user.IsActive
        });
    }

    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> CreateOrEnsure([FromBody] CreateUserDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.MicrosoftId) || string.IsNullOrWhiteSpace(dto.Email))
            return BadRequest("MicrosoftId y Email son requeridos");

        var user = await _userService.CreateOrEnsureAsync(dto);
        return Ok(user);
    }

    [HttpPut("{id:guid}/role")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> UpdateRole(Guid id, [FromBody] UpdateUserRoleDto dto)
    {
        if (dto.Role != "Administrador" && dto.Role != "Laboratorista")
            return BadRequest("Rol inválido. Use 'Administrador' o 'Laboratorista'");

        var user = await _userService.UpdateRoleAsync(id, dto.Role);
        return user == null ? NotFound() : Ok(user);
    }

    [HttpPut("{id:guid}/toggle-active")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> ToggleActive(Guid id)
    {
        var user = await _userService.ToggleActiveAsync(id);
        return user == null ? NotFound() : Ok(user);
    }
}