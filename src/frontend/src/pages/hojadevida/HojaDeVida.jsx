import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { maintenanceApi, equipmentApi, userApi } from '../../services/api'
import BackButton from '../../components/BackButton'
import './HojaDeVida.css'

const TIPO_COLOR = {
  Correctivo: { bg: '#fef2f2', color: '#b91c1c' },
  Preventivo: { bg: '#ecfdf5', color: '#047857' },
  Adaptativo: { bg: '#eff6ff', color: '#1d4ed8' },
}

const STATUS_COLOR = {
  Terminado: { bg: '#ecfdf5', color: '#047857' },
  'En Proceso': { bg: '#fffbeb', color: '#b45309' },
  Pendiente: { bg: '#f3f4f6', color: '#374151' },
}

const SEVERITY_COLOR = {
  Alta: { bg: '#fef2f2', color: '#b91c1c' },
  Media: { bg: '#fffbeb', color: '#b45309' },
  Baja: { bg: '#ecfdf5', color: '#047857' },
}

function Badge({ text, style = {} }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.22rem 0.7rem',
        borderRadius: '9999px',
        fontSize: '0.72rem',
        fontWeight: 700,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {text}
    </span>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="hdv-stat-card">
      <p className="hdv-stat-value">{value}</p>
      <p className="hdv-stat-label">{label}</p>
    </div>
  )
}

