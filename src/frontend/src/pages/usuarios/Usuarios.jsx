import { useState, useEffect } from 'react'
import { userApi } from '../../services/api'
import './Usuarios.css'

const ROLES = ['Administrador', 'Laboratorista']

export default function Usuarios() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterRol, setFilterRol] = useState('todos')
  const [filterEstado, setFilterEstado] = useState('todos')
  const [editingId, setEditingId] = useState(null)
  const [editRole, setEditRole] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await userApi.get('/users')
      setUsers(res.data)
    } catch (err) {
      console.error('[Usuarios] loadUsers error', {
        status: err.response?.status,
        data: err.response?.data,
      })
      setError(`No se pudo cargar la lista de usuarios. (${err.response?.status ?? 'sin respuesta'})`)
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
      setError('')
      const res = await userApi.put(`/users/${userId}/role`, { role: editRole })
      setUsers(prev => prev.map(u => (u.id === userId ? res.data : u)))
      setEditingId(null)
    } catch (err) {
      console.error('[Usuarios] handleSaveRole error', {
        status: err.response?.status,
        data: err.response?.data,
        userId,
        role: editRole,
      })

      const apiMessage = err.response?.data?.message

      if (apiMessage) {
        setError(apiMessage)
      } else if (err.response?.status === 403) {
        setError('No tienes permisos para cambiar el rol de este usuario.')
      } else if (err.response?.status === 401) {
        setError('Tu sesión no es válida o expiró al intentar actualizar el rol.')
      } else {
        setError(`Error al actualizar el rol. (${err.response?.status ?? 'sin respuesta'})`)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (userId) => {
    try {
      setError('')
      const res = await userApi.put(`/users/${userId}/toggle-active`)
      setUsers(prev => prev.map(u => (u.id === userId ? res.data : u)))
    } catch (err) {
      console.error('[Usuarios] handleToggleActive error', {
        status: err.response?.status,
        data: err.response?.data,
        userId,
      })

      const apiMessage = err.response?.data?.message

      if (apiMessage) {
        setError(apiMessage)
      } else if (err.response?.status === 403) {
        setError('No tienes permisos para cambiar el estado de este usuario.')
      } else if (err.response?.status === 401) {
        setError('Tu sesión no es válida o expiró al cambiar el estado del usuario.')
      } else {
        setError(`Error al cambiar el estado del usuario. (${err.response?.status ?? 'sin respuesta'})`)
      }
    }
  }

  const filtered = users.filter(u => {
    const matchSearch =
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const matchRol = filterRol === 'todos' || u.role.toLowerCase() === filterRol
    const matchEstado =
      filterEstado === 'todos' ||
      (filterEstado === 'activo' && u.isActive) ||
      (filterEstado === 'inactivo' && !u.isActive)
    return matchSearch && matchRol && matchEstado
  })

  return (
    <div className="usuarios-page">
      <div className="page-header">
        <div>
          <h1>Gestión de Usuarios</h1>
          <p>Administración de usuarios y roles del sistema</p>
        </div>
      </div>

      {error && (
        <div className="alert-error">
          {error}
          <button type="button" onClick={() => setError('')}>✕</button>
        </div>
      )}

      <div className="usuarios-toolbar">
        <div className="search-box">
          <span className="search-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </span>

          <input
            type="text"
            placeholder="Buscar por nombre o correo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select
          className="filter-select"
          value={filterRol}
          onChange={e => setFilterRol(e.target.value)}
        >
          <option value="todos">Todos los roles</option>
          <option value="administrador">Administrador</option>
          <option value="laboratorista">Laboratorista</option>
        </select>

        <select
          className="filter-select"
          value={filterEstado}
          onChange={e => setFilterEstado(e.target.value)}
        >
          <option value="todos">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>

        <button className="btn-refresh" onClick={loadUsers} type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2v6h-6" />
            <path d="M3 12a9 9 0 0 1 15.55-6.36L21 8" />
            <path d="M3 22v-6h6" />
            <path d="M21 12a9 9 0 0 1-15.55 6.36L3 16" />
          </svg>
          Actualizar
        </button>
      </div>

      <div className="usuarios-card">
        <div className="card-header">
          <div>
            <h2>Usuarios del Sistema</h2>
            <p>Listado de usuarios registrados y sus roles</p>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">Cargando usuarios...</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
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
                <th className="actions-header">Acciones</th>
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
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </td>

                  <td className="actions-cell">
                    <div className="table-actions">
                      {editingId === user.id ? (
                        <>
                          <button
                            className="action-icon-btn"
                            onClick={() => handleSaveRole(user.id)}
                            disabled={saving}
                            title="Guardar rol"
                            type="button"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                          </button>

                          <button
                            className="action-icon-btn"
                            onClick={() => setEditingId(null)}
                            title="Cancelar"
                            type="button"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 6 6 18" />
                              <path d="m6 6 12 12" />
                            </svg>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="action-icon-btn"
                            onClick={() => handleEditRole(user)}
                            title="Editar rol"
                            type="button"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                            </svg>
                          </button>

                          <button
                            className="action-icon-btn"
                            onClick={() => handleToggleActive(user.id)}
                            title={user.isActive ? 'Desactivar usuario' : 'Activar usuario'}
                            type="button"
                          >
                            {user.isActive ? (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <line x1="17" x2="22" y1="8" y2="13" />
                                <line x1="22" x2="17" y1="8" y2="13" />
                              </svg>
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M19 8v6" />
                                <path d="M22 11h-6" />
                              </svg>
                            )}
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