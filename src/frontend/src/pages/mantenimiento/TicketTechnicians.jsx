import { useState, useEffect } from 'react'
import { maintenanceApi } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

/**
 * HU-09: Gestión de técnicos asignados a un equipo dentro de un caso.
 *
 * Props:
 *   ticketEquipmentId  – Guid del TicketEquipment
 *   ticketStatus       – Estado del Ticket ("Abierto" | "En progreso" | "Cerrado")
 *   availableTechnicians – [{ id: Guid, name: string }] lista de técnicos del sistema
 */
export default function TicketTechnicians({ ticketEquipmentId, ticketStatus, availableTechnicians = [] }) {
  const { user } = useAuth()
  const [technicians, setTechnicians] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Formulario para agregar nuevo técnico
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({ technicianUserId: '', activityDescription: '', observations: '' })
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState(null)

  // Buscador de técnico
  const [techSearch, setTechSearch] = useState('')
  const [techDropdownOpen, setTechDropdownOpen] = useState(false)

  // Edición inline de notas de un técnico
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ activityDescription: '', observations: '' })

  // Modal confirmación quitar técnico
  const [removeConfirm, setRemoveConfirm] = useState(null) // { id, name }

 const isClosed = ticketStatus === 'Terminado'

  // ── Cargar técnicos asignados ──────────────────────────────────────────────
  const fetchTechnicians = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await maintenanceApi.get(`/ticket-equipments/${ticketEquipmentId}/technicians`)
      setTechnicians(res.data)
    } catch (err) {
      setError('No se pudo cargar la lista de técnicos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (ticketEquipmentId) fetchTechnicians()
  }, [ticketEquipmentId])

  // ── Asignar técnico ────────────────────────────────────────────────────────
  const handleAdd = async (e) => {
    e.preventDefault()
    if (!addForm.technicianUserId) {
      setAddError('Debes seleccionar un técnico.')
      return
    }
    setAddLoading(true)
    setAddError(null)
    try {
      await maintenanceApi.post(`/ticket-equipments/${ticketEquipmentId}/technicians`, {
        technicianUserId: addForm.technicianUserId,
        activityDescription: addForm.activityDescription || null,
        observations: addForm.observations || null,
      })
      setAddForm({ technicianUserId: '', activityDescription: '', observations: '' })
      setTechSearch('')
      setShowAddForm(false)
      await fetchTechnicians()
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al asignar el técnico.'
      setAddError(msg)
    } finally {
      setAddLoading(false)
    }
  }

  // ── Quitar técnico ─────────────────────────────────────────────────────────
  const handleRemove = async (technicianId) => {
    const tech = technicians.find(t => t.id === technicianId)
    setRemoveConfirm({ id: technicianId, name: getName(tech?.technicianUserId) })
  }

  const confirmarRemove = async () => {
    const { id } = removeConfirm
    setRemoveConfirm(null)
    try {
      await maintenanceApi.delete(`/ticket-equipments/${ticketEquipmentId}/technicians/${id}`)
      setTechnicians(prev => prev.filter(t => t.id !== id))
    } catch (err) {
      alert(err.response?.data?.message || 'Error al quitar al técnico.')
    }
  }

  // ── Guardar notas del técnico ──────────────────────────────────────────────
  const startEdit = (t) => {
    setEditingId(t.id)
    setEditForm({ activityDescription: t.activityDescription || '', observations: t.observations || '' })
  }

  const handleSaveNotes = async (technicianId) => {
    try {
      const res = await maintenanceApi.put(
        `/ticket-equipments/${ticketEquipmentId}/technicians/${technicianId}`,
        editForm
      )
      setTechnicians(prev => prev.map(t => t.id === technicianId ? { ...t, ...res.data } : t))
      setEditingId(null)
    } catch (err) {
      alert(err.response?.data?.message || 'Error al guardar las notas.')
    }
  }

  // ── IDs ya asignados para filtrar el selector ──────────────────────────────
  const assignedIds = new Set(technicians.map(t => t.technicianUserId))
  const availableToAdd = availableTechnicians.filter(t => !assignedIds.has(t.id))

  // ── Helpers de nombre ──────────────────────────────────────────────────────
  const getName = (userId) => {
    const found = availableTechnicians.find(t => t.id === userId)
    return found ? found.name : userId
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) return <p className="tt-status">Cargando técnicos...</p>
  if (error) return <p className="tt-status tt-error">{error}</p>

  return (
    <div className="tt-container">
      <div className="tt-header">
        <h3 className="tt-title">Técnicos asignados</h3>
        {!isClosed && availableToAdd.length > 0 && (
          <button className="tt-btn tt-btn-primary" onClick={() => setShowAddForm(v => !v)}>
            {showAddForm ? 'Cancelar' : '+ Nuevo'}
          </button>
        )}
      </div>

      {/* ── Formulario agregar técnico ── */}
      {showAddForm && (
        <form className="tt-form" onSubmit={handleAdd}>
          <div className="tt-form-row">
            <label className="tt-label">Técnico *</label>
            <div className="tt-search-wrapper">
              <input
                className="tt-search-input"
                type="text"
                placeholder="Buscar laboratorista por nombre…"
                value={techSearch}
                autoComplete="off"
                onChange={e => {
                  setTechSearch(e.target.value)
                  setTechDropdownOpen(true)
                  if (!e.target.value) setAddForm(f => ({ ...f, technicianUserId: '' }))
                }}
                onFocus={() => setTechDropdownOpen(true)}
                onBlur={() => setTimeout(() => setTechDropdownOpen(false), 150)}
              />
              {techDropdownOpen && techSearch.trim() && (() => {
                const filtered = availableToAdd.filter(t =>
                  t.name.toLowerCase().includes(techSearch.toLowerCase())
                )
                return filtered.length > 0 ? (
                  <ul className="tt-dropdown">
                    {filtered.map(t => (
                      <li
                        key={t.id}
                        className="tt-dropdown-item"
                        onMouseDown={() => {
                          setAddForm(f => ({ ...f, technicianUserId: t.id }))
                          setTechSearch(t.name)
                          setTechDropdownOpen(false)
                        }}
                      >
                        <span className="tt-dropdown-avatar">{t.name.charAt(0).toUpperCase()}</span>
                        {t.name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul className="tt-dropdown">
                    <li className="tt-dropdown-empty">Sin resultados para "{techSearch}"</li>
                  </ul>
                )
              })()}
              {addForm.technicianUserId && (
                <span className="tt-selected-badge">✓ Seleccionado</span>
              )}
            </div>
          </div>

          <div className="tt-form-row">
            <label className="tt-label">Descripción de actividades</label>
            <textarea
              className="tt-textarea"
              rows={3}
              placeholder="Describe las actividades que realizará..."
              value={addForm.activityDescription}
              onChange={e => setAddForm(f => ({ ...f, activityDescription: e.target.value }))}
            />
          </div>

          <div className="tt-form-row">
            <label className="tt-label">Observaciones</label>
            <textarea
              className="tt-textarea"
              rows={2}
              placeholder="Observaciones adicionales..."
              value={addForm.observations}
              onChange={e => setAddForm(f => ({ ...f, observations: e.target.value }))}
            />
          </div>

          {addError && <p className="tt-error">{addError}</p>}

          <div className="tt-form-actions">
            <button type="submit" className="tt-btn tt-btn-primary" disabled={addLoading}>
              {addLoading ? 'Asignando...' : 'Asignar Técnico'}
            </button>
          </div>
        </form>
      )}

      {/* ── Lista de técnicos ── */}
      {technicians.length === 0 ? (
        <p className="tt-empty">No hay técnicos asignados a este equipo.</p>
      ) : (
        <ul className="tt-list">
          {technicians.map(t => (
            <li key={t.id} className="tt-item">
              <div className="tt-item-header">
                <span className="tt-name">{getName(t.technicianUserId)}</span>
                <div className="tt-item-actions">
                  {!isClosed && editingId !== t.id && t.technicianUserId === user?.id && (
                    <button className="tt-btn-sm tt-btn-secondary" onClick={() => startEdit(t)}>
                      Editar mis notas
                    </button>
                  )}
                  {!isClosed && (
                    <button className="tt-btn-sm tt-btn-danger" onClick={() => handleRemove(t.id)}>
                      Quitar
                    </button>
                  )}
                </div>
              </div>

              {/* Modo edición inline */}
              {editingId === t.id ? (
                <div className="tt-edit-area">
                  <label className="tt-label">Actividades realizadas</label>
                  <textarea
                    className="tt-textarea"
                    rows={3}
                    value={editForm.activityDescription}
                    onChange={e => setEditForm(f => ({ ...f, activityDescription: e.target.value }))}
                  />
                  <label className="tt-label" style={{ marginTop: 8 }}>Observaciones</label>
                  <textarea
                    className="tt-textarea"
                    rows={2}
                    value={editForm.observations}
                    onChange={e => setEditForm(f => ({ ...f, observations: e.target.value }))}
                  />
                  <div className="tt-form-actions">
                    <button className="tt-btn tt-btn-primary" onClick={() => handleSaveNotes(t.id)}>
                      Guardar
                    </button>
                    <button className="tt-btn tt-btn-secondary" onClick={() => setEditingId(null)}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="tt-notes">
                  {t.activityDescription && (
                    <p><strong>Actividades:</strong> {t.activityDescription}</p>
                  )}
                  {t.observations && (
                    <p><strong>Observaciones:</strong> {t.observations}</p>
                  )}
                  {!t.activityDescription && !t.observations && (
                    <p className="tt-no-notes">Sin notas registradas.</p>
                  )}
                </div>
              )}

              <span className="tt-assigned-at">
                Asignado: {new Date(t.assignedAt).toLocaleDateString('es-EC')}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* ── Modal confirmar quitar técnico ── */}
      {removeConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          <div style={{
            background: '#fff', borderRadius: 14, padding: '1.75rem',
            maxWidth: 400, width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.18)',
            animation: 'tt-modal-in 0.18s ease',
          }}>
            <div style={{
              width: 46, height: 46, borderRadius: '50%', background: '#fff7ed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.35rem', margin: '0 auto 0.85rem',
            }}>👤</div>
            <h3 style={{ margin: '0 0 0.4rem', fontSize: '1rem', fontWeight: 700, textAlign: 'center', color: '#111827' }}>
              ¿Quitar técnico del caso?
            </h3>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.85rem', color: '#6b7280', textAlign: 'center', lineHeight: 1.5 }}>
              Se quitará a <strong style={{ color: '#111827' }}>{removeConfirm.name}</strong> de este equipo. Podrás volver a asignarlo si es necesario.
            </p>
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button
                onClick={() => setRemoveConfirm(null)}
                style={{
                  flex: 1, padding: '0.6rem', borderRadius: 8,
                  border: '1px solid #e5e7eb', background: '#fff',
                  color: '#374151', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                }}
              >Cancelar</button>
              <button
                onClick={confirmarRemove}
                style={{
                  flex: 1, padding: '0.6rem', borderRadius: 8,
                  border: 'none', background: '#dc2626',
                  color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                }}
              >Sí, quitar</button>
            </div>
          </div>
          <style>{`@keyframes tt-modal-in { from { opacity:0; transform:scale(.93) } to { opacity:1; transform:scale(1) } }`}</style>
        </div>
      )}

      <style>{`
        .tt-container { font-family: inherit; }
        .tt-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .tt-title { margin: 0; font-size: 1rem; font-weight: 600; color: #1e293b; }
        .tt-status { color: #64748b; font-size: .875rem; }
        .tt-error { color: #dc2626; font-size: .875rem; margin: 0; }
        .tt-empty { color: #94a3b8; font-size: .875rem; font-style: italic; }
        .tt-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
        .tt-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
        .tt-item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .tt-name { font-weight: 600; color: #0f172a; }
        .tt-item-actions { display: flex; gap: 6px; }
        .tt-notes p { margin: 4px 0; font-size: .875rem; color: #475569; }
        .tt-no-notes { color: #94a3b8; font-size: .875rem; font-style: italic; }
        .tt-assigned-at { font-size: .75rem; color: #94a3b8; display: block; margin-top: 8px; }
        .tt-form { background: #f1f5f9; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
        .tt-form-row { margin-bottom: 12px; }
        .tt-label { display: block; font-size: .8rem; font-weight: 500; color: #475569; margin-bottom: 4px; }
        .tt-select, .tt-textarea { width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: .875rem; font-family: inherit; box-sizing: border-box; background: white; }
        .tt-textarea { resize: vertical; }
        .tt-form-actions { display: flex; gap: 8px; margin-top: 12px; }
        .tt-edit-area { margin-top: 8px; }
        .tt-btn { padding: 7px 14px; border: none; border-radius: 6px; font-size: .875rem; cursor: pointer; font-weight: 500; }
        .tt-btn-primary { background: #2563eb; color: white; }
        .tt-btn-primary:hover { background: #1d4ed8; }
        .tt-btn-primary:disabled { background: #93c5fd; cursor: not-allowed; }
        .tt-btn-secondary { background: #e2e8f0; color: #475569; }
        .tt-btn-secondary:hover { background: #cbd5e1; }
        .tt-btn-sm { padding: 4px 10px; border: none; border-radius: 5px; font-size: .78rem; cursor: pointer; font-weight: 500; }
        .tt-btn-danger { background: #fee2e2; color: #dc2626; }
        .tt-btn-danger:hover { background: #fecaca; }
        .tt-search-wrapper { position: relative; }
        .tt-search-input { width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: .875rem; font-family: inherit; box-sizing: border-box; background: white; outline: none; }
        .tt-search-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,.12); }
        .tt-dropdown { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: white; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,.12); z-index: 100; margin: 0; padding: 4px; list-style: none; max-height: 200px; overflow-y: auto; }
        .tt-dropdown-item { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 6px; cursor: pointer; font-size: .875rem; color: #0f172a; transition: background .12s; }
        .tt-dropdown-item:hover { background: #eff6ff; color: #1d4ed8; }
        .tt-dropdown-avatar { width: 26px; height: 26px; border-radius: 50%; background: #dbeafe; color: #1d4ed8; display: flex; align-items: center; justify-content: center; font-size: .75rem; font-weight: 700; flex-shrink: 0; }
        .tt-dropdown-empty { padding: 10px; font-size: .82rem; color: #94a3b8; font-style: italic; text-align: center; }
        .tt-selected-badge { display: inline-block; margin-top: 5px; font-size: .75rem; color: #166534; font-weight: 600; }
      `}</style>
    </div>
  )
}