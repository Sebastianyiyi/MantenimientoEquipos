import { useState, useEffect } from 'react'
import { maintenanceApi, equipmentApi, userApi } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import './Tickets.css'

export default function Tickets() {
  const { user } = useAuth()
  const [tickets, setTickets] = useState([])
  const [equipos, setEquipos] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' })
  const [mostrarForm, setMostrarForm] = useState(false)

  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'Media',
    equipments: [{ equipmentId: '', diagnosis: '', observation: '', technicianUserIds: [] }]
  })

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      const ticketsRes = await maintenanceApi.get('/tickets')
      setTickets(ticketsRes.data)
    } catch (err) {
      console.error('tickets error:', err)
    }
    try {
      const equiposRes = await equipmentApi.get('/equipments')
      setEquipos(equiposRes.data)
    } catch (err) {
      console.error('equipos error:', err)
    }
    try {
      const usuariosRes = await userApi.get('/users')
      setUsuarios(usuariosRes.data.filter(u => u.role === 'Laboratorista'))
    } catch (err) {
      console.error('usuarios error:', err)
    }
  }

  const agregarEquipo = () => {
    setForm(prev => ({
      ...prev,
      equipments: [...prev.equipments, { equipmentId: '', diagnosis: '', observation: '', technicianUserIds: [] }]
    }))
  }

  const quitarEquipo = (index) => {
    setForm(prev => ({
      ...prev,
      equipments: prev.equipments.filter((_, i) => i !== index)
    }))
  }

  const updateEquipo = (index, field, value) => {
    setForm(prev => {
      const equipments = [...prev.equipments]
      equipments[index] = { ...equipments[index], [field]: value }
      return { ...prev, equipments }
    })
  }

  const toggleTecnico = (equipIndex, techId) => {
    setForm(prev => {
      const equipments = [...prev.equipments]
      const ids = equipments[equipIndex].technicianUserIds
      equipments[equipIndex] = {
        ...equipments[equipIndex],
        technicianUserIds: ids.includes(techId)
          ? ids.filter(id => id !== techId)
          : [...ids, techId]
      }
      return { ...prev, equipments }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await maintenanceApi.post('/tickets', {
        title: form.title,
        description: form.description,
        priority: form.priority,
        createdByUserId: user.id,
        equipments: form.equipments.map(eq => ({
          equipmentId: eq.equipmentId,
          diagnosis: eq.diagnosis,
          observation: eq.observation,
          technicianUserIds: eq.technicianUserIds,
        }))
      })
      setMensaje({ texto: 'Ticket creado exitosamente', tipo: 'success' })
      setMostrarForm(false)
      setForm({
        title: '',
        description: '',
        priority: 'Media',
        equipments: [{ equipmentId: '', diagnosis: '', observation: '', technicianUserIds: [] }]
      })
      cargarDatos()
    } catch (err) {
      setMensaje({ texto: 'Error al crear el ticket', tipo: 'error' })
    } finally {
      setLoading(false)
      setTimeout(() => setMensaje({ texto: '', tipo: '' }), 4000)
    }
  }

  const badgeColor = { 'Abierto': '#3b82f6', 'En progreso': '#f59e0b', 'Cerrado': '#10b981' }
  const prioColor = { 'Alta': '#ef4444', 'Media': '#f59e0b', 'Baja': '#6b7280' }

  return (
    <div className="tickets-page">
      <div className="tickets-header">
        <div>
          <h1>Tickets de Mantenimiento</h1>
          <p>Reporta y gestiona problemas con los equipos del laboratorio</p>
        </div>
        <button className="btn-primary" onClick={() => setMostrarForm(!mostrarForm)}>
          {mostrarForm ? 'Cancelar' : '+ Nuevo Ticket'}
        </button>
      </div>

      {mensaje.texto && (
        <div className={`mensaje ${mensaje.tipo}`}>{mensaje.texto}</div>
      )}

      {mostrarForm && (
        <form className="ticket-form" onSubmit={handleSubmit}>
          <h2>Crear Nuevo Ticket</h2>

          <div className="form-row">
            <div className="form-group">
              <label>Titulo</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Ej: Equipos con falla en pantalla"
                required
              />
            </div>
            <div className="form-group">
              <label>Prioridad</label>
              <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                <option>Baja</option>
                <option>Media</option>
                <option>Alta</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Descripcion</label>
            <textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Describe el problema general..."
              rows={3}
            />
          </div>

          <div className="equipos-section">
            <div className="equipos-header">
              <h3>Equipos afectados</h3>
              <button type="button" className="btn-secondary" onClick={agregarEquipo}>
                + Agregar equipo
              </button>
            </div>

            {form.equipments.map((eq, i) => (
              <div key={i} className="equipo-card">
                <div className="equipo-card-header">
                  <span>Equipo #{i + 1}</span>
                  {form.equipments.length > 1 && (
                    <button type="button" className="btn-remove" onClick={() => quitarEquipo(i)}>X</button>
                  )}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Equipo</label>
                    <select
                      value={eq.equipmentId}
                      onChange={e => updateEquipo(i, 'equipmentId', e.target.value)}
                      required
                    >
                      <option value="">Seleccionar equipo...</option>
                      {equipos.map(eq => (
                        <option key={eq.id} value={eq.id}>{eq.name || eq.serialNumber || eq.id}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Diagnostico</label>
                    <input
                      type="text"
                      value={eq.diagnosis}
                      onChange={e => updateEquipo(i, 'diagnosis', e.target.value)}
                      placeholder="Diagnostico inicial..."
                    />
                  </div>
                  <div className="form-group">
                    <label>Observacion</label>
                    <input
                      type="text"
                      value={eq.observation}
                      onChange={e => updateEquipo(i, 'observation', e.target.value)}
                      placeholder="Observaciones..."
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Tecnicos asignados</label>
                  <div className="tecnicos-grid">
                    {usuarios.length === 0 && <p className="no-tech">No hay laboratoristas disponibles</p>}
                    {usuarios.map(u => (
                      <label key={u.id} className={`tecnico-chip ${eq.technicianUserIds.includes(u.id) ? 'selected' : ''}`}>
                        <input
                          type="checkbox"
                          checked={eq.technicianUserIds.includes(u.id)}
                          onChange={() => toggleTecnico(i, u.id)}
                        />
                        {u.fullName || u.email}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creando...' : 'Crear Ticket'}
          </button>
        </form>
      )}

      <div className="tickets-lista">
        <h2>Tickets existentes ({tickets.length})</h2>
        {tickets.length === 0 && <p className="empty">No hay tickets aun.</p>}
        {tickets.map(t => (
          <div key={t.id} className="ticket-item">
            <div className="ticket-top">
              <span className="ticket-number">{t.ticketNumber}</span>
              <span className="badge" style={{ background: badgeColor[t.status] }}>{t.status}</span>
              <span className="badge" style={{ background: prioColor[t.priority] }}>{t.priority}</span>
            </div>
            <h3>{t.title}</h3>
            {t.description && <p>{t.description}</p>}
            <small>{new Date(t.createdAt).toLocaleDateString('es-EC')} — {t.ticketEquipments?.length || 0} equipo(s)</small>
          </div>
        ))}
      </div>
    </div>
  )
}