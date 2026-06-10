import { useState, useEffect, useCallback } from 'react'
import { maintenanceApi } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

const SEVERITY_COLORS = {
  Alta:  { bg: '#fee2e2', color: '#991b1b' },
  Media: { bg: '#fef9c3', color: '#854d0e' },
  Baja:  { bg: '#f0fdf4', color: '#166534' },
}

const CATEGORY_COLORS = {
  Correctivo: { bg: '#fee2e2', color: '#991b1b' },
  Preventivo: { bg: '#e0f2fe', color: '#075985' },
  Adaptativo: { bg: '#f3e8ff', color: '#6b21a8' },
}

/**
 * HU-10: Selección de actividades y diagnósticos desde catálogo.
 * Se renderiza dentro del detalle de un Caso, una vez por cada TicketEquipment.
 *
 * Props:
 *   ticketEquipmentId  – Guid del TicketEquipment
 *   ticketStatus       – estado del ticket padre ("Pendiente", "En Proceso", "Terminado")
 */
export default function TicketActivitiesDiagnoses({ ticketEquipmentId, ticketStatus }) {
  const { user } = useAuth()

  const [linkedActivities, setLinkedActivities]   = useState([])
  const [linkedDiagnoses,  setLinkedDiagnoses]    = useState([])
  const [loading,          setLoading]            = useState(true)
  const [showModal,        setShowModal]          = useState(false)
  const [saving,           setSaving]             = useState(false)

  // Catálogo completo (solo activos)
  const [catalogActivities, setCatalogActivities] = useState([])
  const [catalogDiagnoses,  setCatalogDiagnoses]  = useState([])
  const [loadingCatalog,    setLoadingCatalog]    = useState(false)

  // Selección dentro del modal
  const [selectedActivities, setSelectedActivities] = useState(new Set())
  const [selectedDiagnoses,  setSelectedDiagnoses]  = useState(new Set())
  const [searchActivity,     setSearchActivity]     = useState('')
  const [searchDiagnosis,    setSearchDiagnosis]    = useState('')
  const [activeTab,          setActiveTab]          = useState('activities')

  const isReadOnly = ticketStatus === 'Terminado'

  // ── Cargar vinculaciones existentes ─────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [actRes, diagRes] = await Promise.all([
        maintenanceApi.get(`/ticket-equipments/${ticketEquipmentId}/activities`),
        maintenanceApi.get(`/ticket-equipments/${ticketEquipmentId}/diagnoses`),
      ])
      setLinkedActivities(actRes.data)
      setLinkedDiagnoses(diagRes.data)
    } catch {
      // silencioso — el componente padre puede no tener datos aún
    } finally {
      setLoading(false)
    }
  }, [ticketEquipmentId])

  useEffect(() => { load() }, [load])

  // ── Abrir modal de selección ─────────────────────────────────────────────────
  const openModal = async () => {
    setSelectedActivities(new Set())
    setSelectedDiagnoses(new Set())
    setSearchActivity('')
    setSearchDiagnosis('')
    setActiveTab('activities')
    setShowModal(true)
    setLoadingCatalog(true)
    try {
      const [actRes, diagRes] = await Promise.all([
        maintenanceApi.get('/catalog/activities?activeOnly=true'),
        maintenanceApi.get('/catalog/diagnoses?activeOnly=true'),
      ])
      // Excluir los ya vinculados
      const linkedActIds  = new Set(linkedActivities.map(a => a.catalogActivityId))
      const linkedDiagIds = new Set(linkedDiagnoses.map(d => d.catalogDiagnosisId))
      setCatalogActivities(actRes.data.filter(a => !linkedActIds.has(a.id)))
      setCatalogDiagnoses(diagRes.data.filter(d => !linkedDiagIds.has(d.id)))
    } catch {
      alert('Error al cargar el catálogo.')
      setShowModal(false)
    } finally {
      setLoadingCatalog(false)
    }
  }

  // ── Guardar selección ────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (selectedActivities.size === 0 && selectedDiagnoses.size === 0)
      return alert('Debe seleccionar al menos una actividad o diagnóstico.')

    setSaving(true)
    try {
      const addedByUserId = user?.id ?? '00000000-0000-0000-0000-000000000000'

      const promises = []

      if (selectedActivities.size > 0) {
        promises.push(
          maintenanceApi.post(`/ticket-equipments/${ticketEquipmentId}/activities`, {
            catalogItemIds: [...selectedActivities],
            addedByUserId,
          })
        )
      }

      if (selectedDiagnoses.size > 0) {
        promises.push(
          maintenanceApi.post(`/ticket-equipments/${ticketEquipmentId}/diagnoses`, {
            catalogItemIds: [...selectedDiagnoses],
            addedByUserId,
          })
        )
      }

      await Promise.all(promises)
      setShowModal(false)
      await load()
    } catch (e) {
      alert(e.response?.data?.message ?? 'Error al guardar la selección.')
    } finally {
      setSaving(false)
    }
  }

  // ── Desvincular ─────────────────────────────────────────────────────────────
  const unlinkActivity = async (linkId) => {
    if (!confirm('¿Quitar esta actividad del caso?')) return
    try {
      await maintenanceApi.delete(`/ticket-equipments/${ticketEquipmentId}/activities/${linkId}`)
      setLinkedActivities(prev => prev.filter(a => a.id !== linkId))
    } catch (e) {
      alert(e.response?.data?.message ?? 'Error al quitar la actividad.')
    }
  }

  const unlinkDiagnosis = async (linkId) => {
    if (!confirm('¿Quitar este diagnóstico del caso?')) return
    try {
      await maintenanceApi.delete(`/ticket-equipments/${ticketEquipmentId}/diagnoses/${linkId}`)
      setLinkedDiagnoses(prev => prev.filter(d => d.id !== linkId))
    } catch (e) {
      alert(e.response?.data?.message ?? 'Error al quitar el diagnóstico.')
    }
  }

  // ── Toggle selección ─────────────────────────────────────────────────────────
  const toggleActivity = (id) => {
    setSelectedActivities(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleDiagnosis = (id) => {
    setSelectedDiagnoses(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const filteredActivities = catalogActivities.filter(a =>
    a.name.toLowerCase().includes(searchActivity.toLowerCase()) ||
    (a.description ?? '').toLowerCase().includes(searchActivity.toLowerCase())
  )

  const filteredDiagnoses = catalogDiagnoses.filter(d =>
    d.name.toLowerCase().includes(searchDiagnosis.toLowerCase()) ||
    (d.description ?? '').toLowerCase().includes(searchDiagnosis.toLowerCase())
  )

  const totalSelected = selectedActivities.size + selectedDiagnoses.size

  // ── Render ───────────────────────────────────────────────────────────────────
  if (loading) return <p style={{ color: '#888', fontSize: '0.8rem', margin: 0 }}>Cargando...</p>

  return (
    <div>
      {/* Actividades vinculadas */}
      {linkedActivities.length > 0 && (
        <div style={{ marginBottom: '0.5rem' }}>
          <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: '0 0 0.3rem', fontWeight: 600 }}>
            ACTIVIDADES REALIZADAS
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
            {linkedActivities.map(a => (
              <span key={a.id} style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                padding: '0.2rem 0.5rem', borderRadius: 4, fontSize: '0.8rem',
                background: CATEGORY_COLORS[a.activityCategory]?.bg ?? '#f3f4f6',
                color: CATEGORY_COLORS[a.activityCategory]?.color ?? '#374151',
                border: `1px solid ${CATEGORY_COLORS[a.activityCategory]?.bg ?? '#e5e7eb'}`,
              }}>
                {a.activityName}
                {!isReadOnly && (
                  <button
                    onClick={() => unlinkActivity(a.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '0.75rem', lineHeight: 1, padding: 0 }}
                    title="Quitar"
                  >✕</button>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Diagnósticos vinculados */}
      {linkedDiagnoses.length > 0 && (
        <div style={{ marginBottom: '0.5rem' }}>
          <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: '0 0 0.3rem', fontWeight: 600 }}>
            DIAGNÓSTICOS IDENTIFICADOS
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
            {linkedDiagnoses.map(d => (
              <span key={d.id} style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                padding: '0.2rem 0.5rem', borderRadius: 4, fontSize: '0.8rem',
                background: SEVERITY_COLORS[d.diagnosisSeverity]?.bg ?? '#f3f4f6',
                color: SEVERITY_COLORS[d.diagnosisSeverity]?.color ?? '#374151',
                border: `1px solid ${SEVERITY_COLORS[d.diagnosisSeverity]?.bg ?? '#e5e7eb'}`,
              }}>
                {d.diagnosisName}
                {!isReadOnly && (
                  <button
                    onClick={() => unlinkDiagnosis(d.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '0.75rem', lineHeight: 1, padding: 0 }}
                    title="Quitar"
                  >✕</button>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {linkedActivities.length === 0 && linkedDiagnoses.length === 0 && (
        <p style={{ color: '#aaa', fontSize: '0.8rem', margin: '0 0 0.4rem' }}>
          Sin actividades ni diagnósticos registrados.
        </p>
      )}

      {!isReadOnly && (
        <button
          onClick={openModal}
          style={{
            marginTop: '0.25rem',
            padding: '0.3rem 0.75rem', borderRadius: 6,
            border: '1px dashed #3b82f6', background: '#eff6ff',
            color: '#1d4ed8', fontSize: '0.8rem', fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Agregar actividades / diagnósticos
        </button>
      )}

      {/* ── MODAL DE SELECCIÓN ── */}
      {showModal && (
        <div style={overlay}>
          <div style={{ ...modal, maxWidth: 780 }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#111827' }}>Agregar Actividades y Diagnósticos</h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#6b7280' }}>
                  Selecciona uno o varios elementos del catálogo
                </p>
              </div>
              <button onClick={() => setShowModal(false)} style={closeBtn}>✕</button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', marginBottom: '1rem' }}>
              {[
                { key: 'activities', label: `Actividades${selectedActivities.size > 0 ? ` (${selectedActivities.size})` : ''}` },
                { key: 'diagnoses',  label: `Diagnósticos${selectedDiagnoses.size > 0 ? ` (${selectedDiagnoses.size})` : ''}` },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: '0.5rem 1rem', border: 'none', background: 'none',
                    fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
                    borderBottom: activeTab === tab.key ? '2px solid #2563eb' : '2px solid transparent',
                    color: activeTab === tab.key ? '#1d4ed8' : '#6b7280',
                    marginBottom: -2,
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {loadingCatalog ? (
              <p style={{ textAlign: 'center', color: '#888', padding: '2rem' }}>Cargando catálogo...</p>
            ) : (
              <>
                {/* Panel Actividades */}
                {activeTab === 'activities' && (
                  <div>
                    <input
                      placeholder="Buscar actividad..."
                      value={searchActivity}
                      onChange={e => setSearchActivity(e.target.value)}
                      style={{ ...inputStyle, marginBottom: '0.75rem' }}
                    />
                    <div style={{ maxHeight: 380, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 10 }}>
                      {filteredActivities.length === 0 ? (
                        <p style={{ padding: '1.5rem', textAlign: 'center', color: '#888', margin: 0 }}>
                          {catalogActivities.length === 0 ? 'Todas las actividades ya están vinculadas.' : 'Sin resultados.'}
                        </p>
                      ) : filteredActivities.map(a => (
                        <label key={a.id} style={{
                          display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
                          padding: '0.75rem 1rem', cursor: 'pointer',
                          background: selectedActivities.has(a.id) ? '#eff6ff' : 'transparent',
                          borderBottom: '1px solid #f5f5f5',
                        }}>
                          <input
                            type="checkbox"
                            checked={selectedActivities.has(a.id)}
                            onChange={() => toggleActivity(a.id)}
                            style={{ marginTop: 3, accentColor: '#2563eb', width: 15, height: 15, flexShrink: 0 }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{a.name}</span>
                              <span style={{
                                padding: '0.1rem 0.4rem', borderRadius: 4, fontSize: '0.72rem', fontWeight: 600,
                                background: CATEGORY_COLORS[a.category]?.bg ?? '#f3f4f6',
                                color: CATEGORY_COLORS[a.category]?.color ?? '#374151',
                              }}>{a.category}</span>
                            </div>
                            {a.description && (
                              <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: '#6b7280', lineHeight: 1.4 }}>
                                {a.description}
                              </p>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Panel Diagnósticos */}
                {activeTab === 'diagnoses' && (
                  <div>
                    <input
                      placeholder="Buscar diagnóstico..."
                      value={searchDiagnosis}
                      onChange={e => setSearchDiagnosis(e.target.value)}
                      style={{ ...inputStyle, marginBottom: '0.75rem' }}
                    />
                    <div style={{ maxHeight: 380, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 10 }}>
                      {filteredDiagnoses.length === 0 ? (
                        <p style={{ padding: '1.5rem', textAlign: 'center', color: '#888', margin: 0 }}>
                          {catalogDiagnoses.length === 0 ? 'Todos los diagnósticos ya están vinculados.' : 'Sin resultados.'}
                        </p>
                      ) : filteredDiagnoses.map(d => (
                        <label key={d.id} style={{
                          display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
                          padding: '0.75rem 1rem', cursor: 'pointer',
                          background: selectedDiagnoses.has(d.id) ? '#eff6ff' : 'transparent',
                          borderBottom: '1px solid #f5f5f5',
                        }}>
                          <input
                            type="checkbox"
                            checked={selectedDiagnoses.has(d.id)}
                            onChange={() => toggleDiagnosis(d.id)}
                            style={{ marginTop: 3, accentColor: '#2563eb', width: 15, height: 15, flexShrink: 0 }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{d.name}</span>
                              <span style={{
                                padding: '0.1rem 0.4rem', borderRadius: 4, fontSize: '0.72rem', fontWeight: 600,
                                background: SEVERITY_COLORS[d.severity]?.bg ?? '#f3f4f6',
                                color: SEVERITY_COLORS[d.severity]?.color ?? '#374151',
                              }}>Severidad: {d.severity}</span>
                            </div>
                            {d.description && (
                              <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: '#6b7280', lineHeight: 1.4 }}>
                                {d.description}
                              </p>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resumen de selección */}
                {totalSelected > 0 && (
                  <div style={{
                    marginTop: '0.75rem', padding: '0.5rem 0.75rem',
                    background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8,
                    fontSize: '0.82rem', color: '#166534',
                  }}>
                    ✔ {selectedActivities.size} actividad(es) y {selectedDiagnoses.size} diagnóstico(s) seleccionados
                  </div>
                )}
              </>
            )}

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={saving || loadingCatalog || totalSelected === 0}
              >
                {saving ? 'Guardando...' : `Guardar selección${totalSelected > 0 ? ` (${totalSelected})` : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const overlay   = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem' }
const modal     = { background: '#fff', borderRadius: 16, padding: '2.25rem 2.5rem', width: '100%', maxHeight: '90vh', overflowY: 'auto' }
const inputStyle = { width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid #ddd', boxSizing: 'border-box', fontFamily: 'inherit' }
const closeBtn  = { background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: '#666' }