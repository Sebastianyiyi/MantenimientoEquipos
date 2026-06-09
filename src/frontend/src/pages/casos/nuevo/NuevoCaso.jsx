import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { maintenanceApi, equipmentApi } from '../../../services/api'
import '../../FormPage.css'

const MAINTENANCE_TYPES = ['Correctivo', 'Preventivo', 'Adaptativo']
const PRIORITIES = ['Baja', 'Media', 'Alta']

export default function NuevoCaso() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [equipments, setEquipments] = useState([])
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [previewCode, setPreviewCode] = useState('')
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
    const loadData = async () => {
      try {
        const [tickRes, eqRes] = await Promise.allSettled([
          maintenanceApi.get('/tickets'),
          equipmentApi.get('/equipments'),
        ])
        const ticketsData = tickRes.status === 'fulfilled' ? tickRes.value.data : []
        const eqData = eqRes.status === 'fulfilled' ? eqRes.value.data : []

        setTickets(ticketsData)
        setEquipments(eqData)

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
    if (filterPC  && !eq.code?.toLowerCase().includes(filterPC.toLowerCase()))   return false
    if (filterLab && String(eq.laboratory?.id ?? '') !== filterLab)              return false
    if (filterType && String(eq.equipmentType?.id ?? '') !== filterType)         return false
    if (equipSearch && !([eq.assetTag, eq.brand, eq.model, eq.code]
      .some(v => v?.toLowerCase().includes(equipSearch.toLowerCase())))) return false
    return true
  })

  const toggleEquipment = (id) => {
    setForm(prev => ({
      ...prev,
      equipmentIds: prev.equipmentIds.includes(id)
        ? prev.equipmentIds.filter(e => e !== id)
        : [...prev.equipmentIds, id],
    }))
  }

  const hasFilters = equipSearch || filterPC || filterLab || filterType

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

  // Laboratorios y tipos únicos para los selects
  const labOptions = [...new Map(
    equipments.filter(eq => eq.laboratory).map(eq => [eq.laboratory.id, eq.laboratory])
  ).values()]

  const typeOptions = [...new Map(
    equipments.filter(eq => eq.equipmentType).map(eq => [eq.equipmentType.id, eq.equipmentType])
  ).values()]

  return (
    <div className="fp-page">
      {/* Cabecera */}
      <div className="fp-header">
        <button className="fp-back-btn" onClick={() => navigate('/casos')}>
          Volver a Casos
        </button>
        <div className="fp-heading">
          <h1 className="fp-title">Nuevo Caso de Mantenimiento</h1>
          <p className="fp-subtitle">Registra una orden de trabajo para los equipos afectados</p>
        </div>
      </div>

      {error   && <div className="fp-alert error"><span>⚠️</span> {error}</div>}
      {success && <div className="fp-alert success"><span>✓</span> {success}</div>}

      {loading ? (
        <div className="fp-empty">Cargando datos…</div>
      ) : (
        <>
          {/* ── Card: Información del caso ── */}
          <div className="fp-card">
            <div className="fp-card-header">
              <span className="fp-card-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                  <line x1="9" y1="12" x2="15" y2="12"/>
                  <line x1="9" y1="16" x2="15" y2="16"/>
                </svg>
              </span>
              <span className="fp-card-title">Información del caso</span>
            </div>

            <div className="fp-card-body">
              {/* Fila: Código + Título */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.5fr', gap: '16px 20px', marginBottom: 16 }}>
                <div className="fp-field">
                  <label className="fp-label">Código (autogenerado)</label>
                  <input className="fp-input fp-input-readonly" value={previewCode} readOnly />
                </div>
                <div className="fp-field">
                  <label className="fp-label">Título <span style={{ color: 'var(--color-primary)' }}>*</span></label>
                  <input
                    className="fp-input"
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder="Ej: Falla en proyector del Laboratorio A"
                  />
                </div>
              </div>

              {/* Descripción */}
              <div className="fp-field" style={{ marginBottom: 16 }}>
                <label className="fp-label">Descripción</label>
                <textarea
                  className="fp-textarea"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Descripción detallada del problema u objetivo del mantenimiento…"
                />
              </div>

              {/* Tipo + Prioridad */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 20px' }}>
                <div className="fp-field">
                  <label className="fp-label">Tipo de mantenimiento <span style={{ color: 'var(--color-primary)' }}>*</span></label>
                  <select
                    className="fp-select"
                    value={form.maintenanceType}
                    onChange={e => setForm({ ...form, maintenanceType: e.target.value })}
                  >
                    <option value="">Seleccione…</option>
                    {MAINTENANCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="fp-field">
                  <label className="fp-label">Prioridad</label>
                  <div className="fp-priority-group">
                    {PRIORITIES.map(p => (
                      <button
                        key={p}
                        type="button"
                        className={`fp-priority-btn ${form.priority === p ? `active-${p.toLowerCase()}` : ''}`}
                        onClick={() => setForm({ ...form, priority: p })}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Card: Equipos involucrados ── */}
          <div className="fp-card">
            <div className="fp-card-header">
              <span className="fp-card-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                  <line x1="8" y1="21" x2="16" y2="21"/>
                  <line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
              </span>
              <span className="fp-card-title">
                Equipos involucrados
                {form.equipmentIds.length > 0 && (
                  <span style={{ marginLeft: 8, fontSize: '0.78rem', fontWeight: 500, color: 'var(--color-primary)' }}>
                    {form.equipmentIds.length} seleccionado{form.equipmentIds.length !== 1 ? 's' : ''}
                  </span>
                )}
              </span>
            </div>

            <div className="fp-card-body" style={{ paddingBottom: 0 }}>
              {/* Filtros */}
              <div className="fp-filters">
                {/* Buscar AssetTag */}
                <div className="fp-filter-input-wrap">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input
                    placeholder="Buscar AssetTag…"
                    value={equipSearch}
                    onChange={e => setEquipSearch(e.target.value)}
                  />
                </div>

                {/* Filtrar código PC */}
                <div className="fp-filter-input-wrap">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                    <line x1="8" y1="21" x2="16" y2="21"/>
                    <line x1="12" y1="17" x2="12" y2="21"/>
                  </svg>
                  <input
                    placeholder="Filtrar código PC…"
                    value={filterPC}
                    onChange={e => setFilterPC(e.target.value)}
                  />
                </div>

                {/* Laboratorio */}
                <select
                  className={`fp-filter-select ${filterLab ? 'has-value' : ''}`}
                  value={filterLab}
                  onChange={e => setFilterLab(e.target.value)}
                >
                  <option value="">Laboratorios</option>
                  {labOptions.map(lab => (
                    <option key={lab.id} value={String(lab.id)}>
                      {lab.name}{lab.building ? ` — ${lab.building}` : ''}
                    </option>
                  ))}
                </select>

                {/* Tipo */}
                <select
                  className={`fp-filter-select ${filterType ? 'has-value' : ''}`}
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                >
                  <option value="">Tipos</option>
                  {typeOptions.map(t => (
                    <option key={t.id} value={String(t.id)}>{t.name}</option>
                  ))}
                </select>

                {hasFilters && (
                  <button
                    type="button"
                    className="fp-filter-clear"
                    onClick={() => { setEquipSearch(''); setFilterPC(''); setFilterLab(''); setFilterType('') }}
                  >
                    ✕ Limpiar
                  </button>
                )}
              </div>

              {/* Lista de equipos */}
              <div className="fp-equip-list" style={{ marginBottom: 4 }}>
                {available.length === 0 ? (
                  <div className="fp-empty">
                    {equipments.length === 0
                      ? 'No hay equipos en el sistema.'
                      : hasFilters
                        ? 'Ningún equipo coincide con los filtros aplicados.'
                        : 'No hay equipos disponibles (todos están en mantenimiento o dados de baja).'}
                  </div>
                ) : (
                  available.map(eq => {
                    const selected = form.equipmentIds.includes(eq.id)
                    return (
                      <div
                        key={eq.id}
                        className={`fp-equip-item ${selected ? 'selected' : ''}`}
                        onClick={() => toggleEquipment(eq.id)}
                      >
                        <input type="checkbox" checked={selected} readOnly />
                        {eq.equipmentType?.name && (
                          <span className="fp-equip-type-tag">{eq.equipmentType.name}</span>
                        )}
                        <span className="fp-equip-code">{eq.assetTag ?? '—'}</span>
                        <span className="fp-equip-name">
                          {eq.brand ?? '—'} {eq.model ?? ''}
                        </span>
                        {eq.code && (
                          <span className="fp-equip-pc-code">{eq.code}</span>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div className="fp-actions">
              <button className="fp-btn btn-secondary" type="button" onClick={() => navigate('/casos')}>
                Cancelar
              </button>
              <button className="fp-btn btn-primary" type="button" onClick={handleSubmit} disabled={saving}>
                {saving
                  ? <><span className="fp-btn-spinner" /> Creando…</>
                  : <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="8 12 11 15 16 9"/>
                      </svg>
                      Crear caso
                    </>
                }
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}