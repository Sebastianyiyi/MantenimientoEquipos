using System.Net;
using System.Net.Http.Json;

namespace LocationService.Infrastructure.Http;

public class EquipmentServiceClient
{
    private readonly HttpClient _httpClient;

    public EquipmentServiceClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<EquipmentSummaryDto?> GetEquipmentByIdAsync(Guid equipmentId, CancellationToken cancellationToken = default)
    {
        var response = await _httpClient.GetAsync($"api/equipments/{equipmentId}", cancellationToken);

        if (response.StatusCode == HttpStatusCode.NotFound)
            return null;

        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<EquipmentResponseDto>(cancellationToken: cancellationToken);

        if (result == null)
            return null;

        return new EquipmentSummaryDto
        {
            Id = result.Id,
            EquipmentTypeId = result.EquipmentType.Id,
            EquipmentTypeName = result.EquipmentType.Name
        };
    }
}

public class EquipmentSummaryDto
{
    public Guid Id { get; set; }
    public Guid EquipmentTypeId { get; set; }
    public string? EquipmentTypeName { get; set; }
}

public class EquipmentResponseDto
{
    public Guid Id { get; set; }
    public EquipmentTypeNestedDto EquipmentType { get; set; } = null!;
}

public class EquipmentTypeNestedDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
}