import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { maintenanceApi, equipmentApi } from '../../../services/api'
import '../../FormPage.css'

const MAINTENANCE_TYPES = ['Correctivo', 'Preventivo', 'Adaptativo']
const PRIORITIES = ['Baja', 'Media', 'Alta']

const PRIORITY_STYLE = {
  Alta:  { bg: '#fee2e2', color: '#991b1b' },
  Media: { bg: '#fef9c3', color: '#854d0e' },
  Baja:  { bg: '#f0fdf4', color: '#166534' },
}

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

  // Equipos disponibles (no en tickets activos)
  const occupiedIds = new Set(
    tickets
      .filter(t => t.status !== 'Terminado')
      .flatMap(t => t.equipmentIds ?? [])
  )
  const available = equipments.filter(eq =>
    eq.status === 'Activo' && !occupiedIds.has(eq.id) && (
      !equipSearch ||
      eq.assetTag?.toLowerCase().includes(equipSearch.toLowerCase()) ||
      eq.brand?.toLowerCase().includes(equipSearch.toLowerCase()) ||
      eq.model?.toLowerCase().includes(equipSearch.toLowerCase()) ||
      eq.code?.toLowerCase().includes(equipSearch.toLowerCase())
    )
  )

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

      // Cambiar estado de equipos a "En mantenimiento"
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

  return (
    <div className="fp-page">
      {/* Cabecera */}
      <div className="fp-header">
        <button className="fp-back-btn" onClick={() => navigate('/casos')}>
          ← Volver a Casos
        </button>
        <div className="fp-heading">
          <h1 className="fp-title">Nuevo Caso de Mantenimiento</h1>
          <p className="fp-subtitle">Registra una orden de trabajo para los equipos afectados</p>
        </div>
      </div>

      {error   && <div className="fp-alert error">  <span>⚠️</span> {error}</div>}
      {success && <div className="fp-alert success"><span>✓</span>  {success}</div>}

      {loading ? (
        <div className="fp-empty">Cargando datos…</div>
      ) : (
        <>
          {/* ── Datos del caso ── */}
          <div className="fp-card">
            <div className="fp-card-header">
              <span className="fp-card-icon">📋</span>
              <span className="fp-card-title">Información del caso</span>
            </div>
            <div className="fp-card-body">
              <div className="fp-grid-2" style={{ marginBottom: 'var(--space-4)' }}>
                <div className="fp-field">
                  <label className="fp-label">Código del caso (autogenerado)</label>
                  <input className="fp-input fp-input-readonly" value={previewCode} readOnly />
                </div>
                <div className="fp-field" />
              </div>

              <div className="fp-field fp-span-2" style={{ marginBottom: 'var(--space-4)' }}>
                <label className="fp-label">Título *</label>
                <input
                  className="fp-input"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="Ej: Falla en proyector del Laboratorio A"
                />
              </div>

              <div className="fp-field" style={{ marginBottom: 'var(--space-4)' }}>
                <label className="fp-label">Descripción</label>
                <textarea
                  className="fp-textarea"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Descripción detallada del problema u objetivo del mantenimiento…"
                />
              </div>

              <div className="fp-grid-2">
                <div className="fp-field">
                  <label className="fp-label">Tipo de mantenimiento *</label>
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
                  <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 4 }}>
                    {PRIORITIES.map(p => {
                      const s = PRIORITY_STYLE[p]
                      const selected = form.priority === p
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setForm({ ...form, priority: p })}
                          style={{
                            flex: 1,
                            padding: '0.45rem',
                            borderRadius: 'var(--radius-md)',
                            border: `2px solid ${selected ? s.color : 'var(--color-border)'}`,
                            background: selected ? s.bg : 'var(--color-surface)',
                            color: selected ? s.color : 'var(--color-text-muted)',
                            fontWeight: selected ? 700 : 400,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            transition: 'all var(--transition)',
                          }}
                        >
                          {p}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Equipos involucrados ── */}
          <div className="fp-card">
            <div className="fp-card-header">
              <span className="fp-card-icon">🖥️</span>
              <span className="fp-card-title">
                Equipos involucrados
                {form.equipmentIds.length > 0 && (
                  <span style={{ marginLeft: 8, fontSize: '0.8rem', fontWeight: 400, color: 'var(--color-primary)' }}>
                    {form.equipmentIds.length} seleccionado{form.equipmentIds.length !== 1 ? 's' : ''}
                  </span>
                )}
              </span>
            </div>
            <div className="fp-card-body" style={{ paddingBottom: 0 }}>
              {/* Búsqueda de equipos */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                padding: 'var(--space-2) var(--space-3)',
                border: '1.5px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--space-3)',
                background: 'var(--color-bg)',
              }}>
                <span>🔍</span>
                <input
                  style={{ border: 'none', background: 'transparent', outline: 'none', flex: 1, fontSize: '0.875rem' }}
                  placeholder="Filtrar por código, tag, marca o modelo…"
                  value={equipSearch}
                  onChange={e => setEquipSearch(e.target.value)}
                />
              </div>

              <div className="fp-equip-list" style={{ marginBottom: 'var(--space-5)' }}>
                {available.length === 0 ? (
                  <div className="fp-empty">
                    {equipments.length === 0
                      ? 'No hay equipos en el sistema.'
                      : equipSearch
                        ? 'Ningún equipo coincide con la búsqueda.'
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
                        <div className="fp-equip-name">
                          <strong>{eq.code}</strong>
                          {eq.assetTag && <> · {eq.assetTag}</>}
                          {' — '}
                          {eq.brand} {eq.model}
                          {eq.serialNumber && <span> · {eq.serialNumber}</span>}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div className="fp-actions">
              <button className="fp-btn btn-secondary" onClick={() => navigate('/casos')}>Cancelar</button>
              <button className="fp-btn btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? <><span className="fp-btn-spinner" /> Creando…</> : '✓ Crear caso'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
