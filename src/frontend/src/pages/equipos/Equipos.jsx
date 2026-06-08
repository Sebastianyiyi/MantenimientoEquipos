import { useState, useEffect, useCallback } from 'react'
import { equipmentApi, userApi, locationApi } from '../../services/api'
import { useNavigate } from 'react-router-dom'

const STATUSES = ['Activo', 'En mantenimiento', 'Dado de baja']

export default function Equipos() {
  const navigate = useNavigate()
  const [equipments, setEquipments]   = useState([])
  const [laboratories, setLaboratories] = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [filterStatus, setFilterStatus]     = useState('')
  const [filterLaboratory, setFilterLaboratory] = useState('')
  const [search, setSearch]           = useState('')

  const load = useCallback(async (searchTerm = search) => {
    try {
      setLoading(true)
      setError('')

      const params = {}
      if (filterStatus) params.status = filterStatus
      if (searchTerm)   params.search = searchTerm

      const [eqRes, labsRes, currentLocationsRes] = await Promise.allSettled([
        equipmentApi.get('/equipments', { params }),
        locationApi.get('/laboratorios'),
        locationApi.get('/equipment-locations'),
      ])

      if (eqRes.status !== 'fulfilled')               throw eqRes.reason
      if (currentLocationsRes.status !== 'fulfilled') throw currentLocationsRes.reason

      const locationMap = new Map(
        (currentLocationsRes.value.data ?? []).map(item => [item.equipmentId, item.laboratory])
      )

      setEquipments(eqRes.value.data.map(eq => ({
        ...eq,
        laboratory: locationMap.get(eq.id) ?? null,
      })))

      if (labsRes.status === 'fulfilled') setLaboratories(labsRes.value.data)
    } catch (e) {
      setError(e.response?.data?.message ?? 'Error al cargar datos.')
    } finally {
      setLoading(false)
    }
  }, [filterStatus, search])

  useEffect(() => { load() }, [load])

  const handleSearch = (e) => { e.preventDefault(); load(search) }

  const displayed = filterLaboratory
    ? equipments.filter(eq => eq.laboratory?.id === filterLaboratory)
    : equipments

  return (
    <div style={{ padding: '2rem' }}>
      {/* ── Cabecera ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>Gestión de Equipos</h1>
          <p style={{ margin: 0, color: '#888' }}>Registro y control del inventario tecnológico</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn-secondary" onClick={() => navigate('/equipos/importar')}>
            Importar CSV
          </button>
          <button className="btn-primary" onClick={() => navigate('/equipos/nuevo')}>
            + Nuevo equipo
          </button>
        </div>
      </div>

      {error && (
        <div className="alert-error" style={{ marginBottom: '1rem' }}>
          {error}
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* ── Filtros ── */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: 260 }}>
          <input
            placeholder="Buscar por código, tag, marca, modelo, serie o laboratorista..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid #ddd' }}
          />
          <button type="submit" className="btn-secondary">Buscar</button>
        </form>

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #ddd', minWidth: 160 }}
        >
          <option value="">Todos los estados</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={filterLaboratory}
          onChange={e => setFilterLaboratory(e.target.value)}
          style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #ddd', minWidth: 200 }}
        >
          <option value="">Todos los laboratorios</option>
          {laboratories.map(l => (
            <option key={l.id} value={l.id}>
              {l.name}{l.building ? ` - ${l.building}` : ''}{l.floor ? ` - ${l.floor}` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* ── Tabla ── */}
      {loading ? <p>Cargando...</p> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <th style={th}>Código</th>
                <th style={th}>AssetTag</th>
                <th style={th}>Tipo</th>
                <th style={th}>Marca</th>
                <th style={th}>Modelo</th>
                <th style={th}>N° Serie</th>
                <th style={th}>Laboratorista</th>
                <th style={th}>Laboratorio</th>
                <th style={thC}>Estado</th>
                <th style={thC}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(eq => (
                <tr key={eq.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={td}>{eq.code}</td>
                  <td style={td}>{eq.assetTag}</td>
                  <td style={td}>{eq.equipmentType?.name}</td>
                  <td style={td}>{eq.brand}</td>
                  <td style={td}>{eq.model}</td>
                  <td style={td}>{eq.serialNumber}</td>
                  <td style={td}>{eq.laboratoristaNombre ?? 'Sin asignar'}</td>
                  <td style={td}>{eq.laboratory?.name ?? 'Sin asignar'}</td>
                  <td style={tdC}>
                    <span style={{
                      display: 'inline-block', padding: '0.2rem 0.5rem',
                      borderRadius: '4px', fontSize: '0.85rem', fontWeight: 500,
                      background: eq.status === 'Activo' ? '#dcfce7' : eq.status === 'En mantenimiento' ? '#fef9c3' : '#fee2e2',
                      color: '#111827'
                    }}>
                      {eq.status}
                    </span>
                  </td>
                  <td style={tdC}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem' }}>
                      {/* Ver ficha */}
                      <button
                        onClick={() => navigate(`/equipos/${eq.id}/ficha`)}
                        title="Ver ficha técnica"
                        style={iconBtn}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>
                        </svg>
                      </button>
                      {/* Hoja de vida */}
                      <button
                        onClick={() => navigate(`/equipos/${eq.id}/hoja-de-vida`)}
                        title="Ver hoja de vida"
                        style={iconBtn}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                        </svg>
                      </button>
                      {/* Editar */}
                      <button
                        onClick={() => navigate(`/equipos/${eq.id}/editar`)}
                        title="Editar equipo"
                        style={iconBtn}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {displayed.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                    No hay equipos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const th  = { padding: '0.75rem 1rem', textAlign: 'left',   fontWeight: 600, fontSize: '0.85rem' }
const thC = { padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, fontSize: '0.85rem' }
const td  = { padding: '0.75rem 1rem' }
const tdC = { padding: '0.75rem 1rem', textAlign: 'center' }

const iconBtn = {
  width: '36px', height: '36px',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  padding: 0, border: '1px solid #e5e7eb', borderRadius: '8px',
  background: '#fff', cursor: 'pointer', lineHeight: 0,
}
