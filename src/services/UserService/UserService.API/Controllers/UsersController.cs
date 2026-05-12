using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UserService.Application.DTOs;
using UserService.Application.Interfaces;

namespace UserService.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]                          // ← Todo el controlador protegido por defecto
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    /// <summary>GET /api/users — Solo Administrador</summary>
    [HttpGet]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> GetAll()
    {
        var users = await _userService.GetAllAsync();
        return Ok(users);
    }

    /// <summary>GET /api/users/{id} — Cualquier usuario autenticado</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var user = await _userService.GetByIdAsync(id);
        return user == null ? NotFound() : Ok(user);
    }

    /// <summary>GET /api/users/by-microsoft-id/{microsoftId} — Llamado por AuthService (sin token)</summary>
    [HttpGet("by-microsoft-id/{microsoftId}")]
    [AllowAnonymous]                 // ← AuthService lo llama antes de tener JWT
    public async Task<IActionResult> GetByMicrosoftId(string microsoftId)
    {
        var user = await _userService.GetByMicrosoftIdAsync(microsoftId);
        return user == null ? NotFound() : Ok(user);
    }

    /// <summary>POST /api/users — Llamado por AuthService para crear usuario (sin token)</summary>
    [HttpPost]
    [AllowAnonymous]                 // ← AuthService lo llama antes de tener JWT
    public async Task<IActionResult> CreateOrEnsure([FromBody] CreateUserDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.MicrosoftId) || string.IsNullOrWhiteSpace(dto.Email))
            return BadRequest("MicrosoftId y Email son requeridos");

        var user = await _userService.CreateOrEnsureAsync(dto);
        return Ok(user);
    }

    /// <summary>PUT /api/users/{id}/role — Solo Administrador</summary>
    [HttpPut("{id:guid}/role")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> UpdateRole(Guid id, [FromBody] UpdateUserRoleDto dto)
    {
        if (dto.Role != "Administrador" && dto.Role != "Laboratorista")
            return BadRequest("Rol inválido. Use 'Administrador' o 'Laboratorista'");

        var user = await _userService.UpdateRoleAsync(id, dto.Role);
        return user == null ? NotFound() : Ok(user);
    }

    /// <summary>PUT /api/users/{id}/toggle-active — Solo Administrador</summary>
    [HttpPut("{id:guid}/toggle-active")]
    [Authorize(Roles = "Administrador")]
    public async Task<IActionResult> ToggleActive(Guid id)
    {
        var user = await _userService.ToggleActiveAsync(id);
        return user == null ? NotFound() : Ok(user);
    }
}