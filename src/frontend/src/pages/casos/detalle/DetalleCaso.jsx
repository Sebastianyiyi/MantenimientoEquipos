import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { maintenanceApi, equipmentApi, userApi } from '../../../services/api'
import TicketTechnicians from '../../mantenimiento/TicketTechnicians'
import TicketResources from '../../mantenimiento/TicketResources'
import TicketActivitiesDiagnoses from '../../mantenimiento/TicketActivitiesDiagnoses'
import '../../FormPage.css'
import './DetalleCaso.css'

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
      display: 'inline-block', padding: '0.2rem 0.7rem',
      borderRadius: 20, fontSize: '0.78rem', fontWeight: 700,
      background: colors?.bg ?? '#f3f4f6', color: colors?.color ?? '#374151',
      letterSpacing: '0.01em',
    }}>
      {children}
    </span>
  )
}

function SectionCard({ number, icon, title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="dc-section">
      <div className="dc-section-header" onClick={() => setOpen(o => !o)}>
        <div className="dc-section-left">
          <div className="dc-section-num">{number}</div>
          <span className="dc-section-icon">{icon}</span>
          <span className="dc-section-title">{title}</span>
        </div>
        <span className="dc-section-chevron">{open ? '▲' : '▼'}</span>
      </div>
      {open && <div className="dc-section-body">{children}</div>}
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
  const [bajaBlockReason, setBajaBlockReason] = useState(null)

  // ── Marcar Finalizado (equipo) ──
  const [finEquipoValidating, setFinEquipoValidating] = useState(false)
  const [finEquipoBlockReason, setFinEquipoBlockReason] = useState({})

  // ── Marcar como Terminado (ticket) ──
  const [finTicketValidating, setFinTicketValidating] = useState(false)
  const [finTicketBlockReason, setFinTicketBlockReason] = useState(null)
  const [showFinTicketBlock, setShowFinTicketBlock] = useState(false)

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const stripped = String(dateStr).replace(/Z$/i, '').replace(/[+-]\d{2}:\d{2}$/, '')
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
        } catch { /* silencioso */ }
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
    if (newSt === 'Terminado') {
      setFinEquipoValidating(true)
      try {
        const [techRes, actRes, diagRes] = await Promise.all([
          maintenanceApi.get(`/ticket-equipments/${teId}/technicians`),
          maintenanceApi.get(`/ticket-equipments/${teId}/activities`),
          maintenanceApi.get(`/ticket-equipments/${teId}/diagnoses`),
        ])
        const faltantes = []
        if (!techRes.data?.length)
          faltantes.push('Técnicos Asignados: debe asignar al menos un técnico')
        if (!actRes.data?.length && !diagRes.data?.length)
          faltantes.push('Actividades y Diagnósticos: debe registrar al menos una actividad o diagnóstico')
        if (faltantes.length > 0) {
          setFinEquipoBlockReason(prev => ({ ...prev, [teId]: faltantes }))
          setFinEquipoValidating(false)
          return
        }
      } catch {
        setFinEquipoValidating(false)
        alert('No se pudo validar los campos requeridos. Intente de nuevo.')
        return
      }
      setFinEquipoValidating(false)
    }
    setChangingStatus(true)
    try {
      await maintenanceApi.put(`/ticket-equipments/${teId}/status`, {
        newStatus: newSt, comment: '', changedByUserId: user?.id,
      })
      setFinEquipoBlockReason(prev => { const n = { ...prev }; delete n[teId]; return n })
      if (newSt === 'En Proceso' && ticket?.status === 'Pendiente') {
        try {
          await maintenanceApi.put(`/tickets/${id}/status`, {
            newStatus: 'En Proceso',
            comment: 'Avanzado automáticamente al marcar un equipo En Proceso.',
            changedByUserId: user?.id,
          })
        } catch { /* silencioso */ }
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
    if (newSt === 'Terminado') {
      setFinTicketValidating(true)
      try {
        const tes = ticket?.ticketEquipments ?? []
        const faltantes = []
        const equiposSinTerminar = tes.filter(te => {
          const eqReal = equipments.find(e => (e.id ?? e.Id) === te.equipmentId)
          return eqReal?.status !== 'Dado de baja' && te.status !== 'Terminado'
        })
        if (equiposSinTerminar.length > 0) {
          const labels = equiposSinTerminar.map(te => getEquipmentLabel(te.equipmentId))
          faltantes.push(`Estado de equipos: los siguientes equipos aún no están finalizados: ${labels.join(', ')}`)
        }
        const checks = await Promise.allSettled(
          tes.map(te =>
            Promise.all([
              maintenanceApi.get(`/ticket-equipments/${te.id}/technicians`),
              maintenanceApi.get(`/ticket-equipments/${te.id}/activities`),
              maintenanceApi.get(`/ticket-equipments/${te.id}/diagnoses`),
            ]).then(([techRes, actRes, diagRes]) => ({ te, techRes, actRes, diagRes }))
          )
        )
        checks.forEach(result => {
          if (result.status !== 'fulfilled') return
          const { te, techRes, actRes, diagRes } = result.value
          const eqReal = equipments.find(e => (e.id ?? e.Id) === te.equipmentId)
          if (eqReal?.status === 'Dado de baja') return
          const label = getEquipmentLabel(te.equipmentId)
          if (!techRes.data?.length)
            faltantes.push(`${label}: debe tener al menos un técnico asignado`)
          if (!actRes.data?.length && !diagRes.data?.length)
            faltantes.push(`${label}: debe tener al menos una actividad o diagnóstico registrado`)
        })
        if (faltantes.length > 0) {
          setFinTicketBlockReason(faltantes)
          setShowFinTicketBlock(true)
          setFinTicketValidating(false)
          return
        }
      } catch {
        setFinTicketValidating(false)
        alert('No se pudo validar los requisitos del caso. Intente de nuevo.')
        return
      }
      setFinTicketValidating(false)
      setFinTicketBlockReason(null)
      setShowFinTicketBlock(false)
    }
    setChangingStatus(true)
    try {
      await maintenanceApi.put(`/tickets/${id}/status`, {
        newStatus: newSt, comment: '', changedByUserId: user?.id,
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
      const [techRes, actRes, diagRes] = await Promise.all([
        maintenanceApi.get(`/ticket-equipments/${teId}/technicians`),
        maintenanceApi.get(`/ticket-equipments/${teId}/activities`),
        maintenanceApi.get(`/ticket-equipments/${teId}/diagnoses`),
      ])
      const faltantes = []
      if (!techRes.data?.length)
        faltantes.push('Técnicos Asignados: debe asignar al menos un técnico')
      if (!actRes.data?.length && !diagRes.data?.length)
        faltantes.push('Actividades y Diagnósticos: debe registrar al menos una actividad o diagnóstico')
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
        motivo: bajaMotivo.trim(), cambiadoPorUserId: user?.id ?? null,
      })
      setBajaEquipoId(null); setBajaMotivo(''); setBajaBlockReason(null); setPendingBajaEquipmentId(null)
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
    <div className="dc-page">
      <style>{`@keyframes repSpin { to { transform: rotate(360deg) } }`}</style>

      {/* ── Cabecera ── */}
      <div className="dc-topbar">
        <div className="dc-breadcrumb">
          <button className="dc-breadcrumb-link" onClick={() => navigate('/casos')}>
            FISEI – Mantenimiento
          </button>
          <span className="dc-breadcrumb-sep">›</span>
          <span className="dc-breadcrumb-current">Mantenimiento</span>
        </div>
      </div>

      <div className="dc-header">
        <div className="dc-header-left">
          <button className="dc-back-btn" onClick={() => navigate('/casos')}>
            ← Volver a Casos
          </button>
          <div>
            <h1 className="dc-title">Detalle del Caso</h1>
            <span className="dc-case-number">{ticket.ticketNumber}</span>
          </div>
        </div>
        {ticket.status !== 'Terminado' && (
          <button className="dc-edit-btn" onClick={() => navigate(`/casos/${id}/editar`)}>
            ✏️ Editar Caso
          </button>
        )}
      </div>

      {/* ── Secciones ── */}
      <SectionCard number="1" icon="📋" title="Información General">
        <div className="dc-info-grid">
          <div className="dc-info-block dc-span-2">
            <span className="dc-info-label">TÍTULO</span>
            <span className="dc-info-value dc-title-val">{ticket.title}</span>
          </div>
          <div className="dc-info-block">
            <span className="dc-info-label">TIPO</span>
            <div><Badge colors={TYPE_COLORS[ticket.maintenanceType]}>{ticket.maintenanceType}</Badge></div>
          </div>
          <div className="dc-info-block">
            <span className="dc-info-label">PRIORIDAD</span>
            <div><Badge colors={PRIORITY_COLORS[ticket.priority]}>{ticket.priority}</Badge></div>
          </div>
          {ticket.description && (
            <div className="dc-info-block dc-span-full">
              <span className="dc-info-label">DESCRIPCIÓN</span>
              <span className="dc-info-value">{ticket.description}</span>
            </div>
          )}
          <div className="dc-info-block">
            <span className="dc-info-label">FECHA DE CREACIÓN</span>
            <span className="dc-info-value">{formatDate(ticket.createdAt)}</span>
          </div>
          <div className="dc-info-block">
            <span className="dc-info-label">ESTADO ACTUAL</span>
            <div><Badge colors={STATUS_COLORS[ticket.status]}>{ticket.status}</Badge></div>
          </div>
          {ticket.closedAt && (
            <div className="dc-info-block">
              <span className="dc-info-label">CERRADO EL</span>
              <span className="dc-info-value">{formatDate(ticket.closedAt)}</span>
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard number="2" icon="🚦" title="Estado General del Caso">
        <div className="dc-status-row">
          <div className="dc-status-current">
            <span className="dc-info-label">ACTUAL</span>
            <Badge colors={STATUS_COLORS[ticket.status]}>{ticket.status}</Badge>
          </div>
          <div className="dc-status-actions">
            {ticket.status !== 'Terminado' && nextStatus[ticket.status] && (
              <button
                disabled={changingStatus || finTicketValidating}
                onClick={() => handleTicketStatusChange(nextStatus[ticket.status])}
                className="dc-advance-btn"
                style={{ opacity: (changingStatus || finTicketValidating) ? 0.6 : 1 }}
              >
                {finTicketValidating ? (
                  <><span className="dc-spinner" /> Verificando…</>
                ) : changingStatus ? 'Actualizando...' : `Marcar como ${nextStatus[ticket.status]}`}
              </button>
            )}
            {ticket.status === 'Terminado' && (
              <span className="dc-closed-label">✔ Caso cerrado</span>
            )}
          </div>
          <button
            className="dc-history-link"
            onClick={async () => {
              if (!showHistory) await loadHistory()
              setShowHistory(prev => !prev)
            }}
          >
            {showHistory ? 'Ocultar historial de cambios' : 'Ver historial de cambios del estado'}
          </button>
        </div>

        {showFinTicketBlock && finTicketBlockReason && (
          <div className="dc-warn-box" style={{ marginTop: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <p style={{ margin: '0 0 0.4rem', fontWeight: 700 }}>⚠ Para cerrar el caso, complete lo siguiente:</p>
              <button onClick={() => setShowFinTicketBlock(false)} className="dc-close-x">✕</button>
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
              {finTicketBlockReason.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        )}
      </SectionCard>

      <SectionCard number="3" icon="🔧" title="Control de Estado por Equipo">
        {ticket.ticketEquipments?.length > 0 ? (
          <div className="dc-equip-cols">
            {ticket.ticketEquipments.map(te => {
              const eqReal = equipments.find(e => (e.id ?? e.Id) === te.equipmentId)
              const yaDadoDeBaja = eqReal?.status === 'Dado de baja'
              const mostrandoBaja = bajaEquipoId === te.equipmentId
              const ticketCerrado = ticket.status === 'Terminado'
              const puedeAvanzar = !ticketCerrado && !yaDadoDeBaja && te.status !== 'Terminado' && nextStatus[te.status]
              const puedeDarDeBaja = !ticketCerrado && !yaDadoDeBaja && te.status === 'En Proceso'

              return (
                <div key={te.id} className="dc-equip-col">
                  <div className={`dc-equip-card ${yaDadoDeBaja ? 'dc-equip-baja' : ''}`}>
                    <div className="dc-equip-col-header">
                      <span className="dc-equip-label">{getEquipmentLabel(te.equipmentId)}</span>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <Badge colors={STATUS_COLORS[te.status]}>{te.status}</Badge>
                        {yaDadoDeBaja && <span className="dc-baja-label">⛔ Dado de baja</span>}
                        {!yaDadoDeBaja && te.status === 'Terminado' && <span className="dc-done-label">✔ Completado</span>}
                      </div>
                    </div>

                    <div className="dc-equip-btns">
                      {puedeAvanzar && (
                        <button
                          disabled={changingStatus || finEquipoValidating}
                          onClick={() => handleEquipmentStatusChange(te.id, nextStatus[te.status])}
                          className="dc-btn-advance-equip"
                          style={{ opacity: (changingStatus || finEquipoValidating) ? 0.6 : 1 }}
                        >
                          {finEquipoValidating && nextStatus[te.status] === 'Terminado' ? (
                            <><span className="dc-spinner dc-spinner-blue" /> Verificando…</>
                          ) : `→ ${nextStatus[te.status]}`}
                        </button>
                      )}
                      {puedeDarDeBaja && (
                        <button
                          onClick={() => { setBajaEquipoId(mostrandoBaja ? null : te.equipmentId); setBajaMotivo('') }}
                          className={`dc-btn-baja ${mostrandoBaja ? 'dc-btn-baja-active' : ''}`}
                        >
                          {mostrandoBaja ? '✕ Cancelar' : '⛔ Dar de baja'}
                        </button>
                      )}
                    </div>

                    {yaDadoDeBaja && eqReal?.bajaMotivo && (
                      <div className="dc-baja-reason">
                        <strong>Motivo de baja:</strong> {eqReal.bajaMotivo}
                        {eqReal.bajaAt && (
                          <span style={{ marginLeft: 8, color: '#9ca3af' }}>
                            · {new Date(eqReal.bajaAt).toLocaleString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    )}

                    {finEquipoBlockReason[te.id] && !mostrandoBaja && (
                      <div className="dc-warn-box" style={{ marginTop: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <p style={{ margin: '0 0 0.35rem', fontWeight: 700 }}>⚠ Antes de finalizar este equipo, completa:</p>
                          <button onClick={() => setFinEquipoBlockReason(prev => { const n = { ...prev }; delete n[te.id]; return n })} className="dc-close-x">✕</button>
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                          {finEquipoBlockReason[te.id].map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                      </div>
                    )}

                    {mostrandoBaja && !yaDadoDeBaja && (
                      <div className="dc-baja-form">
                        <label className="dc-baja-form-label">⚠️ Motivo de la baja *</label>
                        <textarea
                          value={bajaMotivo}
                          onChange={e => { setBajaMotivo(e.target.value); setBajaBlockReason(null) }}
                          placeholder="Describa el motivo por el cual se da de baja este equipo…"
                          rows={3}
                          className="dc-baja-textarea"
                        />
                        {bajaBlockReason && bajaEquipoId === te.equipmentId && (
                          <div className="dc-warn-box" style={{ marginTop: '0.5rem' }}>
                            <p style={{ margin: '0 0 0.35rem', fontWeight: 700 }}>⚠ Antes de dar de baja, completa estos campos:</p>
                            <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                              {bajaBlockReason.map((r, i) => <li key={i}>{r}</li>)}
                            </ul>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.6rem' }}>
                          <button onClick={() => { setBajaEquipoId(null); setBajaMotivo(''); setBajaBlockReason(null) }} className="dc-btn-cancel-baja">
                            Cancelar
                          </button>
                          <button
                            disabled={procesandoBaja || !bajaMotivo.trim() || bajaValidating}
                            onClick={() => handleDarDeBaja(te.id, te.equipmentId)}
                            className="dc-btn-confirm-baja"
                            style={{ opacity: procesandoBaja || !bajaMotivo.trim() || bajaValidating ? 0.6 : 1 }}
                          >
                            {bajaValidating ? <><span className="dc-spinner" /> Verificando…</> : procesandoBaja ? 'Procesando…' : '⛔ Confirmar baja'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p style={{ color: '#888', fontSize: '0.875rem' }}>No hay equipos en este caso.</p>
        )}
      </SectionCard>

      <SectionCard number="4" icon="👷" title="Técnicos Asignados">
        {ticket.ticketEquipments?.length > 0 ? (
          <div className="dc-equip-cols">
            {ticket.ticketEquipments.map(te => (
              <div key={`tech-${te.id}`} className="dc-equip-col">
                <p className="dc-col-label">{getEquipmentLabel(te.equipmentId)}</p>
                <TicketTechnicians
                  ticketEquipmentId={te.id}
                  ticketStatus={ticket.status}
                  availableTechnicians={usuarios.filter(u => u.role === 'Laboratorista').map(u => ({ id: u.id, name: u.fullName }))}
                />
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#888', fontSize: '0.875rem' }}>No hay equipos en este caso.</p>
        )}
      </SectionCard>

      <SectionCard number="5" icon="📝" title="Actividades y Diagnósticos">
        {ticket.ticketEquipments?.length > 0 ? (
          <div className="dc-equip-cols">
            {ticket.ticketEquipments.map(te => (
              <div key={`actdiag-${te.id}`} className="dc-equip-col">
                <p className="dc-col-label">{getEquipmentLabel(te.equipmentId)}</p>
                <TicketActivitiesDiagnoses ticketEquipmentId={te.id} ticketStatus={ticket.status} />
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#888', fontSize: '0.875rem' }}>No hay equipos en este caso.</p>
        )}
      </SectionCard>

      <SectionCard number="6" icon="📦" title="Recursos Utilizados">
        {ticket.ticketEquipments?.length > 0 ? (
          <div className="dc-equip-cols">
            {ticket.ticketEquipments.map(te => (
              <div key={`res-${te.id}`} className="dc-equip-col">
                <p className="dc-col-label">{getEquipmentLabel(te.equipmentId)}</p>
                <TicketResources ticketEquipmentId={te.id} ticketStatus={ticket.status} />
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#888', fontSize: '0.875rem' }}>No hay equipos en este caso.</p>
        )}
      </SectionCard>

      {/* ── Historial de Cambios (al final, siempre visible si se abrió) ── */}
      {showHistory && (
        <SectionCard number="7" icon="🕑" title="Historial de Cambios" defaultOpen={true}>
          {loadingHistory ? (
            <p style={{ color: '#888', fontSize: '0.875rem' }}>Cargando historial…</p>
          ) : history.length === 0 ? (
            <p style={{ color: '#888', fontSize: '0.875rem' }}>Sin cambios registrados aún.</p>
          ) : (
            <div className="dc-history-list">
              {history.map((h, idx) => (
                <div key={h.id} className="dc-history-item">
                  <div className="dc-history-dot-col">
                    <div className={`dc-history-dot ${h.entityType === 'Ticket' ? 'dc-dot-red' : 'dc-dot-blue'}`} />
                    {idx < history.length - 1 && <div className="dc-history-line" />}
                  </div>
                  <div className="dc-history-content">
                    <div className="dc-history-main">
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                        {h.entityType === 'Ticket' ? 'Caso' : `Equipo`}
                        {h.entityType !== 'Ticket' && h.equipmentId && (
                          <span style={{ fontWeight: 400, color: '#6b7280' }}> — {getEquipmentLabel(h.equipmentId)}</span>
                        )}
                      </span>
                      {' '}
                      <span style={{ color: '#6b7280', fontSize: '0.82rem' }}>
                        marcado como{' '}
                      </span>
                      <Badge colors={STATUS_COLORS[h.newStatus]}>{h.newStatus}</Badge>
                    </div>
                    <div className="dc-history-meta">
                      <span>Realizado por <strong>{h.changedByUserName ?? getUserName(h.changedByUserId)}</strong></span>
                      {h.comment && <span> · {h.comment}</span>}
                      <span style={{ color: '#9ca3af', marginLeft: 'auto' }}>{formatDate(h.changedAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {/* ── Modal de confirmación de baja ── */}
      {showBajaConfirm && (() => {
        const eqReal2 = equipments.find(e => (e.id ?? e.Id) === pendingBajaEquipmentId)
        const label = eqReal2
          ? `${eqReal2.assetTag ?? eqReal2.code ?? ''} – ${eqReal2.brand ?? ''} ${eqReal2.model ?? ''}`.trim()
          : 'este equipo'
        return (
          <div className="dc-modal-overlay">
            <div className="dc-modal">
              <div className="dc-modal-icon">⛔</div>
              <h2 className="dc-modal-title">¿Confirmar baja del equipo?</h2>
              <p className="dc-modal-desc">
                Esta acción cambia el estado de <strong>{label}</strong> a{' '}
                <strong style={{ color: '#991b1b' }}>Dado de baja</strong> de forma permanente.
              </p>
              <div className="dc-modal-warn">
                <span>⚠️</span>
                <span>Esta acción <strong>no se puede deshacer</strong>. El equipo quedará fuera de servicio y no podrá ser reasignado a laboratorios.</span>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={() => { setShowBajaConfirm(false); setPendingBajaEquipmentId(null) }} className="dc-modal-btn-cancel">Cancelar</button>
                <button onClick={confirmarBajaDefinitiva} className="dc-modal-btn-confirm">Sí, dar de baja</button>
              </div>
            </div>
            <style>{`@keyframes dc-modal-in { from { opacity:0; transform:scale(.94) } to { opacity:1; transform:scale(1) } }`}</style>
          </div>
        )
      })()}
    </div>
  )
}
