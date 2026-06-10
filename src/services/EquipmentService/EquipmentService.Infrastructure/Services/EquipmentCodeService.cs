using EquipmentService.Domain.Entities;
using EquipmentService.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace EquipmentService.Infrastructure.Services;

public class EquipmentCodeService
{
    private readonly EquipmentDbContext _context;

    public EquipmentCodeService(EquipmentDbContext context)
    {
        _context = context;
    }

    public async Task<string> GenerateNextCodeAsync(Guid equipmentTypeId, string typeName)
    {
        var counter = await GetOrCreateCounterAsync(equipmentTypeId, typeName);
        counter.LastNumber++;
        return $"{counter.Prefix}-{counter.LastNumber:D3}";
    }

    public async Task<List<string>> GenerateNextCodesAsync(Guid equipmentTypeId, string typeName, int quantity)
    {
        var counter = await GetOrCreateCounterAsync(equipmentTypeId, typeName);
        var codes = new List<string>();

        for (int i = 0; i < quantity; i++)
        {
            counter.LastNumber++;
            codes.Add($"{counter.Prefix}-{counter.LastNumber:D3}");
        }

        return codes;
    }

    private async Task<EquipmentCodeCounter> GetOrCreateCounterAsync(Guid equipmentTypeId, string typeName)
    {
        var localCounter = _context.EquipmentCodeCounters.Local
            .FirstOrDefault(c => c.EquipmentTypeId == equipmentTypeId);

        if (localCounter != null)
            return localCounter;

        var counter = await _context.EquipmentCodeCounters
            .FirstOrDefaultAsync(c => c.EquipmentTypeId == equipmentTypeId);

        if (counter != null)
            return counter;

        counter = new EquipmentCodeCounter
        {
            EquipmentTypeId = equipmentTypeId,
            Prefix = BuildPrefix(typeName),
            LastNumber = 0
        };

        _context.EquipmentCodeCounters.Add(counter);
        return counter;
    }

    private static string BuildPrefix(string typeName)
    {
        var cleaned = new string(typeName
            .Where(char.IsLetterOrDigit)
            .ToArray());

        if (string.IsNullOrWhiteSpace(cleaned))
            return "EQ";

        return cleaned.ToUpper();
    }
}