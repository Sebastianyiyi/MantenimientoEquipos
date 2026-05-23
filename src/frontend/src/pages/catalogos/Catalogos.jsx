import { useState, useEffect } from 'react'
import { equipmentApi, locationApi } from '../../services/api'
import './Catalogos.css'

export default function Catalogos() {
  const [tab, setTab] = useState('tipos')

  return (
    <div className="catalogos">
      <h2>Gestión de Catálogos</h2>
      <p className="catalogos-subtitle">Administración de catálogos del sistema</p>

      <div className="catalogos-tabs">
        <button
          className={`tab-btn ${tab === 'tipos' ? 'active' : ''}`}
          onClick={() => setTab('tipos')}
          type="button"
        >
          Tipos de Equipo
        </button>
        <button
          className={`tab-btn ${tab === 'laboratorios' ? 'active' : ''}`}
          onClick={() => setTab('laboratorios')}
          type="button"
        >
          Laboratorios
        </button>
      </div>

      <div className="catalogos-content">
        {tab === 'tipos' && <TiposEquipo />}
        {tab === 'laboratorios' && <Laboratorios />}
      </div>
    </div>
  )
}

/* ─── Tipos de Equipo ─────────────────────────────────────────── */
function TiposEquipo() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const load = async () => {
    try {
      setLoading(true)
      const res = await equipmentApi.get('/equipment-types')
      setItems(res.data)
    } catch {
      setError('Error al cargar tipos de equipo')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const openNew = () => {
    setEditing(null)
    setForm({ name: '', description: '' })
    setShowForm(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    setForm({ name: item.name, description: item.description ?? '' })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return alert('El nombre es obligatorio.')
    setSaving(true)
    try {
      if (editing) {
        await equipmentApi.put(`/equipment-types/${editing.id}`, form)
      } else {
        await equipmentApi.post('/equipment-types', form)
      }
      setShowForm(false)
      load()
    } catch (e) {
      alert(e.response?.data?.message ?? 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const requestDelete = (item) => {
    setDeleteTarget(item)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await equipmentApi.delete(`/equipment-types/${deleteTarget.id}`)
      setDeleteTarget(null)
      load()
    } catch (e) {
      alert(e.response?.data?.message ?? 'Error al eliminar')
    }
  }

  const cancelDelete = () => {
    setDeleteTarget(null)
  }

  if (loading) return <p className="cat-loading">Cargando...</p>
  if (error) return <p className="cat-error">{error}</p>

  return (
    <div className="cat-section">
      <div className="cat-header">
        <div>
          <h3>Tipos de Equipo</h3>
          <p>Categorías de equipos disponibles en el sistema</p>
        </div>
        <button className="btn-primary" onClick={openNew} type="button">
          + Agregar Tipo
        </button>
      </div>

      <table className="cat-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Nombre</th>
            <th>Descripción</th>
            <th>Equipos</th>
            <th className="cat-actions-header">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={item.id}>
              <td>{i + 1}</td>
              <td>{item.name}</td>
              <td>{item.description ?? '—'}</td>
              <td>{item.equipmentCount}</td>
              <td className="cat-actions">
                <div className="table-actions">
                  <button
                    className="action-icon-btn"
                    onClick={() => openEdit(item)}
                    title="Editar"
                    type="button"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </button>

                  <button
                    className="action-icon-btn"
                    onClick={() => requestDelete(item)}
                    title="Eliminar"
                    type="button"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}

          {items.length === 0 && (
            <tr>
              <td colSpan={5} className="cat-empty">No hay tipos registrados.</td>
            </tr>
          )}
        </tbody>
      </table>

      {showForm && (
        <div className="cat-modal-overlay">
          <div className="cat-modal">
            <h4>{editing ? 'Editar Tipo de Equipo' : 'Nuevo Tipo de Equipo'}</h4>

            <label>Nombre *</label>
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: Laptop"
            />

            <label>Descripción</label>
            <input
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Descripción opcional"
            />

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowForm(false)} type="button">
                Cancelar
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={saving} type="button">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="cat-modal-overlay">
          <div className="cat-modal cat-confirm-modal">
            <h4>Eliminar tipo de equipo</h4>
            <p>
              ¿Seguro que deseas eliminar <strong>{deleteTarget.name}</strong>?
            </p>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={cancelDelete} type="button">
                Cancelar
              </button>
              <button className="btn-danger" onClick={confirmDelete} type="button">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Laboratorios ────────────────────────────────────────────── */
function Laboratorios() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', building: '', floor: '', capacity: 0 })
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const load = async () => {
    try {
      setLoading(true)
      const res = await locationApi.get('/laboratorios')
      setItems(res.data)
    } catch {
      setError('Error al cargar laboratorios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const openNew = () => {
    setEditing(null)
    setForm({ name: '', building: '', floor: '', capacity: 0 })
    setShowForm(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    setForm({
      name: item.name,
      building: item.building ?? '',
      floor: item.floor ?? '',
      capacity: item.capacity
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return alert('El nombre es obligatorio.')
    setSaving(true)
    try {
      const payload = { ...form, capacity: Number(form.capacity) }
      if (editing) {
        await locationApi.put(`/laboratorios/${editing.id}`, payload)
      } else {
        await locationApi.post('/laboratorios', payload)
      }
      setShowForm(false)
      load()
    } catch (e) {
      alert(e.response?.data?.message ?? 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const requestDelete = (item) => {
    setDeleteTarget(item)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await locationApi.delete(`/laboratorios/${deleteTarget.id}`)
      setDeleteTarget(null)
      load()
    } catch (e) {
      alert(e.response?.data?.message ?? 'Error al eliminar')
    }
  }

  const cancelDelete = () => {
    setDeleteTarget(null)
  }

  if (loading) return <p className="cat-loading">Cargando...</p>
  if (error) return <p className="cat-error">{error}</p>

  return (
    <div className="cat-section">
      <div className="cat-header">
        <div>
          <h3>Laboratorios</h3>
          <p>Ubicaciones físicas donde se encuentran los equipos</p>
        </div>
        <button className="btn-primary" onClick={openNew} type="button">
          + Agregar Laboratorio
        </button>
      </div>

      <table className="cat-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Nombre</th>
            <th>Edificio</th>
            <th>Piso</th>
            <th>Capacidad</th>
            <th className="cat-actions-header">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={item.id}>
              <td>{i + 1}</td>
              <td>{item.name}</td>
              <td>{item.building ?? '—'}</td>
              <td>{item.floor ?? '—'}</td>
              <td>{item.capacity}</td>
              <td className="cat-actions">
                <div className="table-actions">
                  <button
                    className="action-icon-btn"
                    onClick={() => openEdit(item)}
                    title="Editar"
                    type="button"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </button>

                  <button
                    className="action-icon-btn"
                    onClick={() => requestDelete(item)}
                    title="Eliminar"
                    type="button"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}

          {items.length === 0 && (
            <tr>
              <td colSpan={6} className="cat-empty">No hay laboratorios registrados.</td>
            </tr>
          )}
        </tbody>
      </table>

      {showForm && (
        <div className="cat-modal-overlay">
          <div className="cat-modal">
            <h4>{editing ? 'Editar Laboratorio' : 'Nuevo Laboratorio'}</h4>

            <label>Nombre *</label>
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: Laboratorio de Redes"
            />

            <label>Edificio</label>
            <input
              value={form.building}
              onChange={e => setForm({ ...form, building: e.target.value })}
              placeholder="Ej: Edificio Principal FISEI"
            />

            <label>Piso</label>
            <input
              value={form.floor}
              onChange={e => setForm({ ...form, floor: e.target.value })}
              placeholder="Ej: Piso 3"
            />

            <label>Capacidad</label>
            <input
              type="number"
              value={form.capacity}
              onChange={e => setForm({ ...form, capacity: e.target.value })}
              min={0}
            />

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowForm(false)} type="button">
                Cancelar
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={saving} type="button">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="cat-modal-overlay">
          <div className="cat-modal cat-confirm-modal">
            <h4>Eliminar laboratorio</h4>
            <p>
              ¿Seguro que deseas eliminar <strong>{deleteTarget.name}</strong>?
            </p>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={cancelDelete} type="button">
                Cancelar
              </button>
              <button className="btn-danger" onClick={confirmDelete} type="button">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}