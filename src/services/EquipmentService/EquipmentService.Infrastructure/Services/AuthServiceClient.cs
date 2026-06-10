using System.Net;
using System.Net.Http.Json;

namespace EquipmentService.Infrastructure.Services;

public class AuthServiceClient
{
    private readonly HttpClient _httpClient;

    public AuthServiceClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<LaboratoristaValidationResult?> ValidateLaboratoristaAsync(Guid userId)
    {
        var response = await _httpClient.GetAsync($"/api/users/{userId}/laboratorista-validation");

        if (response.StatusCode == HttpStatusCode.NotFound)
            return null;

        if (!response.IsSuccessStatusCode)
        {
            var errorText = await response.Content.ReadAsStringAsync();

            if (string.IsNullOrWhiteSpace(errorText))
                throw new Exception("No se pudo validar el laboratorista en AuthService.");

            throw new Exception(errorText);
        }

        return await response.Content.ReadFromJsonAsync<LaboratoristaValidationResult>();
    }
}

public class LaboratoristaValidationResult
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string Role { get; set; } = null!;
    public bool IsActive { get; set; }
}