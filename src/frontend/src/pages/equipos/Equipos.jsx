import { useState, useEffect, useCallback } from 'react'
import { equipmentApi, userApi, locationApi } from '../../services/api'
import { useNavigate } from 'react-router-dom'
import CustomSelect from '../../components/CustomSelect'

const STATUSES = ['Activo', 'En mantenimiento', 'Dado de baja']
const PAGE_SIZE = 10

export default function Equipos() {
  const navigate = useNavigate()
  const [equipments, setEquipments]   = useState([])
  const [laboratories, setLaboratories] = useState([])
  const [equipmentTypes, setEquipmentTypes] = useState([])
  const [laboratoristas, setLaboratoristas] = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [filterStatus, setFilterStatus]     = useState('')
  const [filterLaboratory, setFilterLaboratory] = useState('')
  const [filterLaboratorista, setFilterLaboratorista] = useState('')
  const [filterBrand, setFilterBrand] = useState('')
  const [filterType, setFilterType] = useState('')
  const [search, setSearch]           = useState('')
  const [page, setPage] = useState(1)

  // Cargar metadatos estáticos una sola vez al montar el componente
  useEffect(() => {
    let active = true
    async function loadMetadata() {
      try {
        const [labsRes, typesRes, usersRes] = await Promise.allSettled([
          locationApi.get('/laboratorios'),
          equipmentApi.get('/equipment-types'),
          userApi.get('/users'),
        ])

        if (!active) return

        if (labsRes.status === 'fulfilled') setLaboratories(labsRes.value.data ?? [])
        if (typesRes.status === 'fulfilled') setEquipmentTypes(typesRes.value.data ?? [])
        if (usersRes.status === 'fulfilled') {
          setLaboratoristas((usersRes.value.data ?? []).filter(u => u.role === 'Laboratorista' && u.isActive))
        }
      } catch (e) {
        console.error('Error al cargar metadatos:', e)
      }
    }
    loadMetadata()
    return () => { active = false }
  }, [])

  const load = useCallback(async (searchTerm = search) => {
    try {
      setLoading(true)
      setError('')

      const params = {}
      if (searchTerm) params.search = searchTerm

      const [eqRes, locationsRes] = await Promise.allSettled([
        equipmentApi.get('/equipments', { params }),
        locationApi.get('/equipment-locations'),
      ])

      if (eqRes.status !== 'fulfilled')               throw eqRes.reason
      if (locationsRes.status !== 'fulfilled')        throw locationsRes.reason

      const locationMap = new Map(
        (locationsRes.value.data ?? []).map(item => [item.equipmentId, item.laboratory])
      )

      setEquipments((eqRes.value.data ?? []).map(eq => ({
        ...eq,
        laboratory: locationMap.get(eq.id) ?? null,
      })))
    } catch (e) {
      setError(e.response?.data?.message ?? 'Error al cargar datos.')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [search, filterStatus, filterLaboratory, filterLaboratorista, filterBrand, filterType])

  const handleSearch = (e) => { e.preventDefault(); load(search) }

  // Calcular las marcas basadas en la lista completa (para que no desaparezcan al filtrar)
  const brands = Array.from(new Set(equipments.map(eq => eq.brand).filter(Boolean))).sort()

  // Filtrado del lado del cliente para marcas, tipos, laboratoristas y estados
  const displayed = equipments.filter(eq => {
    const matchStatus = !filterStatus || eq.status === filterStatus
    const matchLaboratory = !filterLaboratory || eq.laboratory?.id === filterLaboratory
    const matchBrand = !filterBrand || eq.brand === filterBrand
    const matchType = !filterType || eq.equipmentType?.id === filterType
    const matchLaboratorista = !filterLaboratorista || eq.laboratoristaUserId === filterLaboratorista
    return matchStatus && matchLaboratory && matchBrand && matchType && matchLaboratorista
  })
  const totalPages = Math.max(1, Math.ceil(displayed.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginated = displayed.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const laboratoristaOptions = [
    {
      value: '',
      label: 'Todos los laboratoristas',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle' }}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
      ),
      iconColor: '#64748b'
    },
    ...laboratoristas.map(u => ({
      value: u.id,
      label: u.fullName,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle' }}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
      ),
      iconColor: '#C0191F'
    }))
  ]

  const brandOptions = [
    {
      value: '',
      label: 'Todas las marcas',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle' }}>
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        </svg>
      ),
      iconColor: '#64748b'
    },
    ...brands.map(b => ({
      value: b,
      label: b,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle' }}>
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        </svg>
      ),
      iconColor: '#d97706'
    }))
  ]

  const typeOptions = [
    {
      value: '',
      label: 'Todos los tipos',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle' }}>
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        </svg>
      ),
      iconColor: '#64748b'
    },
    ...equipmentTypes.map(t => ({
      value: t.id,
      label: t.name,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle' }}>
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="12" y1="17" x2="12" y2="21" /><line x1="8" y1="21" x2="16" y2="21" />
        </svg>
      ),
      iconColor: '#2563eb'
    }))
  ]

  const statusOptions = [
    {
      value: '',
      label: 'Todos los estados',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle' }}>
          <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      ),
      iconColor: '#64748b'
    },
    {
      value: 'Activo',
      label: 'Activo',
      badgeColor: '#166534',
      badgeBg: '#dcfce7',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ verticalAlign: 'middle' }}>
          <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
        </svg>
      ),
      iconColor: '#166534'
    },
    {
      value: 'En mantenimiento',
      label: 'En mantenimiento',
      badgeColor: '#92400e',
      badgeBg: '#fef3c7',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ verticalAlign: 'middle' }}>
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      ),
      iconColor: '#92400e'
    },
    {
      value: 'Dado de baja',
      label: 'Dado de baja',
      badgeColor: '#991b1b',
      badgeBg: '#fee2e2',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ verticalAlign: 'middle' }}>
          <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      ),
      iconColor: '#991b1b'
    }
  ]

  const labOptions = [
    {
      value: '',
      label: 'Todos los laboratorios',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle' }}>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
      ),
      iconColor: '#64748b'
    },
    ...laboratories.map(l => ({
      value: l.id,
      label: `${l.name}${l.building ? ` - ${l.building}` : ''}${l.floor ? ` - ${l.floor}` : ''}`,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ verticalAlign: 'middle' }}>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
      ),
      iconColor: '#854d0e'
    }))
  ]

  return (
    <div className="equipos-container">
      <style>{`
        .equipos-container {
          padding: 2rem;
        }
        .filter-card {
          background: #ffffff;
          border-radius: 12px;
          padding: 1.25rem;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03);
          border: 1px solid #e5e7eb;
          margin-bottom: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .filter-row-1 {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
          align-items: center;
        }
        .filter-row-2 {
          display: flex;
          width: 100%;
        }
        .filter-input-wrapper {
          display: flex;
          align-items: center;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 0 0.75rem;
          gap: 0.5rem;
          flex: 2.5;
          min-width: 260px;
          transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
        }
        .filter-input-wrapper:focus-within {
          border-color: var(--color-primary, #C0191F);
          box-shadow: 0 0 0 1px var(--color-primary-highlight, rgba(192, 25, 31, 0.15));
        }
        .filter-select-wrapper {
          display: flex;
          align-items: center;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 0 0.5rem 0 0.75rem;
          gap: 0.5rem;
          min-width: 160px;
          flex: 1;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.02);
          transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
        }
        .filter-select-wrapper:focus-within {
          border-color: var(--color-primary, #C0191F);
          box-shadow: 0 0 0 1px var(--color-primary-highlight, rgba(192, 25, 31, 0.15));
        }
        .filter-select {
          border: none;
          background: transparent;
          width: 100%;
          outline: none;
          padding: 0.55rem 1.5rem 0.55rem 0;
          font-size: 0.85rem;
          color: #334155;
          cursor: pointer;
        }
        .equipos-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
          background: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
          border: 1px solid #e5e7eb;
        }
        .equipos-table th {
          background: #f8fafc;
          padding: 0.85rem 1rem;
          text-align: left;
          font-weight: 600;
          font-size: 0.75rem;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #e2e8f0;
        }
        .equipos-table td {
          padding: 1rem 1.25rem;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }
        .equipos-table tr:last-child td {
          border-bottom: none;
        }
        .badge-brand {
          display: inline-block;
          padding: 2px 8px;
          background-color: #eff6ff;
          color: #1d4ed8;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          margin-top: 4px;
        }
        .badge-status {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          text-align: center;
        }
        .badge-status-activo {
          background-color: #dcfce7;
          color: #166534;
        }
        .badge-status-mantenimiento {
          background-color: #fef3c7;
          color: #92400e;
        }
        .badge-status-baja {
          background-color: #fee2e2;
          color: #991b1b;
        }
        .action-btn {
          color: #64748b;
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          opacity: 0.8;
        }
        .action-btn:hover {
          color: var(--color-primary, #C0191F);
          transform: scale(1.15);
          opacity: 1;
        }
      `}</style>

      {/* ── Cabecera ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.875rem', fontWeight: '700', color: '#0f172a' }}>Gestión de Equipos</h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>Registro y control centralizado del inventario tecnológico institucional.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className="btn-secondary"
            onClick={() => navigate('/equipos/importar')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#334155',
              boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Importar CSV
          </button>
          <button
            className="btn-primary"
            onClick={() => navigate('/equipos/nuevo')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'var(--color-primary, #C0191F)',
              color: '#ffffff',
              borderRadius: '8px',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              border: 'none',
              boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease'
            }}
          >
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
      <div className="filter-card">
        <div className="filter-row-1">
          <form onSubmit={handleSearch} className="filter-input-wrapper">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              placeholder="Buscar por código, tag, marca, modelo, serie..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', padding: '0.6rem 0', fontSize: '0.875rem', color: '#1e293b' }}
            />
          </form>

          <div className="filter-select-wrapper" style={{ minWidth: '220px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a27b5c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
            <CustomSelect
              value={filterLaboratorista}
              onChange={setFilterLaboratorista}
              options={laboratoristaOptions}
              borderless
              showTriggerIcon={false}
            />
          </div>

          <div className="filter-select-wrapper">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" strokeLinecap="round" strokeWidth="3" />
            </svg>
            <CustomSelect
              value={filterBrand}
              onChange={setFilterBrand}
              options={brandOptions}
              borderless
              showTriggerIcon={false}
            />
          </div>

          <div className="filter-select-wrapper">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <CustomSelect
              value={filterType}
              onChange={setFilterType}
              options={typeOptions}
              borderless
              showTriggerIcon={false}
            />
          </div>

          <div className="filter-select-wrapper">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            <CustomSelect
              value={filterStatus}
              onChange={setFilterStatus}
              options={statusOptions}
              borderless
              showTriggerIcon={false}
            />
          </div>
        </div>

        <div className="filter-row-2">
          <div className="filter-select-wrapper" style={{ width: '100%' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#854d0e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <CustomSelect
              value={filterLaboratory}
              onChange={setFilterLaboratory}
              options={labOptions}
              borderless
              showTriggerIcon={false}
            />
          </div>
        </div>
      </div>

      {/* ── Tabla ── */}
      {loading ? <p>Cargando...</p> : (
        <div style={{ overflowX: 'auto' }}>
          <table className="equipos-table">
            <thead>
              <tr>
                <th style={{ width: '18%' }}>Código / AssetTag</th>
                <th style={{ width: '15%' }}>Tipo & Marca</th>
                <th style={{ width: '20%' }}>Modelo</th>
                <th style={{ width: '12%' }}>N° Serie</th>
                <th style={{ width: '20%' }}>Laboratorio / Laboratorista</th>
                <th style={{ textAlign: 'center', width: '10%' }}>Estado</th>
                <th style={{ textAlign: 'center', width: '5%' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(eq => {
                const statusClass = eq.status === 'Activo'
                  ? 'badge-status badge-status-activo'
                  : eq.status === 'En mantenimiento'
                    ? 'badge-status badge-status-mantenimiento'
                    : 'badge-status badge-status-baja';

                return (
                  <tr key={eq.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.925rem' }}>{eq.code}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{eq.assetTag}</div>
                    </td>
                    <td>
                      <div style={{ color: '#0f172a', fontWeight: 500 }}>{eq.equipmentType?.name}</div>
                      <div className="badge-brand">{eq.brand}</div>
                    </td>
                    <td>
                      <div style={{ color: '#0f172a', fontWeight: 500 }}>{eq.model}</div>
                    </td>
                    <td>
                      <span style={{ color: '#64748b', fontSize: '0.85rem' }}>{eq.serialNumber}</span>
                    </td>
                    <td>
                      <div style={{ color: '#0f172a', fontWeight: 500 }}>{eq.laboratory?.name ?? 'Sin asignar'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '2px' }}>
                        {eq.laboratoristaNombre ?? 'Sin asignar'}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={statusClass}>
                        {eq.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                        {/* Ver ficha */}
                        <button
                          onClick={() => navigate(`/equipos/${eq.id}/ficha`)}
                          title="Ver ficha técnica"
                          className="action-btn"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>
                          </svg>
                        </button>
                        {/* Hoja de vida */}
                        <button
                          onClick={() => navigate(`/equipos/${eq.id}/hoja-de-vida`)}
                          title="Ver hoja de vida"
                          className="action-btn"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                          </svg>
                        </button>
                        {/* Editar */}
                        <button
                          onClick={() => navigate(`/equipos/${eq.id}/editar`)}
                          title="Editar equipo"
                          className="action-btn"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {displayed.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                    No hay equipos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {displayed.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0.5rem', gap: '1rem', flexWrap: 'wrap' }}>
              <span style={{ color: '#64748b', fontSize: '0.875rem' }}>
                Mostrando {paginated.length} de {displayed.length} equipos registrados
              </span>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button
                  className="btn-secondary"
                  disabled={currentPage === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  style={{
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.85rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    background: '#fff',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    color: currentPage === 1 ? '#cbd5e1' : '#334155',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Anterior
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    style={{
                      padding: '0.4rem 0.8rem',
                      fontSize: '0.85rem',
                      borderRadius: '6px',
                      border: n === currentPage ? 'none' : '1px solid #e2e8f0',
                      background: n === currentPage ? 'var(--color-primary, #C0191F)' : '#fff',
                      color: n === currentPage ? '#fff' : '#334155',
                      fontWeight: n === currentPage ? '600' : '400',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {n}
                  </button>
                ))}
                <button
                  className="btn-secondary"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  style={{
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.85rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    background: '#fff',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    color: currentPage === totalPages ? '#cbd5e1' : '#334155',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
