import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { maintenanceApi, equipmentApi, userApi } from '../../services/api'

const MAINTENANCE_TYPES = ['Correctivo', 'Preventivo', 'Adaptativo']
const PRIORITIES = ['Baja', 'Media', 'Alta']
const STATUSES = ['Pendiente', 'En Proceso', 'Terminado']

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

export default function Casos() {
  const { user } = useAuth()

  const [tickets, setTickets]       = useState([])
  const [equipments, setEquipments] = useState([])
  const [usuarios, setUsuarios]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [search, setSearch]         = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType]     = useState('')
  const [previewCode, setPreviewCode] = useState('')

  const [showForm, setShowForm]           = useState(false)
  const [showDetail, setShowDetail]       = useState(null)
  const [showHistory, setShowHistory]     = useState(false)
  const [history, setHistory]             = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [saving, setSaving]               = useState(false)
  const [changingStatus, setChangingStatus] = useState(false)
  const [editingTicket, setEditingTicket] = useState(null)
  const [lastCreatedCode, setLastCreatedCode] = useState(null)

  const [form, setForm] = useState({
    title: '', description: '', maintenanceType: '', priority: 'Media', equipmentIds: [],
  })

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const [ticketsRes, eqRes] = await Promise.allSettled([
        maintenanceApi.get('/tickets'),
        equipmentApi.get('/equipments'),
      ])
      if (ticketsRes.status !== 'fulfilled') throw ticketsRes.reason
      if (eqRes.status !== 'fulfilled') throw eqRes.reason
      setTickets(ticketsRes.value.data)
      setEquipments(eqRes.value.data)

      // Solo intentar cargar usuarios, sin romper si falla (ej: Laboratorista no tiene acceso)
      try {
        const usersRes = await userApi.get('/users')
        setUsuarios(usersRes.data)
      } catch {
        // silencioso, no todos los roles pueden ver usuarios
      }
    } catch (e) {
      setError(e.response?.data?.message ?? 'Error al cargar los casos.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const loadHistory = async (ticketId) => {
    try {
      setLoadingHistory(true)
      const res = await maintenanceApi.get(`/tickets/${ticketId}/status-history`)
      setHistory(res.data)
    } catch {
      setHistory([])
    } finally {
      setLoadingHistory(false)
    }
  }

  const getCaseNumberValue = (ticketNumber) => {
    if (!ticketNumber) return 0
    const parts = ticketNumber.split('-')
    return Number(parts[parts.length - 1]) || 0
  }

  const filtered = [...tickets]
    .filter(t => {
    const matchSearch = !search ||
      t.ticketNumber?.toLowerCase().includes(search.toLowerCase()) ||
      t.title?.toLowerCase().includes(search.toLowerCase())

    const matchStatus = !filterStatus || t.status === filterStatus
    const matchType = !filterType || t.maintenanceType === filterType

    return matchSearch && matchStatus && matchType
  })
  .sort((a, b) => getCaseNumberValue(b.ticketNumber) - getCaseNumberValue(a.ticketNumber))


  // Equipos usados en casos activos, excepto el caso que se está editando
const occupiedEquipmentIds = new Set(
  tickets
    .filter(t =>
      t.status !== 'Terminado' &&
      t.id !== editingTicket?.id
    )
    .flatMap(t => t.equipmentIds ?? [])
)

// Solo equipos activos y no ocupados pueden seleccionarse
const availableEquipments = equipments.filter(eq =>
  eq.status === 'Activo' && !occupiedEquipmentIds.has(eq.id)
)

  const openNew = async () => {
    setEditingTicket(null)
    setLastCreatedCode(null)
    setForm({ title: '', description: '', maintenanceType: '', priority: 'Media', equipmentIds: [] })

    try {
      const res = await maintenanceApi.get('/tickets/next-code')
      console.log('NEXT CODE:', res.data)
      setPreviewCode(res.data.ticketNumber)
    } catch (err) {
      console.error('ERROR NEXT CODE:', err)
      setPreviewCode('')
    }

    setShowForm(true)
  }

  const openEdit = (ticket) => {
    setShowDetail(null)
    setEditingTicket(ticket)
    setLastCreatedCode(null)
    const ids = ticket.equipmentIds
      ?? ticket.ticketEquipments?.map(te => te.equipmentId)
      ?? []
    setForm({
      title: ticket.title ?? '',
      description: ticket.description ?? '',
      maintenanceType: ticket.maintenanceType ?? '',
      priority: ticket.priority ?? 'Media',
      equipmentIds: ids,
    })
    setShowForm(true)
  }

  const openDetail = async (ticket) => {
    setHistory([])
    setShowHistory(false)
    try {
      const res = await maintenanceApi.get(`/tickets/${ticket.id}`)
      setShowDetail(res.data)
    } catch {
      setShowDetail(ticket)
    }
  }

  const toggleEquipment = (id) => {
    setForm(prev => ({
      ...prev,
      equipmentIds: prev.equipmentIds.includes(id)
        ? prev.equipmentIds.filter(e => e !== id)
        : [...prev.equipmentIds, id],
    }))
  }

  const handleSave = async () => {
    if (!form.title.trim())             return alert('El título es obligatorio.')
    if (!form.maintenanceType)          return alert('Seleccione el tipo de mantenimiento.')
    if (form.equipmentIds.length === 0) return alert('Debe seleccionar al menos un equipo.')

    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        maintenanceType: form.maintenanceType,
        priority: form.priority,
        createdByUserId: user?.id,
        equipmentIds: form.equipmentIds,
      }

      if (editingTicket) {
        await maintenanceApi.put(`/tickets/${editingTicket.id}`, payload)
      } else {
        const res = await maintenanceApi.post('/tickets', payload)
        setLastCreatedCode(res.data.ticketNumber)
      }

      setShowForm(false)
      setEditingTicket(null)
      setForm({ title: '', description: '', maintenanceType: '', priority: 'Media', equipmentIds: [] })
      await load()
    } catch (e) {
      alert(e.response?.data?.message ?? 'Error al guardar el caso.')
    } finally {
      setSaving(false)
    }
  }

  const handleEquipmentStatusChange = async (teId, newStatus, ticketId) => {
    setChangingStatus(true)
    try {
      await maintenanceApi.put(`/ticket-equipments/${teId}/status`, {
        newStatus,
        comment: '',
        changedByUserId: user?.id,
      })
      setShowDetail(prev => ({
        ...prev,
        ticketEquipments: prev.ticketEquipments.map(te =>
          te.id === teId ? { ...te, status: newStatus } : te
        )
      }))
      if (showHistory) await loadHistory(ticketId)
      await load()
    } catch (err) {
      alert(err.response?.data ?? 'Error al cambiar el estado del equipo.')
    } finally {
      setChangingStatus(false)
    }
  }

  const handleTicketStatusChange = async (ticketId, newStatus) => {
    setChangingStatus(true)
    try {
      await maintenanceApi.put(`/tickets/${ticketId}/status`, {
        newStatus,
        comment: '',
        changedByUserId: user?.id,
      })
      setShowDetail(prev => ({
        ...prev,
        status: newStatus,
        closedAt: newStatus === 'Terminado' ? new Date().toISOString() : prev.closedAt
      }))
      if (showHistory) await loadHistory(ticketId)
      await load()
    } catch (err) {
      alert(err.response?.data ?? 'Error al cambiar el estado del caso.')
    } finally {
      setChangingStatus(false)
    }
  }

  const getEquipmentLabel = (equipmentId) => {
    if (!equipmentId) return '(sin equipo)'
    const eq = equipments.find(e => (e.id ?? e.Id) === equipmentId)
    if (!eq) return String(equipmentId).slice(0, 8) + '…'
    const tag   = eq.assetTag ?? eq.AssetTag ?? ''
    const brand = eq.brand    ?? eq.Brand    ?? ''
    const model = eq.model    ?? eq.Model    ?? ''
    return `${tag} — ${brand} ${model}`.trim()
  }

  const getUserName = (userId) => {
    if (!userId || userId === '00000000-0000-0000-0000-000000000000') 
      return 'Desconocido'
    if (user?.id && userId === user.id) 
      return user.fullName ?? user.FullName ?? 'Yo'
    const found = usuarios.find(u => u.id === userId)
    return found ? found.fullName : `Usuario (${userId.substring(0, 8)}...)`
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const raw = String(dateStr)
    const normalized = (raw.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(raw)) ? raw : raw + 'Z'
    return new Date(normalized).toLocaleString('es-EC', {
      timeZone: 'America/Guayaquil',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div style={{ padding: '2rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>Casos de Mantenimiento</h1>
          <p style={{ margin: 0, color: '#888' }}>Registro y seguimiento de órdenes de trabajo</p>
        </div>
        <button className="btn-primary" onClick={openNew}>+ Nuevo Caso</button>
      </div>

      {error && (
        <div className="alert-error">
          {error}
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      {lastCreatedCode && (
        <div style={{
          background: '#f0fdf4', border: '1px solid #86efac',
          borderRadius: 8, padding: '0.75rem 1rem',
          marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
        }}>
          <span style={{ color: '#166534', fontWeight: 600 }}>✓ Caso creado:</span>
          <code style={{ fontWeight: 700, color: '#166534', fontSize: '1rem' }}>{lastCreatedCode}</code>
          <button onClick={() => setLastCreatedCode(null)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}>✕</button>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input
          placeholder="Buscar por código o título..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, padding: '0.5rem', borderRadius: 6, border: '1px solid #ddd' }}
        />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
          <option value="">Todos los estados</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={selectStyle}>
          <option value="">Todos los tipos</option>
          {MAINTENANCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Tabla */}
      {loading ? <p>Cargando...</p> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <th style={th}>Código</th>
                <th style={th}>Título</th>
                <th style={th}>Tipo</th>
                <th style={thCenter}>Prioridad</th>
                <th style={thCenter}>Estado</th>
                <th style={th}>Creado</th>
                <th style={thCenter}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(ticket => (
                <tr key={ticket.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={td}><code style={{ fontWeight: 600 }}>{ticket.ticketNumber}</code></td>
                  <td style={td}>{ticket.title}</td>
                  <td style={td}><Badge colors={TYPE_COLORS[ticket.maintenanceType]}>{ticket.maintenanceType}</Badge></td>
                  <td style={tdCenter}><Badge colors={PRIORITY_COLORS[ticket.priority]}>{ticket.priority}</Badge></td>
                  <td style={tdCenter}><Badge colors={STATUS_COLORS[ticket.status]}>{ticket.status}</Badge></td>
                  <td style={td}>{formatDate(ticket.createdAt)}</td>
                  <td style={tdCenter}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem' }}>
                      <button onClick={() => openDetail(ticket)} title="Ver detalle" style={iconBtn}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>
                        </svg>
                      </button>
                      {ticket.status !== 'Terminado' && (
                        <button onClick={() => openEdit(ticket)} title="Editar" style={iconBtn}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                    No hay casos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODAL FORMULARIO ── */}
      {showForm && (
        <div style={overlay}>
          <div style={{ ...modal, maxWidth: 640 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0 }}>{editingTicket ? 'Editar Caso' : 'Nuevo Caso de Mantenimiento'}</h3>
              <button onClick={() => setShowForm(false)} style={closeBtn}>✕</button>
            </div>

            <div style={{ marginBottom: '0.75rem' }}>
              <label style={labelStyle}>Código del caso</label>
              <input
                value={editingTicket?.ticketNumber ?? previewCode}
                readOnly
                style={{
                  ...inputStyle,
                  background: '#f9fafb',
                  color: '#374151',
                  fontWeight: 600,
                  cursor: 'not-allowed'
                }}
              />
            </div>

            <div style={{ marginBottom: '0.75rem' }}>
              <label style={labelStyle}>Título *</label>
              <input
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="Ej: Falla en proyector del Laboratorio A"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '0.75rem' }}>
              <label style={labelStyle}>Descripción</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Descripción detallada del problema..."
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            <div style={grid2}>
              <div>
                <label style={labelStyle}>Tipo de Mantenimiento *</label>
                <select value={form.maintenanceType} onChange={e => setForm({ ...form, maintenanceType: e.target.value })} style={inputStyle}>
                  <option value="">Seleccione...</option>
                  {MAINTENANCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Prioridad</label>
                <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} style={inputStyle}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '0.75rem' }}>
              <label style={labelStyle}>
                Equipos involucrados *
                {form.equipmentIds.length > 0 && (
                  <span style={{ marginLeft: 6, color: '#2563eb', fontWeight: 400 }}>
                    ({form.equipmentIds.length} seleccionado{form.equipmentIds.length > 1 ? 's' : ''})
                  </span>
                )}
              </label>
              <div style={{ border: '1px solid #ddd', borderRadius: 6, maxHeight: 200, overflowY: 'auto', padding: '0.25rem 0' }}>
                {availableEquipments.length === 0 && (
                  <p style={{ padding: '0.5rem 1rem', color: '#888', margin: 0 }}>
                    {equipments.length === 0 ? 'Cargando equipos...' : 'No hay equipos disponibles (todos están en mantenimiento).'}
                  </p>
                )}
                {availableEquipments.map(eq => (
                  <label key={eq.id} style={{
                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                    padding: '0.4rem 0.75rem', cursor: 'pointer',
                    background: form.equipmentIds.includes(eq.id) ? '#eff6ff' : 'transparent',
                    borderBottom: '1px solid #f5f5f5',
                  }}>
                    <input
                      type="checkbox"
                      checked={form.equipmentIds.includes(eq.id)}
                      onChange={() => toggleEquipment(eq.id)}
                      style={{ width: 15, height: 15, accentColor: '#2563eb', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.875rem' }}>
                      <strong>{eq.assetTag}</strong> — {eq.brand} {eq.model}
                      {eq.serialNumber && <span style={{ color: '#888' }}> · {eq.serialNumber}</span>}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : editingTicket ? 'Actualizar' : 'Crear Caso'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DETALLE + CONTROL DE ESTADOS (HU-12) ── */}
      {showDetail && (
        <div style={overlay}>
          <div style={{ ...modal, maxWidth: 680 }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0 }}>Detalle del Caso</h3>
                <code style={{ color: '#2563eb', fontWeight: 700, fontSize: '1rem' }}>{showDetail.ticketNumber}</code>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {showDetail.status !== 'Terminado' && (
                  <button className="btn-secondary" onClick={() => { const t = showDetail; setShowDetail(null); openEdit(t) }}>
                    Editar
                  </button>
                )}
                <button onClick={() => setShowDetail(null)} style={closeBtn}>✕</button>
              </div>
            </div>

            {/* Info general */}
            <div style={grid2}>
              <Info label="Título" value={showDetail.title} />
              <Info label="Estado general">
                <Badge colors={STATUS_COLORS[showDetail.status]}>{showDetail.status}</Badge>
              </Info>
              <Info label="Tipo">
                <Badge colors={TYPE_COLORS[showDetail.maintenanceType]}>{showDetail.maintenanceType}</Badge>
              </Info>
              <Info label="Prioridad">
                <Badge colors={PRIORITY_COLORS[showDetail.priority]}>{showDetail.priority}</Badge>
              </Info>
              <Info label="Creado el" value={formatDate(showDetail.createdAt)} />
              {showDetail.closedAt && <Info label="Cerrado el" value={formatDate(showDetail.closedAt)} />}
            </div>

            {showDetail.description && (
              <div style={{ marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginBottom: 4 }}>Descripción</span>
                <p style={{ margin: 0, lineHeight: 1.6, color: '#374151' }}>{showDetail.description}</p>
              </div>
            )}

            <hr style={{ margin: '0.75rem 0', borderColor: '#f0f0f0' }} />

            {/* ── HU-12: Estado por equipo ── */}
            <p style={{ fontWeight: 700, margin: '0 0 0.75rem', fontSize: '0.95rem' }}>
              Control de Estado por Equipo
            </p>

            {showDetail.ticketEquipments?.length > 0 ? (
              showDetail.ticketEquipments.map(te => (
                <div key={te.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.6rem 0.9rem', borderRadius: 8,
                  background: '#f9fafb', border: '1px solid #e5e7eb',
                  marginBottom: '0.5rem'
                }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, flex: 1 }}>
                    {getEquipmentLabel(te.equipmentId)}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Badge colors={STATUS_COLORS[te.status]}>{te.status}</Badge>
                    {te.status !== 'Terminado' && showDetail.status !== 'Terminado' && (
                      <button
                        disabled={changingStatus}
                        onClick={() => handleEquipmentStatusChange(te.id, nextStatus[te.status], showDetail.id)}
                        style={{
                          padding: '0.3rem 0.75rem', borderRadius: 6,
                          border: '1px solid #3b82f6', background: '#eff6ff',
                          color: '#1d4ed8', fontSize: '0.8rem', fontWeight: 600,
                          cursor: changingStatus ? 'not-allowed' : 'pointer',
                          opacity: changingStatus ? 0.6 : 1,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        → {nextStatus[te.status]}
                      </button>
                    )}
                    {te.status === 'Terminado' && (
                      <span style={{ fontSize: '0.78rem', color: '#166534' }}>✓ Completado</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: '#888', fontSize: '0.875rem' }}>No hay equipos en este caso.</p>
            )}

            <hr style={{ margin: '1rem 0 0.75rem', borderColor: '#f0f0f0' }} />

            {/* ── HU-12: Estado general del caso ── */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '0.75rem 1rem', borderRadius: 8,
              background: showDetail.status === 'Terminado' ? '#f0fdf4' : '#f8fafc',
              border: `1px solid ${showDetail.status === 'Terminado' ? '#86efac' : '#e5e7eb'}`
            }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>Estado general del caso</p>
                <div style={{ marginTop: 4 }}>
                  <Badge colors={STATUS_COLORS[showDetail.status]}>{showDetail.status}</Badge>
                </div>
              </div>
              {showDetail.status !== 'Terminado' && nextStatus[showDetail.status] && (
                <button
                  disabled={changingStatus}
                  onClick={() => handleTicketStatusChange(showDetail.id, nextStatus[showDetail.status])}
                  style={{
                    padding: '0.5rem 1rem', borderRadius: 8,
                    border: 'none', background: '#C0191F',
                    color: 'white', fontSize: '0.875rem', fontWeight: 600,
                    cursor: changingStatus ? 'not-allowed' : 'pointer',
                    opacity: changingStatus ? 0.6 : 1,
                  }}
                >
                  {changingStatus ? 'Actualizando...' : `→ Marcar como ${nextStatus[showDetail.status]}`}
                </button>
              )}
              {showDetail.status === 'Terminado' && (
                <span style={{ color: '#166534', fontWeight: 600 }}>✓ Caso cerrado</span>
              )}
            </div>

            {/* ── HU-12: Historial de estados ── */}
            <div style={{ marginTop: '1rem' }}>
              <button
                onClick={async () => {
                  if (!showHistory) await loadHistory(showDetail.id)
                  setShowHistory(prev => !prev)
                }}
                style={{
                  background: 'none', border: 'none', color: '#2563eb',
                  cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, padding: 0
                }}
              >
                {showHistory ? '▲ Ocultar historial de cambios' : '▼ Ver historial de cambios'}
              </button>

              {showHistory && (
                <div style={{ marginTop: '0.75rem' }}>
                  {loadingHistory ? (
                    <p style={{ color: '#888', fontSize: '0.875rem' }}>Cargando historial...</p>
                  ) : history.length === 0 ? (
                    <p style={{ color: '#888', fontSize: '0.875rem' }}>Sin cambios registrados aún.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 200, overflowY: 'auto' }}>
                      {history.map(h => (
                        <div key={h.id} style={{
                          display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                          padding: '0.5rem 0.75rem', borderRadius: 8, background: '#f9fafb',
                          border: '1px solid #e5e7eb', fontSize: '0.82rem'
                        }}>
                          <div style={{
                            width: 8, height: 8, borderRadius: '50%', marginTop: 4, flexShrink: 0,
                            background: h.entityType === 'Ticket' ? '#C0191F' : '#3b82f6'
                          }} />
                          <div style={{ flex: 1 }}>
                            <span style={{ fontWeight: 600 }}>
                              {h.entityType === 'Ticket' ? 'Caso' : 'Equipo'}
                            </span>
                            {' — '}
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
      )}
    </div>
  )
}

function Badge({ colors, children }) {
  return (
    <span style={{
      display: 'inline-block', padding: '0.2rem 0.55rem',
      borderRadius: 4, fontSize: '0.82rem', fontWeight: 600,
      background: colors?.bg ?? '#f3f4f6', color: colors?.color ?? '#374151',
    }}>
      {children}
    </span>
  )
}

function Info({ label, value, children }) {
  return (
    <div style={{ marginBottom: '0.4rem' }}>
      <span style={{ fontSize: '0.75rem', color: '#888', display: 'block' }}>{label}</span>
      {children ?? <span style={{ fontWeight: 500 }}>{value ?? '-'}</span>}
    </div>
  )
}

const th        = { padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.85rem' }
const thCenter  = { ...th, textAlign: 'center' }
const td        = { padding: '0.75rem 1rem' }
const tdCenter  = { ...td, textAlign: 'center' }
const overlay   = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, overflowY: 'auto', padding: '1rem' }
const modal     = { background: '#fff', borderRadius: 12, padding: '2rem', width: '100%', maxHeight: '90vh', overflowY: 'auto' }
const grid2     = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }
const labelStyle = { display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem', color: '#555' }
const inputStyle = { width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid #ddd', boxSizing: 'border-box', fontFamily: 'inherit' }
const selectStyle = { padding: '0.5rem', borderRadius: 6, border: '1px solid #ddd' }
const closeBtn  = { background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: '#666' }
const iconBtn   = { width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer', lineHeight: 0 }