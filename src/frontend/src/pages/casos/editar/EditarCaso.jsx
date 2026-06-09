import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { maintenanceApi, equipmentApi } from '../../../services/api'
import './EditarCaso.css'

const MAINTENANCE_TYPES = ['Correctivo', 'Preventivo', 'Adaptativo']
const PRIORITIES = ['Baja', 'Media', 'Alta']

const PRIORITY_COLORS = {
  Alta:  { bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5' },
  Media: { bg: '#FDF0F1', color: '#C81E3A', border: '#F3C7CF' },
  Baja:  { bg: '#F0FDF4', color: '#166534', border: '#BBF7D0' },
}

function CaseIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="9" y="2" width="6" height="4" rx="1" />
      <path d="M5 4h-1a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1" />
    </svg>
  )
}

function EquipmentIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
    </svg>
  )
}

function ChevronDown(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

function SearchIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  )
}

export default function EditarCaso() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [equipments, setEquipments] = useState([])
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [ticketNumber, setTicketNumber] = useState('')

  const [equipSearch, setEquipSearch] = useState('')
  const [filterPC, setFilterPC] = useState('')
  const [filterLab, setFilterLab] = useState('')
  const [filterType, setFilterType] = useState('')

  const [form, setForm] = useState({
    title: '',
    description: '',
    maintenanceType: '',
    priority: 'Media',
    equipmentIds: [],
  })

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [ticketRes, allTickRes, eqRes] = await Promise.allSettled([
          maintenanceApi.get(`/tickets/${id}`),
          maintenanceApi.get('/tickets'),
          equipmentApi.get('/equipments'),
        ])

        if (ticketRes.status !== 'fulfilled') throw new Error('Caso no encontrado')

        const ticket = ticketRes.value.data
        setTicketNumber(ticket.ticketNumber)

        const ids =
          ticket.equipmentIds ??
          ticket.ticketEquipments?.map(te => te.equipmentId) ??
          []

        setForm({
          title: ticket.title ?? '',
          description: ticket.description ?? '',
          maintenanceType: ticket.maintenanceType ?? '',
          priority: ticket.priority ?? 'Media',
          equipmentIds: ids,
        })

        if (allTickRes.status === 'fulfilled') setTickets(allTickRes.value.data)
        if (eqRes.status === 'fulfilled') setEquipments(eqRes.value.data)
      } catch (e) {
        setError('No se pudo cargar el caso: ' + (e.message ?? ''))
      } finally {
        setLoading(false)
      }
    }

    loadAll()
  }, [id])

  const occupiedIds = new Set(
    tickets
      .filter(t => t.status !== 'Terminado' && t.id !== id)
      .flatMap(t => t.equipmentIds ?? [])
  )

  const available = equipments.filter(eq => {
    if (eq.status !== 'Activo' && !form.equipmentIds.includes(eq.id)) return false
    if (occupiedIds.has(eq.id) && !form.equipmentIds.includes(eq.id)) return false
    if (filterPC && !eq.code?.toLowerCase().includes(filterPC.toLowerCase())) return false
    if (filterLab && String(eq.laboratory?.id ?? '') !== filterLab) return false
    if (filterType && String(eq.equipmentType?.id ?? '') !== filterType) return false
    if (
      equipSearch &&
      ![eq.assetTag, eq.brand, eq.model, eq.code].some(v =>
        v?.toLowerCase().includes(equipSearch.toLowerCase())
      )
    ) return false
    return true
  })

  const labOptions = [
    ...new Map(
      equipments.filter(eq => eq.laboratory).map(eq => [eq.laboratory.id, eq.laboratory])
    ).values(),
  ]

  const typeOptions = [
    ...new Map(
      equipments.filter(eq => eq.equipmentType).map(eq => [eq.equipmentType.id, eq.equipmentType])
    ).values(),
  ]

  const hasActiveFilters = equipSearch || filterPC || filterLab || filterType

  const clearFilters = () => {
    setEquipSearch('')
    setFilterPC('')
    setFilterLab('')
    setFilterType('')
  }

  const toggleEquipment = (eqId) => {
    setForm(prev => ({
      ...prev,
      equipmentIds: prev.equipmentIds.includes(eqId)
        ? prev.equipmentIds.filter(e => e !== eqId)
        : [...prev.equipmentIds, eqId],
    }))
  }

  const handleSubmit = async () => {
    setError('')
    if (!form.title.trim()) return setError('El título es obligatorio.')
    if (!form.maintenanceType) return setError('Selecciona el tipo de mantenimiento.')
    if (form.equipmentIds.length === 0) return setError('Selecciona al menos un equipo.')

    setSaving(true)
    try {
      await maintenanceApi.put(`/tickets/${id}`, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        maintenanceType: form.maintenanceType,
        priority: form.priority,
        createdByUserId: user?.id,
        equipmentIds: form.equipmentIds,
      })

      setSuccess('Caso actualizado correctamente. Volviendo…')
      setTimeout(() => navigate('/casos'), 1600)
    } catch (e) {
      setError(e.response?.data?.message ?? 'Error al actualizar el caso.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="ec-page">
        <div className="ec-loading">Cargando caso…</div>
      </div>
    )
  }

  return (
    <div className="ec-page">
      <div className="ec-header">
        <button className="ec-back" onClick={() => navigate('/casos')}>
          ← Volver a Casos
        </button>

        <h1 className="ec-title">Editar Caso</h1>
        <p className="ec-ticket-caption">CASO ID: {ticketNumber}</p>
      </div>

      {error && <div className="ec-alert ec-alert--error">⚠ {error}</div>}
      {success && <div className="ec-alert ec-alert--success">✓ {success}</div>}

      <div className="ec-body">
        <section className="ec-section">
          <div className="ec-section-header">
            <CaseIcon className="ec-section-icon" />
            <span>Información del caso</span>
          </div>

          <div className="ec-field">
            <label className="ec-label">Título *</label>
            <input
              className="ec-input"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Título del caso"
            />
          </div>

          <div className="ec-field">
            <label className="ec-label">Descripción</label>
            <textarea
              className="ec-textarea"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Describe el problema o el contexto del caso…"
            />
          </div>

          <div className="ec-row">
            <div className="ec-field">
              <label className="ec-label">Tipo de mantenimiento *</label>
              <div className="ec-select-wrap">
                <select
                  className="ec-select"
                  value={form.maintenanceType}
                  onChange={e => setForm({ ...form, maintenanceType: e.target.value })}
                >
                  <option value="">Seleccione…</option>
                  {MAINTENANCE_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <ChevronDown className="ec-chevron" />
              </div>
            </div>

            <div className="ec-field">
              <label className="ec-label">Prioridad *</label>
              <div className="ec-priority-group">
                {PRIORITIES.map(p => {
                  const c = PRIORITY_COLORS[p]
                  const sel = form.priority === p
                  return (
                    <button
                      key={p}
                      type="button"
                      className={`ec-priority-btn${sel ? ' is-selected' : ''}`}
                      onClick={() => setForm({ ...form, priority: p })}
                      style={sel ? {
                        background: c.bg,
                        color: c.color,
                        borderColor: c.border,
                      } : {}}
                    >
                      {p}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="ec-section">
          <div className="ec-section-header ec-section-header--spaced">
            <div className="ec-section-heading-inline">
              <EquipmentIcon className="ec-section-icon" />
              <span>Equipos involucrados</span>
            </div>

            {form.equipmentIds.length > 0 && (
              <span className="ec-count-badge">
                {form.equipmentIds.length} seleccionado{form.equipmentIds.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="ec-filters">
            <div className="ec-filter-search ec-filter-search--lg">
              <SearchIcon className="ec-filter-icon" />
              <input
                className="ec-filter-input"
                placeholder="Filtrar equipos..."
                value={equipSearch}
                onChange={e => setEquipSearch(e.target.value)}
              />
            </div>

            <div className="ec-filter-search ec-filter-search--sm">
              <EquipmentIcon className="ec-filter-icon" />
              <input
                className="ec-filter-input"
                placeholder="Código PC..."
                value={filterPC}
                onChange={e => setFilterPC(e.target.value)}
              />
            </div>

            <div className="ec-filter-select-wrap">
              <select
                className="ec-filter-select"
                value={filterLab}
                onChange={e => setFilterLab(e.target.value)}
              >
                <option value="">Todos los laboratorios</option>
                {labOptions.map(lab => (
                  <option key={lab.id} value={String(lab.id)}>
                    {lab.name}{lab.building ? ` — ${lab.building}` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="ec-filter-chevron" />
            </div>

            <div className="ec-filter-select-wrap">
              <select
                className="ec-filter-select"
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
              >
                <option value="">Todos los tipos</option>
                {typeOptions.map(t => (
                  <option key={t.id} value={String(t.id)}>{t.name}</option>
                ))}
              </select>
              <ChevronDown className="ec-filter-chevron" />
            </div>

            {hasActiveFilters && (
              <button type="button" className="ec-filter-clear" onClick={clearFilters}>
                Limpiar
              </button>
            )}
          </div>

          <div className="ec-equip-list">
            {available.length === 0 ? (
              <div className="ec-equip-empty">
                {hasActiveFilters
                  ? 'Ningún equipo coincide con los filtros aplicados.'
                  : 'No hay equipos disponibles para este caso.'}
              </div>
            ) : (
              available.map(eq => {
                const selected = form.equipmentIds.includes(eq.id)

                return (
                  <div
                    key={eq.id}
                    className={`ec-equip-row${selected ? ' ec-equip-row--selected' : ''}`}
                    onClick={() => toggleEquipment(eq.id)}
                  >
                    <div className={`ec-checkbox${selected ? ' ec-checkbox--checked' : ''}`}>
                      {selected && (
                        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M2 6l3 3 5-5" />
                        </svg>
                      )}
                    </div>

                    <div className="ec-equip-info">
                      <div className="ec-equip-mainline">
                        <span className="ec-equip-code">{eq.assetTag ?? eq.code ?? '—'}</span>
                        {eq.code && <span className="ec-equip-soft">{eq.code}</span>}
                      </div>

                      <div className="ec-equip-subline">
                        <span className="ec-equip-name">{eq.brand} {eq.model}</span>
                        {eq.serialNumber && (
                          <span className="ec-equip-detail">— SN: {eq.serialNumber}</span>
                        )}
                        {eq.laboratory?.name && (
                          <span className="ec-equip-detail">— {eq.laboratory.name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>

        <div className="ec-actions">
          <button className="ec-btn ec-btn--ghost" onClick={() => navigate('/casos')}>
            Cancelar
          </button>

          <button className="ec-btn ec-btn--primary" onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <><span className="ec-spinner" /> Guardando…</>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Guardar cambios
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}