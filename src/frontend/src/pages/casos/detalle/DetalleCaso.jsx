import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { maintenanceApi, equipmentApi, userApi } from '../../../services/api'
import TicketTechnicians from '../../mantenimiento/TicketTechnicians'
import TicketResources from '../../mantenimiento/TicketResources'
import TicketActivitiesDiagnoses from '../../mantenimiento/TicketActivitiesDiagnoses'
import '../../FormPage.css'

const STATUS_COLORS = {
  Pendiente:    { bg: '#fef9c3', color: '#854d0e' },
  'En Proceso': { bg: '#dbeafe', color: '#1e40af' },
  Terminado:    { bg: '#dcfce7', color: '#166534' },
}

const TYPE_COLORS = {
  Correctivo: { bg: '#fee2e2', color: '#991b1b' },
  Preventivo: { bg: '#e0f2fe', color: '#075985' },
  Adaptativo: { bg: '#f3e8ff', color: '#6b21a8' },
}

const PRIORITY_COLORS = {
  Alta:  { bg: '#fee2e2', color: '#991b1b' },
  Media: { bg: '#fef9c3', color: '#854d0e' },
  Baja:  { bg: '#f0fdf4', color: '#166534' },
}

const nextStatus = {
  'Pendiente':  'En Proceso',
  'En Proceso': 'Terminado',
}

function Badge({ colors, children }) {
  return (
    <span style={{
      display: 'inline-block', padding: '0.2rem 0.65rem',
      borderRadius: 6, fontSize: '0.82rem', fontWeight: 600,
      background: colors?.bg ?? '#f3f4f6', color: colors?.color ?? '#374151',
    }}>
      {children}
    </span>
  )
}

function InfoItem({ label, children }) {
  return (
    <div className="fp-info-item">
      <span className="fp-info-label">{label}</span>
      <div className="fp-info-value">{children}</div>
    </div>
  )
}

