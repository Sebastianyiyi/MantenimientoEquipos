import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { equipmentApi, locationApi } from '../../../services/api'
import '../../FormPage.css'

const STATUS_STYLE = {
  'Activo': { bg: '#dcfce7', color: '#166534' },
  'En mantenimiento': { bg: '#fef3c7', color: '#92400e' },
  'Dado de baja': { bg: '#fee2e2', color: '#991b1b' },
  'No Reparable': { bg: '#fce7f3', color: '#9d174d' },
  'En Pausa': { bg: '#e0e7ff', color: '#3730a3' },
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
    } catch {
      return []
    }
  }

  const getLifecycle = (purchaseDate) => {
    if (!purchaseDate) {
      return { text: 'Sin fecha registrada', color: '#6b7280', bg: '#f3f4f6' }
    }

    const years = (Date.now() - new Date(purchaseDate)) / (1000 * 60 * 60 * 24 * 365.25)

    return years < 3
      ? { text: 'VIGENTE', color: '#166534', bg: '#dcfce7' }
      : { text: 'REVISAR', color: '#991b1b', bg: '#fee2e2' }
  }

  const fmt = (d) =>
    d
      ? new Date(d).toLocaleDateString('es-EC', {
          year: 'numeric',
          month: 'long',
          day: '2-digit',
        })
      : '—'

  const sectionTitleStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.55rem',
    marginBottom: '0.9rem',
    color: '#9ca3af',
    fontSize: '0.72rem',
    fontWeight: 700,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
  }

  const cardStyle = {
    background: '#fff',
    border: '1px solid #ececec',
    borderRadius: '20px',
    padding: '1.9rem 2rem',
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.02)',
  }

  const infoGrid3 = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '2rem 2.25rem',
  }

  const infoGrid4 = {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: '2rem 1.75rem',
  }

  const infoGrid2 = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '2rem 2.5rem',
  }

  const labelStyle = {
    display: 'block',
    marginBottom: '0.45rem',
    fontSize: '0.68rem',
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: '#9ca3af',
  }

  const valueStyle = {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#111827',
    lineHeight: 1.35,
  }

  const subtleValueStyle = {
    ...valueStyle,
    color: '#9ca3af',
    fontStyle: 'italic',
    fontWeight: 500,
  }

  const actionBtn = {
    height: '42px',
    padding: '0 1rem',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    background: '#fff',
    color: '#4b5563',
    fontSize: '0.92rem',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.55rem',
    cursor: 'pointer',
  }

  const primaryBtn = {
    ...actionBtn,
    background: '#c81e3a',
    color: '#fff',
    border: '1px solid #c81e3a',
    boxShadow: '0 6px 18px rgba(200, 30, 58, 0.18)',
  }

  if (loading) {
    return (
      <div className="fp-page">
        <div className="fp-empty">Cargando ficha…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fp-page">
        <div className="fp-alert error">
          <span>⚠️</span> {error}
        </div>
      </div>
    )
  }

  const specs = parseSpecs(equipment.specificationsJson)
  const lifecycle = getLifecycle(equipment.purchaseDate)
  const statusStyle = STATUS_STYLE[equipment.status] ?? {
    bg: '#f3f4f6',
    color: '#374151',
  }

  return (
    <div
      className="fp-page"
      style={{
        width: '100%',
        maxWidth: '1120px',
        margin: '0 auto',
        padding: '2rem 1.25rem 3rem',
      }}
    >
      <div style={{ marginBottom: '1.25rem' }}>
        <button
          className="fp-back-btn"
          onClick={() => navigate('/equipos')}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#9ca3af',
            fontWeight: 600,
            padding: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: '1rem' }}></span>
          Volver a Equipos
        </button>
      </div>

      <div
        className="fp-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1.5rem',
          marginBottom: '2.2rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: '320px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem',
              flexWrap: 'wrap',
              color: '#9ca3af',
              fontSize: '0.78rem',
              marginBottom: '0.7rem',
            }}
          >
            <span>Gestión de Equipos</span>
            <span>›</span>
            <span>Ficha Técnica</span>
          </div>

          <h1
            className="fp-title"
            style={{
              margin: 0,
              fontSize: '3rem',
              lineHeight: 1.05,
              letterSpacing: '-0.04em',
              color: '#0f172a',
              fontWeight: 800,
            }}
          >
            {equipment.brand} {equipment.model}
          </h1>

          <p
            className="fp-subtitle"
            style={{
              marginTop: '0.55rem',
              marginBottom: 0,
              fontSize: '1.15rem',
              color: '#9ca3af',
            }}
          >
            Ficha técnica <span style={{ color: '#d1d5db' }}>—</span>{' '}
            <strong style={{ color: '#c81e3a', fontWeight: 700 }}>{equipment.code}</strong>
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'flex-end',
          }}
        >
          <button
            style={actionBtn}
            onClick={() => navigate(`/equipos/${id}/hoja-de-vida`)}
          >
            <span>📄</span>
            Hoja de Vida
          </button>

          <button
            style={actionBtn}
            onClick={() => window.print()}
          >
            <span>🖨️</span>
            Imprimir
          </button>

          <button
            style={primaryBtn}
            onClick={() => navigate(`/equipos/${id}/editar`)}
          >
            <span>✏️</span>
            Editar
          </button>
        </div>
      </div>

      <section style={{ marginBottom: '2.25rem' }}>
        <div style={sectionTitleStyle}>
          <span>🪪</span>
          <span>Identificación</span>
        </div>

        <div className="fp-card" style={cardStyle}>
          <div style={infoGrid3}>
            <div>
              <span style={labelStyle}>Código del sistema</span>
              <div style={{ ...valueStyle, color: '#c81e3a' }}>{equipment.code}</div>
            </div>

            <div>
              <span style={labelStyle}>AssetTag</span>
              <div style={valueStyle}>{equipment.assetTag || '—'}</div>
            </div>

            <div>
              <span style={labelStyle}>Tipo de equipo</span>
              <div style={valueStyle}>{equipment.equipmentType?.name || '—'}</div>
            </div>

            <div>
              <span style={labelStyle}>N° de Serie</span>
              <div style={valueStyle}>{equipment.serialNumber || '—'}</div>
            </div>

            <div>
              <span style={labelStyle}>Estado actual</span>
              <span
                className="fp-badge"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  height: '28px',
                  padding: '0 0.8rem',
                  borderRadius: '999px',
                  background: statusStyle.bg,
                  color: statusStyle.color,
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                }}
              >
                {String(equipment.status || '').toUpperCase()}
              </span>
            </div>

            <div>
              <span style={labelStyle}>Origen de registro</span>
              <div style={{ ...valueStyle, color: '#6b7280', fontWeight: 500 }}>
                {equipment.importSource || 'Manual'}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: '2.25rem' }}>
        <div style={sectionTitleStyle}>
          <span>📅</span>
          <span>Adquisición y ciclo de vida</span>
        </div>

        <div className="fp-card" style={cardStyle}>
          <div style={infoGrid4}>
            <div>
              <span style={labelStyle}>Fecha de compra</span>
              <div style={valueStyle}>{fmt(equipment.purchaseDate)}</div>
            </div>

            <div>
              <span style={labelStyle}>Registro en sistema</span>
              <div style={valueStyle}>{fmt(equipment.createdAt)}</div>
            </div>

            <div>
              <span style={labelStyle}>Vigencia</span>
              <span
                className="fp-badge"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  height: '28px',
                  padding: '0 0.8rem',
                  borderRadius: '999px',
                  background: lifecycle.bg,
                  color: lifecycle.color,
                  fontSize: '0.74rem',
                  fontWeight: 700,
                }}
              >
                {lifecycle.text}
              </span>
            </div>

            <div>
              <span style={labelStyle}>Última actualización</span>
              <div style={valueStyle}>{fmt(equipment.updatedAt)}</div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: '2.25rem' }}>
        <div style={sectionTitleStyle}>
          <span>📍</span>
          <span>Ubicación y responsable</span>
        </div>

        <div className="fp-card" style={cardStyle}>
          <div style={infoGrid2}>
            <div>
              <span style={labelStyle}>Laboratorista</span>
              <div style={equipment.laboratoristaNombre ? valueStyle : subtleValueStyle}>
                {equipment.laboratoristaNombre || 'Sin asignar'}
              </div>
            </div>

            <div>
              <span style={labelStyle}>Laboratorio</span>
              <div style={location?.laboratory?.name ? valueStyle : subtleValueStyle}>
                {location?.laboratory?.name || 'Sin asignar'}
              </div>
            </div>

            {location?.laboratory && (
              <>
                <div>
                  <span style={labelStyle}>Edificio</span>
                  <div style={valueStyle}>{location.laboratory.building || '—'}</div>
                </div>

                <div>
                  <span style={labelStyle}>Piso</span>
                  <div style={valueStyle}>{location.laboratory.floor || '—'}</div>
                </div>

                <div>
                  <span style={labelStyle}>Asignado desde</span>
                  <div style={valueStyle}>{fmt(location.assignedAt)}</div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {specs.length > 0 && (
        <section style={{ marginBottom: '2rem' }}>
          <div style={sectionTitleStyle}>
            <span>⚙️</span>
            <span>Especificaciones técnicas</span>
          </div>

          <div
            className="fp-card"
            style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}
          >
            <table
              className="fp-specs-table"
              style={{
                width: '100%',
                borderCollapse: 'collapse',
              }}
            >
              <tbody>
                {specs.map((s, i) => (
                  <tr key={i} style={{ borderTop: i === 0 ? 'none' : '1px solid #f1f5f9' }}>
                    <td
                      style={{
                        width: '34%',
                        padding: '1.15rem 1.6rem',
                        fontSize: '0.78rem',
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: '#9ca3af',
                        fontWeight: 700,
                      }}
                    >
                      {s.key}
                    </td>
                    <td
                      style={{
                        padding: '1.15rem 1.6rem',
                        fontSize: '0.98rem',
                        color: '#334155',
                        fontWeight: 600,
                      }}
                    >
                      {String(s.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div
        style={{
          marginTop: '2.8rem',
          paddingTop: '2rem',
          borderTop: '1px solid #ececec',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.9rem',
          flexWrap: 'wrap',
        }}
      >
        <button
          style={{
            ...actionBtn,
            minWidth: '96px',
            justifyContent: 'center',
          }}
          onClick={() => navigate('/equipos')}
        >
          Volver
        </button>

        <button
          style={{
            ...primaryBtn,
            minWidth: '170px',
            justifyContent: 'center',
          }}
          onClick={() => navigate(`/equipos/${id}/editar`)}
        >
          <span>✏️</span>
          Editar equipo
        </button>
      </div>
    </div>
  )
}