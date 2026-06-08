import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { equipmentApi, locationApi } from '../../../services/api'
import '../../FormPage.css'

const STATUS_STYLE = {
  'Activo':           { bg: '#dcfce7', color: '#166534' },
  'En mantenimiento': { bg: '#fef9c3', color: '#854d0e' },
  'Dado de baja':     { bg: '#fee2e2', color: '#991b1b' },
  'No Reparable':     { bg: '#fce7f3', color: '#9d174d' },
  'En Pausa':         { bg: '#e0e7ff', color: '#3730a3' },
}

export default function FichaEquipo() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [equipment, setEquipment] = useState(null)
  const [location, setLocation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const [eqRes, locRes] = await Promise.allSettled([
          equipmentApi.get(`/equipments/${id}`),
          locationApi.get(`/equipment-locations/current/${id}`),
        ])
        if (eqRes.status !== 'fulfilled') throw new Error('Equipo no encontrado')
        setEquipment(eqRes.value.data)
        if (locRes.status === 'fulfilled') setLocation(locRes.value.data)
      } catch {
        setError('No se pudo cargar la ficha del equipo.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const parseSpecs = (value) => {
    try {
      const parsed = JSON.parse(value || '{}')
      if (Array.isArray(parsed)) return parsed
      return Object.entries(parsed).map(([key, value]) => ({ key, value }))
    } catch { return [] }
  }

  const getLifecycle = (purchaseDate) => {
    if (!purchaseDate) return { text: 'Sin fecha registrada', color: '#6b7280', bg: '#f3f4f6' }
    const years = (Date.now() - new Date(purchaseDate)) / (1000 * 60 * 60 * 24 * 365.25)
    return years < 3
      ? { text: 'Vigente', color: '#166534', bg: '#dcfce7' }
      : { text: 'Fuera de ciclo / requiere revisión', color: '#991b1b', bg: '#fee2e2' }
  }

  const fmt = (d) => d ? new Date(d).toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: '2-digit' }) : '—'

  if (loading) return <div className="fp-page"><div className="fp-empty">Cargando ficha…</div></div>
  if (error)   return <div className="fp-page"><div className="fp-alert error"><span>⚠️</span> {error}</div></div>

  const specs = parseSpecs(equipment.specificationsJson)
  const lifecycle = getLifecycle(equipment.purchaseDate)
  const statusStyle = STATUS_STYLE[equipment.status] ?? { bg: '#f3f4f6', color: '#374151' }

  return (
    <div className="fp-page">
      {/* Cabecera */}
      <div className="fp-header" style={{ flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <button className="fp-back-btn" onClick={() => navigate('/equipos')}>
          ← Volver a Equipos
        </button>
        <div className="fp-heading" style={{ flex: 1 }}>
          <h1 className="fp-title">{equipment.brand} {equipment.model}</h1>
          <p className="fp-subtitle">Ficha técnica — {equipment.code}</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <button
            className="fp-btn btn-secondary"
            onClick={() => navigate(`/equipos/${id}/hoja-de-vida`)}
          >
            📋 Hoja de Vida
          </button>
          <button
            className="fp-btn btn-secondary"
            onClick={() => window.print()}
          >
            🖨️ Imprimir
          </button>
          <button
            className="fp-btn btn-primary"
            onClick={() => navigate(`/equipos/${id}/editar`)}
          >
            ✏️ Editar
          </button>
        </div>
      </div>

      {/* ── Identificación ── */}
      <div className="fp-card">
        <div className="fp-card-header">
          <span className="fp-card-icon">🏷️</span>
          <span className="fp-card-title">Identificación</span>
        </div>
        <div className="fp-card-body">
          <div className="fp-info-grid">
            <div className="fp-info-item">
              <span className="fp-info-label">Código del sistema</span>
              <span className="fp-info-value" style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem', color: 'var(--color-primary)' }}>
                {equipment.code}
              </span>
            </div>
            <div className="fp-info-item">
              <span className="fp-info-label">AssetTag</span>
              <span className="fp-info-value">{equipment.assetTag || '—'}</span>
            </div>
            <div className="fp-info-item">
              <span className="fp-info-label">Tipo de equipo</span>
              <span className="fp-info-value">{equipment.equipmentType?.name || '—'}</span>
            </div>
            <div className="fp-info-item">
              <span className="fp-info-label">N° de Serie</span>
              <span className="fp-info-value" style={{ fontFamily: 'monospace' }}>{equipment.serialNumber}</span>
            </div>
            <div className="fp-info-item">
              <span className="fp-info-label">Estado actual</span>
              <span className="fp-badge" style={{ background: statusStyle.bg, color: statusStyle.color, marginTop: 2 }}>
                {equipment.status}
              </span>
            </div>
            <div className="fp-info-item">
              <span className="fp-info-label">Origen de registro</span>
              <span className="fp-info-value">{equipment.importSource || 'Manual'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Adquisición ── */}
      <div className="fp-card">
        <div className="fp-card-header">
          <span className="fp-card-icon">📅</span>
          <span className="fp-card-title">Adquisición y ciclo de vida</span>
        </div>
        <div className="fp-card-body">
          <div className="fp-info-grid">
            <div className="fp-info-item">
              <span className="fp-info-label">Fecha de compra</span>
              <span className="fp-info-value">{fmt(equipment.purchaseDate)}</span>
            </div>
            <div className="fp-info-item">
              <span className="fp-info-label">Registro en sistema</span>
              <span className="fp-info-value">{fmt(equipment.createdAt)}</span>
            </div>
            <div className="fp-info-item">
              <span className="fp-info-label">Vigencia de mantenimiento</span>
              <span className="fp-badge" style={{ background: lifecycle.bg, color: lifecycle.color, marginTop: 2 }}>
                {lifecycle.text}
              </span>
            </div>
            <div className="fp-info-item">
              <span className="fp-info-label">Última actualización</span>
              <span className="fp-info-value">{fmt(equipment.updatedAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Ubicación y responsable ── */}
      <div className="fp-card">
        <div className="fp-card-header">
          <span className="fp-card-icon">📍</span>
          <span className="fp-card-title">Ubicación y responsable</span>
        </div>
        <div className="fp-card-body">
          <div className="fp-info-grid">
            <div className="fp-info-item">
              <span className="fp-info-label">Laboratorista</span>
              <span className="fp-info-value">{equipment.laboratoristaNombre || 'Sin asignar'}</span>
            </div>
            <div className="fp-info-item">
              <span className="fp-info-label">Laboratorio</span>
              <span className="fp-info-value">{location?.laboratory?.name || 'Sin asignar'}</span>
            </div>
            {location?.laboratory && (
              <>
                <div className="fp-info-item">
                  <span className="fp-info-label">Edificio</span>
                  <span className="fp-info-value">{location.laboratory.building || '—'}</span>
                </div>
                <div className="fp-info-item">
                  <span className="fp-info-label">Piso</span>
                  <span className="fp-info-value">{location.laboratory.floor || '—'}</span>
                </div>
                <div className="fp-info-item">
                  <span className="fp-info-label">Asignado desde</span>
                  <span className="fp-info-value">{fmt(location.assignedAt)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Especificaciones ── */}
      {specs.length > 0 && (
        <div className="fp-card">
          <div className="fp-card-header">
            <span className="fp-card-icon">🔧</span>
            <span className="fp-card-title">Especificaciones técnicas</span>
          </div>
          <div className="fp-card-body" style={{ padding: 0 }}>
            <table className="fp-specs-table">
              <tbody>
                {specs.map((s, i) => (
                  <tr key={i}>
                    <td>{s.key}</td>
                    <td>{s.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