export default function DetalleCaso() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [ticket, setTicket]           = useState(null)
  const [equipments, setEquipments]   = useState([])
  const [usuarios, setUsuarios]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [changingStatus, setChangingStatus] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory]         = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // ── Dar de baja ──
  const [bajaEquipoId, setBajaEquipoId]   = useState(null)
  const [bajaMotivo, setBajaMotivo]       = useState('')
  const [procesandoBaja, setProcesandoBaja] = useState(false)
  const [showBajaConfirm, setShowBajaConfirm] = useState(false)
  const [pendingBajaEquipmentId, setPendingBajaEquipmentId] = useState(null)
  const [bajaValidating, setBajaValidating] = useState(false)
  const [bajaBlockReason, setBajaBlockReason] = useState(null) // null | string[]

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const stripped = String(dateStr)
      .replace(/Z$/i, '')
      .replace(/[+-]\d{2}:\d{2}$/, '')
    const d = new Date(stripped)
    if (isNaN(d)) return '-'
    return d.toLocaleString('es-EC', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const getEquipmentLabel = useCallback((equipmentId) => {
    if (!equipmentId) return '(sin equipo)'
    const eq = equipments.find(e => (e.id ?? e.Id) === equipmentId)
    if (!eq) return String(equipmentId).slice(0, 8) + '…'
    const tag   = eq.assetTag ?? eq.AssetTag ?? ''
    const brand = eq.brand    ?? eq.Brand    ?? ''
    const model = eq.model    ?? eq.Model    ?? ''
    return `${tag} – ${brand} ${model}`.trim()
  }, [equipments])

  const getUserName = useCallback((userId) => {
    if (!userId || userId === '00000000-0000-0000-0000-000000000000') return 'Desconocido'
    if (user?.id && userId === user.id) return user.fullName ?? user.FullName ?? 'Yo'
    const found = usuarios.find(u => u.id === userId)
    return found ? found.fullName : `Usuario (${userId.substring(0, 8)}...)`
  }, [user, usuarios])

  const loadTicket = useCallback(async () => {
    try {
      const res = await maintenanceApi.get(`/tickets/${id}`)
      setTicket(res.data)
    } catch {
      setError('No se pudo cargar el detalle del caso.')
    }
  }, [id])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        const [ticketRes, eqRes] = await Promise.allSettled([
          maintenanceApi.get(`/tickets/${id}`),
          equipmentApi.get('/equipments'),
        ])
        if (ticketRes.status !== 'fulfilled') throw new Error('Caso no encontrado')
        setTicket(ticketRes.value.data)
        if (eqRes.status === 'fulfilled') setEquipments(eqRes.value.data)

        try {
          const usersRes = await userApi.get('/users')
          setUsuarios(usersRes.data)
        } catch {
          // silencioso — no todos los roles pueden ver usuarios
        }
      } catch (e) {
        setError(e.message ?? 'Error al cargar el caso.')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [id])

  const loadHistory = async () => {
    try {
      setLoadingHistory(true)
      const res = await maintenanceApi.get(`/tickets/${id}/status-history`)
      setHistory(res.data)
    } catch {
      setHistory([])
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleEquipmentStatusChange = async (teId, newSt) => {
    setChangingStatus(true)
    try {
      await maintenanceApi.put(`/ticket-equipments/${teId}/status`, {
        newStatus: newSt,
        comment: '',
        changedByUserId: user?.id,
      })
      // Si el equipo pasó a "En Proceso" y el caso aún está "Pendiente", avanzar el caso también
      if (newSt === 'En Proceso' && ticket?.status === 'Pendiente') {
        try {
          await maintenanceApi.put(`/tickets/${id}/status`, {
            newStatus: 'En Proceso',
            comment: 'Avanzado automáticamente al marcar un equipo En Proceso.',
            changedByUserId: user?.id,
          })
        } catch {
          // si falla el auto-avance del ticket, no bloquear — el equipo ya cambió
        }
      }
      await loadTicket()
      if (showHistory) await loadHistory()
    } catch (err) {
      alert(err.response?.data ?? 'Error al cambiar el estado del equipo.')
    } finally {
      setChangingStatus(false)
    }
  }

  const handleTicketStatusChange = async (newSt) => {
    setChangingStatus(true)
    try {
      await maintenanceApi.put(`/tickets/${id}/status`, {
        newStatus: newSt,
        comment: '',
        changedByUserId: user?.id,
      })
      await loadTicket()
      if (showHistory) await loadHistory()
    } catch (err) {
      alert(err.response?.data ?? 'Error al cambiar el estado del caso.')
    } finally {
      setChangingStatus(false)
    }
  }

  const handleDarDeBaja = async (teId, equipmentId) => {
    if (!bajaMotivo.trim()) return

    setBajaValidating(true)
    setBajaBlockReason(null)

    try {
      // Consultar en paralelo: técnicos, actividades, diagnósticos y recursos del ticketEquipment
      const [techRes, actRes, diagRes, resRes] = await Promise.all([
        maintenanceApi.get(`/ticket-equipments/${teId}/technicians`),
        maintenanceApi.get(`/ticket-equipments/${teId}/activities`),
        maintenanceApi.get(`/ticket-equipments/${teId}/diagnoses`),
        maintenanceApi.get(`/ticket-equipments/${teId}/resources`),
      ])

      const faltantes = []
      if (!techRes.data?.length)
        faltantes.push('Técnicos Asignados: debe asignar al menos un técnico')
      if (!actRes.data?.length && !diagRes.data?.length)
        faltantes.push('Actividades y Diagnósticos: debe registrar al menos una actividad o diagnóstico')
      // Recursos son opcionales — comentar la línea siguiente si se vuelven obligatorios
      // if (!resRes.data?.length) faltantes.push('Recursos Utilizados: debe registrar al menos un recurso')

      if (faltantes.length > 0) {
        setBajaBlockReason(faltantes)
        setBajaValidating(false)
        return
      }
    } catch {
      setBajaValidating(false)
      alert('No se pudo validar los campos requeridos. Intente de nuevo.')
      return
    }

    setBajaValidating(false)
    setPendingBajaEquipmentId(equipmentId)
    setShowBajaConfirm(true)
  }

  const confirmarBajaDefinitiva = async () => {
    const equipmentId = pendingBajaEquipmentId
    setShowBajaConfirm(false)
    setProcesandoBaja(true)
    try {
      await equipmentApi.patch(`/equipments/${equipmentId}/decommission`, {
        motivo: bajaMotivo.trim(),
        cambiadoPorUserId: user?.id ?? null,
      })
      setBajaEquipoId(null)
      setBajaMotivo('')
      setBajaBlockReason(null)
      setPendingBajaEquipmentId(null)
      await loadTicket()
    } catch (err) {
      alert(err.response?.data?.message ?? 'Error al dar de baja el equipo.')
    } finally {
      setProcesandoBaja(false)
    }
  }

  if (loading) {
    return (
      <div className="fp-page">
        <div className="fp-empty">Cargando detalle del caso…</div>
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="fp-page">
        <div className="fp-alert error"><span>⚠️</span> {error || 'Caso no encontrado.'}</div>
        <button className="fp-back-btn" onClick={() => navigate('/casos')}>← Volver a Casos</button>
      </div>
    )
  }

  return (
    <div className="fp-page">

      {/* ── Cabecera ── */}
      <div className="fp-header">
        <button className="fp-back-btn" onClick={() => navigate('/casos')}>
          ← Volver a Casos
        </button>
        <div className="fp-heading">
          <h1 className="fp-title">Detalle del Caso</h1>
          <p className="fp-subtitle" style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary)', fontSize: '1rem' }}>
            {ticket.ticketNumber}
          </p>
        </div>
        {ticket.status !== 'Terminado' && (
          <button
            className="fp-btn btn-secondary"
            style={{ marginLeft: 'auto' }}
            onClick={() => navigate(`/casos/${id}/editar`)}
          >
            ✏️ Editar
          </button>
        )}
      </div>

      {/* ── Información general ── */}
      <div className="fp-card">
        <div className="fp-card-header">
          <span className="fp-card-icon">📋</span>
          <span className="fp-card-title">Información general</span>
        </div>
        <div className="fp-card-body">
          <div className="fp-info-grid" style={{ marginBottom: '1rem' }}>
            <InfoItem label="Título">
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{ticket.title}</span>
            </InfoItem>
            <InfoItem label="Estado general">
              <Badge colors={STATUS_COLORS[ticket.status]}>{ticket.status}</Badge>
            </InfoItem>
            <InfoItem label="Tipo de mantenimiento">
              <Badge colors={TYPE_COLORS[ticket.maintenanceType]}>{ticket.maintenanceType}</Badge>
            </InfoItem>
            <InfoItem label="Prioridad">
              <Badge colors={PRIORITY_COLORS[ticket.priority]}>{ticket.priority}</Badge>
            </InfoItem>
            <InfoItem label="Creado el">
              {formatDate(ticket.createdAt)}
            </InfoItem>
            {ticket.closedAt && (
              <InfoItem label="Cerrado el">
                {formatDate(ticket.closedAt)}
              </InfoItem>
            )}
          </div>

          {ticket.description && (
            <div>
              <span className="fp-info-label">Descripción</span>
              <p style={{ margin: '4px 0 0', lineHeight: 1.65, color: 'var(--color-text)', fontSize: '0.9rem' }}>
                {ticket.description}
              </p>
            </div>
          )}
        </div>

      {/* ── Estado general del caso ── */}
      <div className="fp-card">
        <div className="fp-card-header">
          <span className="fp-card-icon">🚦</span>
          <span className="fp-card-title">Estado general del caso</span>
        </div>
        <div className="fp-card-body">
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '0.75rem 1rem', borderRadius: 8,
            background: ticket.status === 'Terminado' ? '#f0fdf4' : '#f8fafc',
            border: `1px solid ${ticket.status === 'Terminado' ? '#86efac' : '#e5e7eb'}`,
          }}>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>Estado actual</p>
              <div style={{ marginTop: 4 }}>
                <Badge colors={STATUS_COLORS[ticket.status]}>{ticket.status}</Badge>
              </div>
            </div>
            {ticket.status !== 'Terminado' && nextStatus[ticket.status] && (
              <button
                disabled={changingStatus}
                onClick={() => handleTicketStatusChange(nextStatus[ticket.status])}
                style={{
                  padding: '0.5rem 1rem', borderRadius: 8,
                  border: 'none', background: '#C0191F',
                  color: 'white', fontSize: '0.875rem', fontWeight: 600,
                  cursor: changingStatus ? 'not-allowed' : 'pointer',
                  opacity: changingStatus ? 0.6 : 1,
                }}
              >
                {changingStatus ? 'Actualizando...' : `→ Marcar como ${nextStatus[ticket.status]}`}
              </button>
            )}
            {ticket.status === 'Terminado' && (
              <span style={{ color: '#166534', fontWeight: 600 }}>✔ Caso cerrado</span>
            )}
          </div>

          {/* Historial de estados */}
          <div style={{ marginTop: '1rem' }}>
            <button
              onClick={async () => {
                if (!showHistory) await loadHistory()
                setShowHistory(prev => !prev)
              }}
              style={{
                background: 'none', border: 'none', color: '#2563eb',
                cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, padding: 0,
              }}
            >
              {showHistory ? '▲ Ocultar historial de cambios' : '▼ Ver historial de cambios'}
            </button>

            {showHistory && (
              <div style={{ marginTop: '0.75rem' }}>
                {loadingHistory ? (
                  <p style={{ color: '#888', fontSize: '0.875rem' }}>Cargando historial…</p>
                ) : history.length === 0 ? (
                  <p style={{ color: '#888', fontSize: '0.875rem' }}>Sin cambios registrados aún.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 260, overflowY: 'auto' }}>
                    {history.map(h => (
                      <div key={h.id} style={{
                        display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                        padding: '0.5rem 0.75rem', borderRadius: 8, background: '#f9fafb',
                        border: '1px solid #e5e7eb', fontSize: '0.82rem',
                      }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%', marginTop: 4, flexShrink: 0,
                          background: h.entityType === 'Ticket' ? '#C0191F' : '#3b82f6',
                        }} />
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: 600 }}>
                            {h.entityType === 'Ticket' ? 'Caso' : 'Equipo'}
                          </span>
                          {' – '}
                          <Badge colors={STATUS_COLORS[h.previousStatus]}>{h.previousStatus}</Badge>
                          {' → '}
                          <Badge colors={STATUS_COLORS[h.newStatus]}>{h.newStatus}</Badge>
                          <span style={{ color: '#6b7280', marginLeft: 6 }}>
                            por <strong>{h.changedByUserName ?? getUserName(h.changedByUserId)}</strong>
                          </span>
                          {h.comment && <span style={{ color: '#6b7280' }}> · {h.comment}</span>}
                        </div>
                        <span style={{ color: '#9ca3af', flexShrink: 0 }}>{formatDate(h.changedAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>


      {/* ── Control de estado por equipo ── */}
      <div className="fp-card">
        <div className="fp-card-header">
          <span className="fp-card-icon">🔧</span>
          <span className="fp-card-title">Control de Estado por Equipo</span>
        </div>
        <div className="fp-card-body">
          {ticket.ticketEquipments?.length > 0 ? (
            ticket.ticketEquipments.map(te => {
              const eqReal = equipments.find(e => (e.id ?? e.Id) === te.equipmentId)
              const yaDadoDeBaja = eqReal?.status === 'Dado de baja'
              const mostrandoBaja = bajaEquipoId === te.equipmentId
              const ticketCerrado = ticket.status === 'Terminado'

              // Flujo: Pendiente → En Proceso → Terminado
              // "Dar de baja" solo aparece cuando te.status === 'En Proceso' y ticket no está cerrado
              const puedeAvanzar = !ticketCerrado && !yaDadoDeBaja && te.status !== 'Terminado' && nextStatus[te.status]
              const puedeDarDeBaja = !ticketCerrado && !yaDadoDeBaja && te.status === 'En Proceso'

              return (
                <div key={te.id} style={{ marginBottom: '0.75rem' }}>
                  {/* Fila de estado */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.65rem 0.9rem', borderRadius: mostrandoBaja ? '8px 8px 0 0' : 8,
                    background: yaDadoDeBaja ? '#fef2f2' : '#f9fafb',
                    border: `1px solid ${yaDadoDeBaja ? '#fecaca' : '#e5e7eb'}`,
                    borderBottom: mostrandoBaja ? 'none' : undefined,
                  }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500, flex: 1 }}>
                      {getEquipmentLabel(te.equipmentId)}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Badge colors={STATUS_COLORS[te.status]}>{te.status}</Badge>

                      {yaDadoDeBaja && (
                        <span style={{ fontSize: '0.78rem', color: '#991b1b', fontWeight: 600 }}>⛔ Dado de baja</span>
                      )}

                      {!yaDadoDeBaja && te.status === 'Terminado' && (
                        <span style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 600 }}>✔ Completado</span>
                      )}

                      {/* Botón avanzar estado: Pendiente→En Proceso o En Proceso→Terminado */}
                      {puedeAvanzar && (
                        <button
                          disabled={changingStatus}
                          onClick={() => handleEquipmentStatusChange(te.id, nextStatus[te.status])}
                          style={{
                            padding: '0.3rem 0.75rem', borderRadius: 6,
                            border: '1px solid #3b82f6', background: '#eff6ff',
                            color: '#1d4ed8', fontSize: '0.8rem', fontWeight: 600,
                            cursor: changingStatus ? 'not-allowed' : 'pointer',
                            opacity: changingStatus ? 0.6 : 1, whiteSpace: 'nowrap',
                          }}
                        >
                          → {nextStatus[te.status]}
                        </button>
                      )}

                      {/* Botón "Dar de baja": solo en estado "En Proceso" y ticket no cerrado */}
                      {puedeDarDeBaja && (
                        <button
                          onClick={() => {
                            setBajaEquipoId(mostrandoBaja ? null : te.equipmentId)
                            setBajaMotivo('')
                          }}
                          title="Dar de baja este equipo"
                          style={{
                            padding: '0.3rem 0.65rem', borderRadius: 6,
                            border: `1px solid ${mostrandoBaja ? '#f87171' : '#fca5a5'}`,
                            background: mostrandoBaja ? '#fef2f2' : '#fff',
                            color: '#991b1b', fontSize: '0.78rem', fontWeight: 600,
                            cursor: 'pointer', whiteSpace: 'nowrap',
                          }}
                        >
                          {mostrandoBaja ? '✕ Cancelar' : '⛔ Dar de baja'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Panel de baja dado de baja ya existente */}
                  {yaDadoDeBaja && eqReal?.bajaMotivo && (
                    <div style={{
                      padding: '0.6rem 0.9rem',
                      background: '#fff5f5', border: '1px solid #fecaca',
                      borderTop: 'none', borderRadius: '0 0 8px 8px',
                      fontSize: '0.82rem', color: '#7f1d1d',
                    }}>
                      <strong>Motivo de baja:</strong> {eqReal.bajaMotivo}
                      {eqReal.bajaAt && (
                        <span style={{ marginLeft: 8, color: '#9ca3af' }}>
                          · {new Date(eqReal.bajaAt).toLocaleString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Formulario de baja */}
                  {mostrandoBaja && !yaDadoDeBaja && (
                    <div style={{
                      padding: '0.9rem 0.9rem',
                      background: '#fff5f5', border: '1px solid #fecaca',
                      borderTop: 'none', borderRadius: '0 0 8px 8px',
                    }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#991b1b', marginBottom: 6 }}>
                        ⚠️ Motivo de la baja *
                      </label>
                      <textarea
                        value={bajaMotivo}
                        onChange={e => { setBajaMotivo(e.target.value); setBajaBlockReason(null) }}
                        placeholder="Describa el motivo por el cual se da de baja este equipo (daño irreparable, obsolescencia, robo, etc.)…"
                        rows={3}
                        style={{
                          width: '100%', boxSizing: 'border-box',
                          padding: '0.5rem', borderRadius: 6,
                          border: '1.5px solid #fca5a5', fontFamily: 'inherit',
                          fontSize: '0.875rem', resize: 'vertical',
                          outline: 'none',
                        }}
                      />

                      {/* Errores de validación de campos requeridos */}
                      {bajaBlockReason && bajaEquipoId === te.equipmentId && (
                        <div style={{
                          marginTop: '0.6rem', padding: '0.65rem 0.8rem',
                          background: '#fef3c7', border: '1px solid #fde68a',
                          borderRadius: 7, fontSize: '0.8rem', color: '#92400e',
                        }}>
                          <p style={{ margin: '0 0 0.35rem', fontWeight: 700 }}>⚠ Antes de dar de baja, completa estos campos:</p>
                          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                            {bajaBlockReason.map((r, i) => <li key={i}>{r}</li>)}
                          </ul>
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.6rem' }}>
                        <button
                          onClick={() => { setBajaEquipoId(null); setBajaMotivo(''); setBajaBlockReason(null) }}
                          style={{
                            padding: '0.4rem 0.9rem', borderRadius: 6,
                            border: '1px solid #e5e7eb', background: '#fff',
                            color: '#374151', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                          }}
                        >
                          Cancelar
                        </button>
                        <button
                          disabled={procesandoBaja || !bajaMotivo.trim() || bajaValidating}
                          onClick={() => handleDarDeBaja(te.id, te.equipmentId)}
                          style={{
                            padding: '0.4rem 0.9rem', borderRadius: 6,
                            border: 'none', background: '#dc2626',
                            color: '#fff', fontSize: '0.82rem', fontWeight: 700,
                            cursor: procesandoBaja || !bajaMotivo.trim() || bajaValidating ? 'not-allowed' : 'pointer',
                            opacity: procesandoBaja || !bajaMotivo.trim() || bajaValidating ? 0.6 : 1,
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                          }}
                        >
                          {bajaValidating ? (
                            <><span style={{ display:'inline-block', width:12, height:12, border:'2px solid rgba(255,255,255,.4)', borderTopColor:'#fff', borderRadius:'50%', animation:'repSpin .6s linear infinite' }} /> Verificando…</>
                          ) : procesandoBaja ? 'Procesando…' : '⛔ Confirmar baja'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            <p style={{ color: '#888', fontSize: '0.875rem' }}>No hay equipos en este caso.</p>
          )}
        </div>
      </div>

      {/* ── Técnicos asignados ── */}
      <div className="fp-card">
        <div className="fp-card-header">
          <span className="fp-card-icon">👷</span>
          <span className="fp-card-title">Técnicos Asignados</span>
        </div>
        <div className="fp-card-body">
          {ticket.ticketEquipments?.length > 0 ? (
            ticket.ticketEquipments.map(te => (
              <div key={`tech-${te.id}`} style={{ marginBottom: '1rem' }}>
                <p style={{
                  fontWeight: 600, fontSize: '0.82rem', color: '#6b7280',
                  margin: '0 0 0.4rem', textTransform: 'uppercase', letterSpacing: '0.03em',
                }}>
                  {getEquipmentLabel(te.equipmentId)}
                </p>
                <TicketTechnicians
                  ticketEquipmentId={te.id}
                  ticketStatus={ticket.status}
                  availableTechnicians={usuarios.filter(u => u.role === 'Laboratorista').map(u => ({ id: u.id, name: u.fullName }))}
                />
              </div>
            ))
          ) : (
            <p style={{ color: '#888', fontSize: '0.875rem' }}>No hay equipos en este caso.</p>
          )}
        </div>
      </div>

      {/* ── Actividades y Diagnósticos ── */}
      <div className="fp-card">
        <div className="fp-card-header">
          <span className="fp-card-icon">📝</span>
          <span className="fp-card-title">Actividades y Diagnósticos</span>
        </div>
        <div className="fp-card-body">
          {ticket.ticketEquipments?.length > 0 ? (
            ticket.ticketEquipments.map(te => (
              <div key={`actdiag-${te.id}`} style={{ marginBottom: '1rem' }}>
                <p style={{
                  fontWeight: 600, fontSize: '0.82rem', color: '#6b7280',
                  margin: '0 0 0.4rem', textTransform: 'uppercase', letterSpacing: '0.03em',
                }}>
                  {getEquipmentLabel(te.equipmentId)}
                </p>
                <TicketActivitiesDiagnoses
                  ticketEquipmentId={te.id}
                  ticketStatus={ticket.status}
                />
              </div>
            ))
          ) : (
            <p style={{ color: '#888', fontSize: '0.875rem' }}>No hay equipos en este caso.</p>
          )}
        </div>
      </div>

      {/* ── Recursos utilizados ── */}
      <div className="fp-card">
        <div className="fp-card-header">
          <span className="fp-card-icon">📦</span>
          <span className="fp-card-title">Recursos Utilizados</span>
        </div>
        <div className="fp-card-body">
          {ticket.ticketEquipments?.length > 0 ? (
            ticket.ticketEquipments.map(te => (
              <div key={`res-${te.id}`} style={{ marginBottom: '1rem' }}>
                <p style={{
                  fontWeight: 600, fontSize: '0.82rem', color: '#6b7280',
                  margin: '0 0 0.4rem', textTransform: 'uppercase', letterSpacing: '0.03em',
                }}>
                  {getEquipmentLabel(te.equipmentId)}
                </p>
                <TicketResources
                  ticketEquipmentId={te.id}
                  ticketStatus={ticket.status}
                />
              </div>
            ))
          ) : (
            <p style={{ color: '#888', fontSize: '0.875rem' }}>No hay equipos en este caso.</p>
          )}
        </div>
      </div>

      {/* ── Modal de confirmación de baja ── */}
      {showBajaConfirm && (() => {
        const eqReal2 = equipments.find(e => (e.id ?? e.Id) === pendingBajaEquipmentId)
        const label = eqReal2
          ? `${eqReal2.assetTag ?? eqReal2.code ?? ''} – ${eqReal2.brand ?? ''} ${eqReal2.model ?? ''}`.trim()
          : 'este equipo'
        return (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
          }}>
            <div style={{
              background: '#fff', borderRadius: 16,
              padding: '2rem', maxWidth: 440, width: '100%',
              boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
              animation: 'baja-modal-in 0.2s ease',
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: '#fef2f2', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: '1.5rem', margin: '0 auto 1rem',
              }}>⛔</div>
              <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: 700, textAlign: 'center', color: '#111827' }}>
                ¿Confirmar baja del equipo?
              </h2>
              <p style={{ margin: '0 0 0.4rem', fontSize: '0.875rem', color: '#6b7280', textAlign: 'center', lineHeight: 1.5 }}>
                Esta acción cambia el estado de <strong style={{ color: '#111827' }}>{label}</strong> a{' '}
                <strong style={{ color: '#991b1b' }}>Dado de baja</strong> de forma permanente.
              </p>
              <div style={{
                background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 8,
                padding: '0.6rem 0.9rem', fontSize: '0.8rem', color: '#92400e',
                margin: '0.9rem 0 1.5rem', display: 'flex', gap: '0.4rem', alignItems: 'flex-start',
              }}>
                <span style={{ flexShrink: 0 }}>⚠️</span>
                <span>Esta acción <strong>no se puede deshacer</strong>. El equipo quedará fuera de servicio y no podrá ser reasignado a laboratorios.</span>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => { setShowBajaConfirm(false); setPendingBajaEquipmentId(null) }}
                  style={{
                    flex: 1, padding: '0.65rem', borderRadius: 8,
                    border: '1px solid #e5e7eb', background: '#fff',
                    color: '#374151', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                  }}
                >Cancelar</button>
                <button
                  onClick={confirmarBajaDefinitiva}
                  style={{
                    flex: 1, padding: '0.65rem', borderRadius: 8,
                    border: 'none', background: '#dc2626',
                    color: '#fff', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer',
                  }}
                >Sí, dar de baja</button>
              </div>
            </div>
            <style>{`@keyframes baja-modal-in { from { opacity:0; transform:scale(.94) } to { opacity:1; transform:scale(1) } }`}</style>
          </div>
        )
      })()}

    </div>
  )
}