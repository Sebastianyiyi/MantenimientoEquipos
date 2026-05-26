import { useState, useEffect } from 'react'
import { maintenanceApi } from '../../services/api'

/**
 * HU-11: Registro de recursos (materiales, repuestos, herramientas) por equipo en el caso.
 *
 * Props:
 *   ticketEquipmentId  – Guid del TicketEquipment
 *   ticketStatus       – Estado del Ticket ("Abierto" | "En progreso" | "Cerrado")
 */
export default function TicketResources({ ticketEquipmentId, ticketStatus }) {
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Formulario agregar
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', description: '', quantity: 1 })
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState(null)

  // Edición inline
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', description: '', quantity: 1 })
  const [editError, setEditError] = useState(null)

  const isClosed = ticketStatus === 'Terminado'

  // ── Cargar recursos ────────────────────────────────────────────────────────
  const fetchResources = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await maintenanceApi.get(`/ticket-equipments/${ticketEquipmentId}/resources`)
      setResources(res.data)
    } catch {
      setError('No se pudo cargar la lista de recursos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (ticketEquipmentId) fetchResources()
  }, [ticketEquipmentId])

  // ── Agregar recurso ────────────────────────────────────────────────────────
  const handleAdd = async (e) => {
    e.preventDefault()
    setAddError(null)

    if (!addForm.name.trim()) {
      setAddError('El nombre del recurso es requerido.')
      return
    }
    if (Number(addForm.quantity) <= 0) {
      setAddError('La cantidad debe ser mayor a cero.')
      return
    }

    setAddLoading(true)
    try {
      await maintenanceApi.post(`/ticket-equipments/${ticketEquipmentId}/resources`, {
        name: addForm.name.trim(),
        description: addForm.description.trim() || null,
        quantity: Number(addForm.quantity),
      })
      setAddForm({ name: '', description: '', quantity: 1 })
      setShowAddForm(false)
      await fetchResources()
    } catch (err) {
      setAddError(err.response?.data?.message || 'Error al agregar el recurso.')
    } finally {
      setAddLoading(false)
    }
  }

  // ── Editar recurso ─────────────────────────────────────────────────────────
  const startEdit = (r) => {
    setEditingId(r.id)
    setEditForm({ name: r.name, description: r.description || '', quantity: r.quantity })
    setEditError(null)
  }

  const handleSaveEdit = async (resourceId) => {
    setEditError(null)
    if (!editForm.name.trim()) {
      setEditError('El nombre del recurso es requerido.')
      return
    }
    if (Number(editForm.quantity) <= 0) {
      setEditError('La cantidad debe ser mayor a cero.')
      return
    }
    try {
      const res = await maintenanceApi.put(
        `/ticket-equipments/${ticketEquipmentId}/resources/${resourceId}`,
        {
          name: editForm.name.trim(),
          description: editForm.description.trim() || null,
          quantity: Number(editForm.quantity),
        }
      )
      setResources(prev => prev.map(r => r.id === resourceId ? { ...r, ...res.data } : r))
      setEditingId(null)
    } catch (err) {
      setEditError(err.response?.data?.message || 'Error al guardar los cambios.')
    }
  }

  // ── Eliminar recurso ───────────────────────────────────────────────────────
  const handleDelete = async (resourceId) => {
    if (!confirm('¿Eliminar este recurso del caso?')) return
    try {
      await maintenanceApi.delete(`/ticket-equipments/${ticketEquipmentId}/resources/${resourceId}`)
      setResources(prev => prev.filter(r => r.id !== resourceId))
    } catch (err) {
      alert(err.response?.data?.message || 'Error al eliminar el recurso.')
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) return <p className="tr-status">Cargando recursos...</p>
  if (error) return <p className="tr-status tr-error">{error}</p>

  const total = resources.reduce((sum, r) => sum + r.quantity, 0)

  return (
    <div className="tr-container">
      <div className="tr-header">
        <div>
          <h3 className="tr-title">Recursos utilizados</h3>
          {resources.length > 0 && (
            <span className="tr-badge">Total: {total} unidades en {resources.length} recurso{resources.length !== 1 ? 's' : ''}</span>
          )}
        </div>
        {!isClosed && (
          <button className="tr-btn tr-btn-primary" onClick={() => { setShowAddForm(v => !v); setAddError(null) }}>
            {showAddForm ? 'Cancelar' : '+ Agregar Recurso'}
          </button>
        )}
      </div>

      {/* ── Formulario agregar ── */}
      {showAddForm && (
        <form className="tr-form" onSubmit={handleAdd}>
          <div className="tr-form-grid">
            <div className="tr-form-row tr-col-2">
              <label className="tr-label">Nombre / descripción *</label>
              <input
                className="tr-input"
                type="text"
                placeholder="Ej: Pasta térmica Arctic MX-4"
                value={addForm.name}
                onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="tr-form-row tr-col-1">
              <label className="tr-label">Cantidad *</label>
              <input
                className="tr-input"
                type="number"
                min="1"
                value={addForm.quantity}
                onChange={e => setAddForm(f => ({ ...f, quantity: e.target.value }))}
              />
            </div>

            <div className="tr-form-row tr-col-3">
              <label className="tr-label">Observación</label>
              <input
                className="tr-input"
                type="text"
                placeholder="Ej: Usado para mejorar la disipación térmica"
                value={addForm.description}
                onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>

          {addError && <p className="tr-error">{addError}</p>}

          <div className="tr-form-actions">
            <button type="submit" className="tr-btn tr-btn-primary" disabled={addLoading}>
              {addLoading ? 'Agregando...' : 'Agregar'}
            </button>
          </div>
        </form>
      )}

      {/* ── Tabla de recursos ── */}
      {resources.length === 0 ? (
        <p className="tr-empty">No hay recursos registrados para este equipo.</p>
      ) : (
        <table className="tr-table">
          <thead>
            <tr>
              <th>Recurso</th>
              <th>Observación</th>
              <th className="tr-center">Cantidad</th>
              {!isClosed && <th className="tr-center">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {resources.map(r => (
              <tr key={r.id}>
                {editingId === r.id ? (
                  // ── Fila en edición ──
                  <>
                    <td>
                      <input
                        className="tr-input tr-input-sm"
                        value={editForm.name}
                        onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                      />
                    </td>
                    <td>
                      <input
                        className="tr-input tr-input-sm"
                        value={editForm.description}
                        onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                      />
                    </td>
                    <td className="tr-center">
                      <input
                        className="tr-input tr-input-sm tr-input-qty"
                        type="number"
                        min="1"
                        value={editForm.quantity}
                        onChange={e => setEditForm(f => ({ ...f, quantity: e.target.value }))}
                      />
                    </td>
                    <td className="tr-center">
                      <div className="tr-row-actions">
                        <button className="tr-btn-sm tr-btn-primary" onClick={() => handleSaveEdit(r.id)}>
                          Guardar
                        </button>
                        <button className="tr-btn-sm tr-btn-secondary" onClick={() => { setEditingId(null); setEditError(null) }}>
                          Cancelar
                        </button>
                      </div>
                      {editError && <p className="tr-error tr-error-sm">{editError}</p>}
                    </td>
                  </>
                ) : (
                  // ── Fila normal ──
                  <>
                    <td className="tr-name">{r.name}</td>
                    <td className="tr-desc">{r.description || <span className="tr-none">—</span>}</td>
                    <td className="tr-center tr-qty">{r.quantity}</td>
                    {!isClosed && (
                      <td className="tr-center">
                        <div className="tr-row-actions">
                          <button className="tr-btn-sm tr-btn-secondary" onClick={() => startEdit(r)}>
                            Editar
                          </button>
                          <button className="tr-btn-sm tr-btn-danger" onClick={() => handleDelete(r.id)}>
                            Eliminar
                          </button>
                        </div>
                      </td>
                    )}
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <style>{`
        .tr-container { font-family: inherit; }
        .tr-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
        .tr-title { margin: 0 0 4px; font-size: 1rem; font-weight: 600; color: #1e293b; }
        .tr-badge { font-size: .78rem; color: #64748b; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 12px; padding: 2px 8px; }
        .tr-status { color: #64748b; font-size: .875rem; }
        .tr-error { color: #dc2626; font-size: .875rem; margin: 4px 0; }
        .tr-error-sm { font-size: .78rem; }
        .tr-empty { color: #94a3b8; font-size: .875rem; font-style: italic; }
        .tr-none { color: #cbd5e1; }
        .tr-form { background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
        .tr-form-grid { display: grid; grid-template-columns: 2fr 1fr 3fr; gap: 12px; }
        .tr-form-row { }
        .tr-label { display: block; font-size: .8rem; font-weight: 500; color: #475569; margin-bottom: 4px; }
        .tr-input { width: 100%; padding: 7px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: .875rem; font-family: inherit; box-sizing: border-box; }
        .tr-input-sm { padding: 5px 8px; font-size: .82rem; }
        .tr-input-qty { width: 70px; text-align: center; }
        .tr-form-actions { margin-top: 12px; }
        .tr-table { width: 100%; border-collapse: collapse; font-size: .875rem; }
        .tr-table th { background: #f1f5f9; color: #475569; font-weight: 600; padding: 8px 12px; text-align: left; border-bottom: 2px solid #e2e8f0; font-size: .8rem; text-transform: uppercase; letter-spacing: .03em; }
        .tr-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        .tr-table tr:last-child td { border-bottom: none; }
        .tr-table tr:hover td { background: #fafafa; }
        .tr-center { text-align: center; }
        .tr-name { font-weight: 500; color: #0f172a; }
        .tr-desc { color: #64748b; }
        .tr-qty { font-weight: 600; color: #2563eb; }
        .tr-row-actions { display: flex; gap: 6px; justify-content: center; }
        .tr-btn { padding: 7px 14px; border: none; border-radius: 6px; font-size: .875rem; cursor: pointer; font-weight: 500; }
        .tr-btn-primary { background: #2563eb; color: white; }
        .tr-btn-primary:hover { background: #1d4ed8; }
        .tr-btn-primary:disabled { background: #93c5fd; cursor: not-allowed; }
        .tr-btn-secondary { background: #e2e8f0; color: #475569; }
        .tr-btn-secondary:hover { background: #cbd5e1; }
        .tr-btn-sm { padding: 4px 10px; border: none; border-radius: 5px; font-size: .78rem; cursor: pointer; font-weight: 500; }
        .tr-btn-danger { background: #fee2e2; color: #dc2626; }
        .tr-btn-danger:hover { background: #fecaca; }
        @media (max-width: 640px) {
          .tr-form-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
