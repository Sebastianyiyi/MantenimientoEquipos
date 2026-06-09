import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { maintenanceApi, equipmentApi, locationApi } from '../../../services/api'
import '../../casos/editar/EditarCaso.css'

const MAINTENANCE_TYPES = ['Correctivo', 'Preventivo', 'Adaptativo']
const PRIORITIES = ['Baja', 'Media', 'Alta']

const PRIORITY_COLORS = {
  Alta:  { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
  Media: { bg: '#fef3c7', color: '#92400e', border: '#fcd34d' },
  Baja:  { bg: '#f0fdf4', color: '#166534', border: '#86efac' },
}

export default function NuevoCaso() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [equipments, setEquipments]   = useState([])
  const [tickets, setTickets]         = useState([])
  const [locationMap, setLocationMap] = useState({})
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState('')
  const [previewCode, setPreviewCode] = useState('')

  // Filtros
  const [equipSearch, setEquipSearch] = useState('')
  const [filterPC,    setFilterPC]    = useState('')
  const [filterLab,   setFilterLab]   = useState('')
  const [filterType,  setFilterType]  = useState('')

  const [form, setForm] = useState({
    title: '',
    description: '',
    maintenanceType: '',
    priority: 'Media',
    equipmentIds: [],
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        const [tickRes, eqRes, locRes] = await Promise.allSettled([
          maintenanceApi.get('/tickets'),
          equipmentApi.get('/equipments'),
          locationApi.get('/equipment-locations'),
        ])

        const ticketsData = tickRes.status === 'fulfilled' ? tickRes.value.data : []
        const eqData      = eqRes.status  === 'fulfilled' ? eqRes.value.data   : []

        setTickets(ticketsData)
        setEquipments(eqData)

        if (locRes.status === 'fulfilled') {
          const map = {}
          for (const loc of locRes.value.data) map[loc.equipmentId] = loc.laboratory
          setLocationMap(map)
        }

        // Preview del código
        const year = new Date().getFullYear()
        const countThisYear = ticketsData.filter(t => {
          const raw = String(t.createdAt ?? '').replace(/Z$/, '').replace(/[+-]\d{2}:\d{2}$/, '')
          return new Date(raw).getFullYear() === year
        }).length
        setPreviewCode(`CASE-${year}-${String(countThisYear + 1).padStart(4, '0')}`)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const occupiedIds = new Set(
    tickets
      .filter(t => t.status !== 'Terminado')
      .flatMap(t => t.equipmentIds ?? [])
  )

  const available = equipments.filter(eq => {
    if (eq.status !== 'Activo' || occupiedIds.has(eq.id)) return false
    if (filterPC   && !eq.code?.toLowerCase().includes(filterPC.toLowerCase()))  return false
    if (filterLab  && String(locationMap[eq.id]?.id ?? '') !== filterLab)        return false
    if (filterType && String(eq.equipmentType?.id ?? '') !== filterType)         return false
    if (equipSearch && !([eq.assetTag, eq.brand, eq.model, eq.code].some(
      v => v?.toLowerCase().includes(equipSearch.toLowerCase())
    ))) return false
    return true
  })

  const labOptions = [...new Map(
    Object.values(locationMap).filter(Boolean).map(lab => [lab.id, lab])
  ).values()].sort((a, b) => a.name.localeCompare(b.name))

  const typeOptions = [...new Map(
    equipments.filter(eq => eq.equipmentType).map(eq => [eq.equipmentType.id, eq.equipmentType])
  ).values()]

  const hasActiveFilters = equipSearch || filterPC || filterLab || filterType

  const clearFilters = () => {
    setEquipSearch(''); setFilterPC(''); setFilterLab(''); setFilterType('')
  }

  const toggleEquipment = (id) => {
    setForm(prev => ({
      ...prev,
      equipmentIds: prev.equipmentIds.includes(id)
        ? prev.equipmentIds.filter(e => e !== id)
        : [...prev.equipmentIds, id],
    }))
  }

  const handleSubmit = async () => {
    setError('')
    if (!form.title.trim())             return setError('El título es obligatorio.')
    if (!form.maintenanceType)          return setError('Selecciona el tipo de mantenimiento.')
    if (form.equipmentIds.length === 0) return setError('Selecciona al menos un equipo involucrado.')

    setSaving(true)
    try {
      const res = await maintenanceApi.post('/tickets', {
        title: form.title.trim(),
        description: form.description.trim() || null,
        maintenanceType: form.maintenanceType,
        priority: form.priority,
        createdByUserId: user?.id,
        equipmentIds: form.equipmentIds,
      })

      await Promise.allSettled(
        form.equipmentIds.map(eqId =>
          equipmentApi.patch(`/equipments/${eqId}/status`, { status: 'En mantenimiento' })
        )
      )

      setSuccess(`Caso ${res.data.ticketNumber} creado correctamente. Redirigiendo…`)
      setTimeout(() => navigate('/casos'), 1800)
    } catch (e) {
      setError(e.response?.data?.message ?? 'Error al crear el caso.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="ec-page">
      <div className="ec-loading">Cargando datos…</div>
    </div>
  )

  return (
    <div className="ec-page">
      {/* ── Header ── */}
      <div className="ec-header">
        <button className="ec-back" onClick={() => navigate('/casos')}>
          ← Volver a Casos
        </button>
        <h1 className="ec-title">Nuevo Caso de Mantenimiento</h1>
        <p className="ec-subtitle">Registra una orden de trabajo para los equipos afectados</p>
      </div>

      {error   && <div className="ec-alert ec-alert--error">⚠ {error}</div>}
      {success && <div className="ec-alert ec-alert--success">✓ {success}</div>}

      <div className="ec-body">

        {/* ── Sección: Información del caso ── */}
        <section className="ec-section">
          <div className="ec-section-header">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M5 4h-1a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2h-1"/></svg>
            <span>Información del caso</span>
          </div>

          {/* Código autogenerado */}
          <div className="ec-field">
            <label className="ec-label">Código del caso (autogenerado)</label>
            <input className="ec-input ec-input--readonly" value={previewCode} readOnly />
          </div>

          <div className="ec-field">
            <label className="ec-label">Título *</label>
            <input
              className="ec-input"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Ej: Falla en proyector del Laboratorio A"
            />
          </div>

          <div className="ec-field">
            <label className="ec-label">Descripción</label>
            <textarea
              className="ec-textarea"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Descripción detallada del problema u objetivo del mantenimiento…"
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
                  {MAINTENANCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <svg className="ec-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
              </div>
            </div>

            <div className="ec-field">
              <label className="ec-label">Prioridad</label>
              <div className="ec-priority-group">
                {PRIORITIES.map(p => {
                  const c = PRIORITY_COLORS[p]
                  const sel = form.priority === p
                  return (
                    <button
                      key={p}
                      type="button"
                      className="ec-priority-btn"
                      onClick={() => setForm({ ...form, priority: p })}
                      style={sel ? {
                        background: c.bg,
                        color: c.color,
                        border: `1.5px solid ${c.border}`,
                        fontWeight: 600,
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

        {/* ── Sección: Equipos involucrados ── */}
        <section className="ec-section">
          <div className="ec-section-header ec-section-header--spaced">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
              <span>Equipos involucrados</span>
            </div>
            {form.equipmentIds.length > 0 && (
              <span className="ec-count-badge">
                {form.equipmentIds.length} seleccionado{form.equipmentIds.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* ── Filtros ── */}
          <div className="ec-filters">
            <div className="ec-filter-search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <input
                className="ec-filter-input"
                placeholder="Buscar por AssetTag, marca o modelo…"
                value={equipSearch}
                onChange={e => setEquipSearch(e.target.value)}
              />
            </div>

            <div className="ec-filter-search ec-filter-search--sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
              <input
                className="ec-filter-input"
                placeholder="Código PC…"
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
              <svg className="ec-filter-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
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
              <svg className="ec-filter-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
            </div>

            {hasActiveFilters && (
              <button type="button" className="ec-filter-clear" onClick={clearFilters}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                Limpiar
              </button>
            )}
          </div>

          {/* Equipment list */}
          <div className="ec-equip-list">
            {available.length === 0 ? (
              <div className="ec-equip-empty">
                {equipments.length === 0
                  ? 'No hay equipos en el sistema.'
                  : hasActiveFilters
                    ? 'Ningún equipo coincide con los filtros aplicados.'
                    : 'No hay equipos disponibles (todos están en mantenimiento o dados de baja).'}
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
                          <path d="M2 6l3 3 5-5"/>
                        </svg>
                      )}
                    </div>
                    <div className="ec-equip-info">
                      {eq.equipmentType?.name && (
                        <span className="ec-equip-type-badge">{eq.equipmentType.name}</span>
                      )}
                      <span className="ec-equip-code">{eq.assetTag ?? eq.code ?? '—'}</span>
                      <span className="ec-equip-tag">{eq.brand} {eq.model}</span>
                      <span className="ec-equip-detail">
                        {eq.code}
                        {locationMap[eq.id]?.name && ` · ${locationMap[eq.id].name}`}
                        {eq.serialNumber && ` · SN: ${eq.serialNumber}`}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>

        {/* ── Footer actions ── */}
        <div className="ec-actions">
          <button className="ec-btn ec-btn--ghost" onClick={() => navigate('/casos')}>
            Cancelar
          </button>
          <button className="ec-btn ec-btn--primary" onClick={handleSubmit} disabled={saving}>
            {saving
              ? <><span className="ec-spinner" /> Creando…</>
              : <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg> Crear caso</>
            }
          </button>
        </div>

      </div>
    </div>
  )
}