function CasoCard({ caso, usuariosMap, equipment, showBaja }) {
  const [expanded, setExpanded] = useState(false)

  const tipoStyle = TIPO_COLOR[caso.maintenanceType] ?? { bg: '#f3f4f6', color: '#374151' }
  const statStyle = STATUS_COLOR[caso.ticketStatus] ?? { bg: '#f3f4f6', color: '#374151' }

  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString('es-EC', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      })
      : '—'

  const resolveName = (userId) =>
    usuariosMap[userId] ?? `Usuario (${String(userId).slice(0, 8)}...)`

  return (
    <div className="hdv-caso-card">
      <div className="hdv-timeline-marker">
        <div className="hdv-timeline-dot" style={{ background: tipoStyle.color }} />
        <div className="hdv-timeline-line" />
      </div>

      <div className="hdv-caso-body">
        <div className="hdv-caso-header" onClick={() => setExpanded(e => !e)}>
          <div className="hdv-caso-header-left">
            <span className="hdv-caso-number">{caso.ticketNumber}</span>
            <Badge text={caso.maintenanceType} style={{ background: tipoStyle.bg, color: tipoStyle.color }} />
            <Badge text={caso.ticketStatus} style={{ background: statStyle.bg, color: statStyle.color }} />
            {equipment?.status === 'Dado de baja' && showBaja && (
              <Badge text="Baja" style={{ background: '#fef2f2', color: '#b91c1c' }} />
            )}
          </div>

          <div className="hdv-caso-header-right">
            <span className="hdv-caso-date">
              {formatDate(caso.fechaInicio)}
              {caso.fechaCierre ? ` → ${formatDate(caso.fechaCierre)}` : ''}
            </span>
            <span className="hdv-expand-icon">{expanded ? '▲' : '▼'}</span>
          </div>
        </div>

        <p className="hdv-caso-title">{caso.title}</p>

        <div className="hdv-caso-stats">
          <span>👤 {caso.totalTecnicos} técnico{caso.totalTecnicos !== 1 ? 's' : ''}</span>
          <span>🔧 {caso.totalActividades} actividad{caso.totalActividades !== 1 ? 'es' : ''}</span>
          <span>🔍 {caso.totalDiagnosticos} diagnóstico{caso.totalDiagnosticos !== 1 ? 's' : ''}</span>
          <span>📦 {caso.totalRecursos} recurso{caso.totalRecursos !== 1 ? 's' : ''}</span>
        </div>

        {expanded && (
          <div className="hdv-caso-detail">
            {caso.tecnicos.length > 0 && (
              <section className="hdv-detail-section">
                <h4>Técnicos que intervinieron</h4>
                <div className="hdv-technicians">
                  {caso.tecnicos.map((t) => (
                    <div key={t.technicianUserId} className="hdv-technician-item">
                      <div className="hdv-technician-avatar">
                        {resolveName(t.technicianUserId).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="hdv-technician-name">{resolveName(t.technicianUserId)}</p>
                        {t.activityDescription && (
                          <p className="hdv-technician-desc">{t.activityDescription}</p>
                        )}
                        {t.observations && (
                          <p className="hdv-technician-obs">
                            <em>Obs: {t.observations}</em>
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {caso.actividades.length > 0 && (
              <section className="hdv-detail-section">
                <h4>Actividades realizadas</h4>
                <ul className="hdv-item-list">
                  {caso.actividades.map((a) => (
                    <li key={a.id}>
                      <span className="hdv-item-name">{a.activityName}</span>
                      <Badge
                        text={a.activityCategory}
                        style={{ background: tipoStyle.bg, color: tipoStyle.color, marginLeft: 6 }}
                      />
                      {a.activityDescription && (
                        <p className="hdv-item-desc">{a.activityDescription}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {caso.diagnosticos.length > 0 && (
              <section className="hdv-detail-section">
                <h4>Diagnósticos identificados</h4>
                <ul className="hdv-item-list">
                  {caso.diagnosticos.map((d) => {
                    const sevStyle = SEVERITY_COLOR[d.diagnosisSeverity] ?? { bg: '#f3f4f6', color: '#374151' }
                    return (
                      <li key={d.id}>
                        <span className="hdv-item-name">{d.diagnosisName}</span>
                        <Badge
                          text={d.diagnosisSeverity}
                          style={{ background: sevStyle.bg, color: sevStyle.color, marginLeft: 6 }}
                        />
                        {d.diagnosisDescription && (
                          <p className="hdv-item-desc">{d.diagnosisDescription}</p>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}

            {caso.recursos.length > 0 && (
              <section className="hdv-detail-section">
                <h4>Recursos utilizados</h4>
                <table className="hdv-resources-table">
                  <thead>
                    <tr>
                      <th>Recurso</th>
                      <th>Cantidad</th>
                      <th>Descripción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {caso.recursos.map((r) => (
                      <tr key={r.id}>
                        <td>{r.name}</td>
                        <td>{r.quantity}</td>
                        <td>{r.description ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {caso.tecnicos.length === 0 &&
              caso.actividades.length === 0 &&
              caso.diagnosticos.length === 0 &&
              caso.recursos.length === 0 && (
                <p className="hdv-empty-detail">
                  Este caso aún no tiene detalle registrado (técnicos, actividades, diagnósticos ni recursos).
                </p>
              )}

            {equipment?.status === 'Dado de baja' && equipment?.bajaMotivo && caso.showBaja && (
              <section className="hdv-detail-section">
                <h4 style={{ color: '#b91c1c' }}>Equipo dado de baja en este mantenimiento</h4>
                <div className="hdv-baja-box">
                  <strong>Motivo:</strong> {equipment.bajaMotivo}
                  {equipment.bajaAt && (
                    <span className="hdv-baja-date">
                      · {new Date(equipment.bajaAt).toLocaleDateString('es-EC', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function HojaDeVida() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [equipment, setEquipment] = useState(null)
  const [hojaDeVida, setHojaDeVida] = useState(null)
  const [usuariosMap, setUsuariosMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return

    const fetchAll = async () => {
      setLoading(true)
      setError('')

      try {
        const [eqRes, hdvRes] = await Promise.all([
          equipmentApi.get(`/equipments/${id}`),
          maintenanceApi.get(`/equipments/${id}/hoja-de-vida`),
        ])

        setEquipment(eqRes.data)
        setHojaDeVida(hdvRes.data)

        const userIds = [
          ...new Set(
            hdvRes.data.historia.flatMap(h =>
              h.tecnicos.map(t => t.technicianUserId)
            )
          )
        ]

        if (userIds.length > 0) {
          try {
            const usersRes = await userApi.get('/users')
            const map = {}
            usersRes.data.forEach(u => {
              map[u.id] = u.fullName ?? u.email ?? u.id
            })
            setUsuariosMap(map)
          } catch (error) {
            console.error(error)
          }
        }
      } catch (err) {
        if (err.response?.status === 404) {
          setHojaDeVida({
            resumen: { totalCasos: 0, totalActividades: 0, totalRecursos: 0 },
            historia: [],
          })
        } else {
          setError('No se pudo cargar la hoja de vida. Intenta nuevamente.')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
  }, [id])

  const handleExport = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="hdv-page">
        <div className="hdv-loading">
          <div className="hdv-spinner" />
          <p>Cargando hoja de vida…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="hdv-page">
        <BackButton to="/equipos" label="Volver a Equipos" />
        <div className="hdv-error">
          <p>{error}</p>
        </div>
      </div>
    )
  }

  const resumen = hojaDeVida?.resumen
  const historia = hojaDeVida?.historia ?? []

  return (
    <div className="hdv-page">
      <BackButton to="/equipos" label="Volver a Equipos" />
      <div className="hdv-topbar">
        <div className="hdv-topbar-left">
          <div>
            <h1 className="hdv-title">Hoja de Vida del Equipo</h1>
            <p className="hdv-subtitle">Historial técnico consolidado del activo institucional</p>
          </div>
        </div>
        <button className="hdv-export-btn" onClick={handleExport}>
          ↓ Exportar historial
        </button>
      </div>

      {equipment && (
        <section className="hdv-hero">
          <div className="hdv-hero-code">{equipment.code}</div>
          <div className="hdv-hero-main">
            <h2 className="hdv-hero-name">
              {equipment.brand} {equipment.model}
            </h2>
            <p className="hdv-hero-type">{equipment.equipmentType?.name}</p>
            <div className="hdv-hero-meta">
              <span>Serie <strong>{equipment.serialNumber}</strong></span>
              <span>Estado <strong>{equipment.status}</strong></span>
              {equipment.laboratoristaNombre && (
                <span>Responsable <strong>{equipment.laboratoristaNombre}</strong></span>
              )}
              {equipment.purchaseDate && (
                <span>
                  Compra{' '}
                  <strong>
                    {new Date(equipment.purchaseDate).toLocaleDateString('es-EC')}
                  </strong>
                </span>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="hdv-stats">
        <StatCard label="Casos registrados" value={resumen?.totalCasos ?? 0} />
        <StatCard label="Actividades realizadas" value={resumen?.totalActividades ?? 0} />
        <StatCard label="Recursos utilizados" value={resumen?.totalRecursos ?? 0} />
        <StatCard
          label="Último mantenimiento"
          value={
            resumen?.ultimoMantenimiento
              ? new Date(resumen.ultimoMantenimiento).toLocaleDateString('es-EC', {
                year: 'numeric',
                month: 'short',
                day: '2-digit',
              })
              : '—'
          }
        />
      </section>

      <section className="hdv-history">
        <div className="hdv-section-head">
          <h3>Línea de tiempo de intervenciones</h3>
          <p>Casos ordenados del más reciente al más antiguo.</p>
        </div>

        {historia.length === 0 ? (
          <div className="hdv-empty">
            <span className="hdv-empty-icon">🔍</span>
            <p>Este equipo no tiene casos registrados aún.</p>
          </div>
        ) : (
          <div className="hdv-timeline">
            {historia.map((caso, idx) => (
              <CasoCard
                key={caso.ticketId}
                caso={caso}
                usuariosMap={usuariosMap}
                equipment={equipment}
                showBaja={idx === 0}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}