namespace MaintenanceService.Domain.Entities;

/// <summary>
/// Registro permanente de un reemplazo de dispositivo.
/// Vincula el equipo saliente (dado de baja) con el equipo entrante (sustituto)
/// para auditoría y consulta histórica.
/// </summary>
public class DeviceReplacement
{
    public Guid   Id               { get; set; }
    public Guid   EquipoSalienteId { get; set; }   // equipo que se retira
    public string EquipoSalienteCodigo { get; set; } = null!;
    public Guid   EquipoEntranteId { get; set; }   // equipo sustituto
    public string EquipoEntranteCodigo { get; set; } = null!;
    public string Motivo           { get; set; } = null!;
    public Guid   AsignadoPorUserId { get; set; }
    public DateTime FechaReemplazo { get; set; }

    // Ticket generado en la Hoja de Vida del equipo entrante
    public Guid?  TicketId         { get; set; }
    public Ticket? Ticket          { get; set; }
}
