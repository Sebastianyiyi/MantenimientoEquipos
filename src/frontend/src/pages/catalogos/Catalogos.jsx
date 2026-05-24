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
  const [equipmentTypes, setEquipmentTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', building: '', floor: '' })
  const [capacityRows, setCapacityRows] = useState([])
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

  const loadEquipmentTypes = async () => {
    try {
      const res = await equipmentApi.get('/equipment-types')
      setEquipmentTypes(res.data)
    } catch {
      setEquipmentTypes([])
    }
  }

  useEffect(() => {
    load()
    loadEquipmentTypes()
  }, [])

  const openNew = () => {
    setEditing(null)
    setForm({ name: '', building: '', floor: '' })
    setCapacityRows([{ equipmentTypeId: '', maxCapacity: '' }])
    setShowForm(true)
  }

  const openEdit = async (item) => {
    setEditing(item)
    setForm({
      name: item.name,
      building: item.building ?? '',
      floor: item.floor ?? ''
    })

    setFormLoading(true)
    setShowForm(true)

    try {
      const res = await locationApi.get(`/laboratorios/${item.id}`)
      const capacities = res.data.capacities ?? res.data.Capacities ?? []

      setCapacityRows(
        capacities.length
          ? capacities.map(c => ({
            capacityId: c.id,
            equipmentTypeId: c.equipmentTypeId,
            equipmentTypeName: c.equipmentTypeName ?? '',
            maxCapacity: c.maxCapacity
          }))
          : [{ equipmentTypeId: '', maxCapacity: '' }]
      )
    } catch {
      setCapacityRows([{ equipmentTypeId: '', maxCapacity: '' }])
    } finally {
      setFormLoading(false)
    }
  }

  const addCapacityRow = () => {
    setCapacityRows(prev => [...prev, { equipmentTypeId: '', maxCapacity: '' }])
  }

  const updateCapacityRow = (index, field, value) => {
    setCapacityRows(prev =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    )
  }

  const removeCapacityRow = (index) => {
    setCapacityRows(prev => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!form.name.trim()) return alert('El nombre es obligatorio.')

    const cleanedRows = capacityRows
      .map(r => ({
        equipmentTypeId: r.equipmentTypeId,
        maxCapacity: Number(r.maxCapacity),
        equipmentTypeName:
          equipmentTypes.find(t => t.id === r.equipmentTypeId)?.name ??
          r.equipmentTypeName ??
          ''
      }))
      .filter(r => r.equipmentTypeId && Number.isFinite(r.maxCapacity) && r.maxCapacity > 0)

    if (cleanedRows.length === 0) {
      return alert('Agrega al menos una capacidad válida.')
    }

    const duplicatedTypes = cleanedRows
      .map(r => r.equipmentTypeId)
      .filter((id, idx, arr) => arr.indexOf(id) !== idx)

    if (duplicatedTypes.length > 0) {
      return alert('No repitas el mismo tipo de equipo en dos filas.')
    }

    setSaving(true)
    try {
      if (editing) {
        await locationApi.put(`/laboratorios/${editing.id}`, {
          ...form,
          capacity: 0
        })

        const current = await locationApi.get(`/laboratorios/${editing.id}`)
        const existingCapacities = current.data.capacities ?? current.data.Capacities ?? []
        const existingMap = new Map(
          existingCapacities.map(c => [c.equipmentTypeId.toLowerCase(), c])
        )

        for (const row of cleanedRows) {
          const existing = existingMap.get(row.equipmentTypeId.toLowerCase())

          if (existing) {
            await locationApi.put(
              `/laboratorios/${editing.id}/capacidades/${existing.id}`,
              {
                equipmentTypeName: row.equipmentTypeName,
                maxCapacity: row.maxCapacity
              }
            )
          } else {
            await locationApi.post(`/laboratorios/${editing.id}/capacidades`, {
              equipmentTypeId: row.equipmentTypeId,
              equipmentTypeName: row.equipmentTypeName,
              maxCapacity: row.maxCapacity
            })
          }
        }
      } else {
        const labRes = await locationApi.post('/laboratorios', {
          ...form,
          capacity: 0
        })

        const labId = labRes.data.id

        for (const row of cleanedRows) {
          await locationApi.post(`/laboratorios/${labId}/capacidades`, {
            equipmentTypeId: row.equipmentTypeId,
            equipmentTypeName: row.equipmentTypeName,
            maxCapacity: row.maxCapacity
          })
        }
      }

      setShowForm(false)
      await load()
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
          <div className="cat-modal cat-modal-wide">
            <h4>{editing ? 'Editar Laboratorio' : 'Nuevo Laboratorio'}</h4>

            {formLoading && <p className="cat-loading">Cargando capacidades...</p>}

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

            <div className="capacity-block">
              <div className="capacity-block-header">
                <h5>Capacidades por tipo</h5>
                <button className="btn-secondary" onClick={addCapacityRow} type="button">
                  + Agregar tipo
                </button>
              </div>

              {capacityRows.map((row, idx) => (
                <div className="capacity-row" key={row.capacityId ?? idx}>
                  <div>
                    <label>Tipo de equipo</label>
                    <select
                      value={row.equipmentTypeId}
                      onChange={e => updateCapacityRow(idx, 'equipmentTypeId', e.target.value)}
                    >
                      <option value="">Selecciona uno</option>
                      {equipmentTypes.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label>Capacidad máxima</label>
                    <input
                      type="number"
                      min={1}
                      value={row.maxCapacity}
                      onChange={e => updateCapacityRow(idx, 'maxCapacity', e.target.value)}
                      placeholder="Ej: 10"
                    />
                  </div>

                  <div className="capacity-row-actions">
                    <label className="sr-only">Eliminar fila</label>
                    <button
                      className="btn-danger"
                      onClick={() => removeCapacityRow(idx)}
                      type="button"
                      disabled={capacityRows.length === 1}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowForm(false)} type="button">
                Cancelar
              </button>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={saving || formLoading}
                type="button"
              >
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