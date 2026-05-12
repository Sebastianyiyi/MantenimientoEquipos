using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UserService.Application.DTOs;
using UserService.Application.Interfaces;

namespace UserService.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    /// <summary>GET /api/users — Lista todos los usuarios activos (solo Administrador)</summary>
    [HttpGet]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> GetAll()
    {
        var users = await _userService.GetAllAsync();
        return Ok(users);
    }

    /// <summary>GET /api/users/{id} — Obtiene un usuario por ID</summary>
    [HttpGet("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> GetById(Guid id)
    {
        var user = await _userService.GetByIdAsync(id);
        return user == null ? NotFound() : Ok(user);
    }

    /// <summary>GET /api/users/by-microsoft-id/{microsoftId} — Llamado por AuthService</summary>
    [HttpGet("by-microsoft-id/{microsoftId}")]
    public async Task<IActionResult> GetByMicrosoftId(string microsoftId)
    {
        var user = await _userService.GetByMicrosoftIdAsync(microsoftId);
        return user == null ? NotFound() : Ok(user);
    }

    /// <summary>POST /api/users — Registrar o asegurar usuario (llamado por AuthService)</summary>
    [HttpPost]
    public async Task<IActionResult> CreateOrEnsure([FromBody] CreateUserDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.MicrosoftId) || string.IsNullOrWhiteSpace(dto.Email))
            return BadRequest("MicrosoftId y Email son requeridos");

        var user = await _userService.CreateOrEnsureAsync(dto);
        return Ok(user);
    }

    /// <summary>PUT /api/users/{id}/role — Cambiar rol del usuario (solo Administrador)</summary>
    [HttpPut("{id:guid}/role")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> UpdateRole(Guid id, [FromBody] UpdateUserRoleDto dto)
    {
        if (dto.Role != "Administrador" && dto.Role != "Laboratorista")
            return BadRequest("Rol inválido. Use 'Administrador' o 'Laboratorista'");

        var user = await _userService.UpdateRoleAsync(id, dto.Role);
        return user == null ? NotFound() : Ok(user);
    }

    /// <summary>PUT /api/users/{id}/toggle-active — Activar/desactivar usuario (solo Administrador)</summary>
    [HttpPut("{id:guid}/toggle-active")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> ToggleActive(Guid id)
    {
        var user = await _userService.ToggleActiveAsync(id);
        return user == null ? NotFound() : Ok(user);
    }
}
