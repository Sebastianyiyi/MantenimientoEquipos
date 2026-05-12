import { useState, useEffect } from 'react'
import { userApi } from '../../services/api'
import './Usuarios.css'

const ROLES = ['Administrador', 'Laboratorista']

export default function Usuarios() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editRole, setEditRole] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const res = await userApi.get('/users')
      setUsers(res.data)
    } catch {
      setError('No se pudo cargar la lista de usuarios.')
    } finally {
      setLoading(false)
    }
  }

  const handleEditRole = (user) => {
    setEditingId(user.id)
    setEditRole(user.role)
  }

  const handleSaveRole = async (userId) => {
    setSaving(true)
    try {
      const res = await userApi.put(`/users/${userId}/role`, { role: editRole })
      setUsers(prev => prev.map(u => u.id === userId ? res.data : u))
      setEditingId(null)
    } catch {
      setError('Error al actualizar el rol.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (userId) => {
    try {
      const res = await userApi.put(`/users/${userId}/toggle-active`)
      setUsers(prev => prev.map(u => u.id === userId ? res.data : u))
    } catch {
      setError('Error al cambiar el estado del usuario.')
    }
  }

  const filtered = users.filter(u =>
    u.fullName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="usuarios-page">
      <div className="page-header">
        <div>
          <h1>Gestión de Usuarios</h1>
          <p>Administración de usuarios y roles del sistema</p>
        </div>
        <span className="badge-admin">Administrador</span>
      </div>

      {error && (
        <div className="alert-error">
          {error}
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      <div className="usuarios-toolbar">
        <div className="search-box">
          <i data-lucide="search"></i>
          <input
            type="text"
            placeholder="Buscar por nombre o correo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className="btn-refresh" onClick={loadUsers}>
          <i data-lucide="refresh-cw"></i>
          Actualizar
        </button>
      </div>

      <div className="usuarios-card">
        <div className="card-header">
          <div>
            <h2>Usuarios del Sistema ({filtered.length})</h2>
            <p>Listado de usuarios registrados y sus roles</p>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">Cargando usuarios...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <i data-lucide="users"></i>
            <p>No se encontraron usuarios</p>
          </div>
        ) : (
          <table className="usuarios-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Miembro desde</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => (
                <tr key={user.id}>
                  <td>
                    <div className="user-info">
                      <div className="user-avatar">
                        {user.fullName.charAt(0).toUpperCase()}
                      </div>
                      <span className="user-name">{user.fullName}</span>
                    </div>
                  </td>
                  <td className="user-email">{user.email}</td>
                  <td>
                    {editingId === user.id ? (
                      <select
                        value={editRole}
                        onChange={e => setEditRole(e.target.value)}
                        className="role-select"
                      >
                        {ROLES.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`role-badge role-${user.role.toLowerCase()}`}>
                        {user.role}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                      {user.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="user-date">
                    {new Date(user.createdAt).toLocaleDateString('es-EC', {
                      day: '2-digit', month: 'short', year: 'numeric'
                    })}
                  </td>
                  <td>
                    <div className="action-btns">
                      {editingId === user.id ? (
                        <>
                          <button
                            className="btn-save"
                            onClick={() => handleSaveRole(user.id)}
                            disabled={saving}
                            title="Guardar rol"
                          >
                            <i data-lucide="check"></i>
                          </button>
                          <button
                            className="btn-cancel"
                            onClick={() => setEditingId(null)}
                            title="Cancelar"
                          >
                            <i data-lucide="x"></i>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="btn-icon"
                            onClick={() => handleEditRole(user)}
                            title="Cambiar rol"
                          >
                            <i data-lucide="pencil"></i>
                          </button>
                          <button
                            className="btn-icon btn-toggle"
                            onClick={() => handleToggleActive(user.id)}
                            title={user.isActive ? 'Desactivar usuario' : 'Activar usuario'}
                          >
                            <i data-lucide={user.isActive ? 'user-x' : 'user-check'}></i>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
