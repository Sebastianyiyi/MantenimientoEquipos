import { useState, useEffect, useCallback } from 'react'
import { equipmentApi } from '../../services/api'
import { useNavigate } from 'react-router-dom'

const STATUSES = ['Activo', 'En mantenimiento', 'Dado de baja']

export default function Equipos() {
  const [equipments, setEquipments] = useState([])
  const [types, setTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editingEquipment, setEditingEquipment] = useState(null)
  const navigate = useNavigate()

  const getLifecycleStatus = (purchaseDate) => {
    if (!purchaseDate) {
      return {
        text: 'Sin fecha registrada',
        color: '#6b7280',
        bg: '#f3f4f6'
      }
    }

    const purchase = new Date(purchaseDate)
    const today = new Date()
    const diffYears = (today - purchase) / (1000 * 60 * 60 * 24 * 365.25)

    if (diffYears < 3) {
      return {
        text: 'Vigente',
        color: '#166534',
        bg: '#dcfce7'
      }
    }

    return {
      text: 'Fuera de ciclo / requiere revisión',
      color: '#991b1b',
      bg: '#fee2e2'
    }
  }

  const openEdit = (eq) => {
    setShowDetail(null)
    setEditingEquipment(eq)
    setForm({
      assetTag: eq.assetTag ?? '',
      brand: eq.brand ?? '',
      model: eq.model ?? '',
      serialNumber: eq.serialNumber ?? '',
      equipmentTypeId: eq.equipmentType?.id ?? '',
      purchaseDate: eq.purchaseDate ?? '',
      attributes: parseSpecs(eq.specificationsJson)
    })
    setShowForm(true)
  }

  const emptyForm = {
    assetTag: '',
    brand: '',
    model: '',
    serialNumber: '',
    equipmentTypeId: '',
    purchaseDate: '',
    attributes: []
  }

  const [form, setForm] = useState(emptyForm)

  const load = useCallback(async (searchTerm = search) => {
    try {
      setLoading(true)
      const params = {}
      if (filterStatus) params.status = filterStatus
      if (searchTerm) params.search = searchTerm

      const [eqRes, typRes] = await Promise.all([
        equipmentApi.get('/equipments', { params }),
        equipmentApi.get('/equipment-types')
      ])

      setEquipments(eqRes.data)
      setTypes(typRes.data)
    } catch {
      setError('Error al cargar datos.')
    } finally {
      setLoading(false)
    }
  }, [filterStatus, search])

  useEffect(() => {
    load()
  }, [load])

  const handleSearch = (e) => {
    e.preventDefault()
    load(search)
  }

  const openNew = () => {
    setEditingEquipment(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  const handleAttrChange = (idx, field, value) => {
    const attrs = [...form.attributes]
    attrs[idx] = { ...attrs[idx], [field]: value }
    setForm({ ...form, attributes: attrs })
  }

  const addAttr = () => setForm({ ...form, attributes: [...form.attributes, { key: '', value: '' }] })
  const removeAttr = (idx) => setForm({ ...form, attributes: form.attributes.filter((_, i) => i !== idx) })

  const handleSaveUnitario = async () => {
    if (!form.assetTag || !form.brand || !form.model || !form.serialNumber || !form.equipmentTypeId || !form.purchaseDate) {
      return alert('Complete los campos obligatorios.')
    }

    setSaving(true)

    try {
      const cleanAttributes = form.attributes.filter(a => a.key && a.value)
      const specsObject = Object.fromEntries(cleanAttributes.map(a => [a.key, a.value]))

      const payload = {
        assetTag: form.assetTag,
        brand: form.brand,
        model: form.model,
        serialNumber: form.serialNumber,
        equipmentTypeId: form.equipmentTypeId,
        purchaseDate: form.purchaseDate,
        specificationsJson: JSON.stringify(specsObject),
        importSource: editingEquipment ? undefined : 'Manual'
      }

      if (editingEquipment) {
        await equipmentApi.put(`/equipments/${editingEquipment.id}`, {
          assetTag: payload.assetTag,
          brand: payload.brand,
          model: payload.model,
          purchaseDate: payload.purchaseDate,
          specificationsJson: payload.specificationsJson
        })
      } else {
        await equipmentApi.post('/equipments', payload)
      }

      setShowForm(false)
      setEditingEquipment(null)
      setForm(emptyForm)
      load()
    } catch (e) {
      alert(e.response?.data?.message ?? 'Error al guardar.')
    } finally {
      setSaving(false)
    }
  }

  const parseSpecs = (value) => {
    try {
      const parsed = JSON.parse(value || '{}')
      if (Array.isArray(parsed)) return parsed
      return Object.entries(parsed).map(([key, value]) => ({ key, value }))
    } catch {
      return []
    }
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>Gestión de Equipos</h1>
          <p style={{ margin: 0, color: '#888' }}>Registro y control del inventario tecnológico</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-secondary" onClick={() => navigate('/equipos/importar')}>
            Importar CSV
          </button>
          <button className="btn-primary" onClick={openNew}>+ Unitario</button>
        </div>
      </div>

      {error && <div className="alert-error">{error}<button onClick={() => setError('')}>✕</button></div>}

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
          <input
            placeholder="Buscar por código, asset tag, marca, modelo, serie..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid #ddd' }}
          />
          <button type="submit" className="btn-secondary">Buscar</button>
        </form>

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #ddd' }}
        >
          <option value="">Todos los estados</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

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
                <th style={th}>Laboratorio</th>
                <th style={thCenter}>Estado</th>
                <th style={thCenter}>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {equipments.map(eq => (
                <tr key={eq.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={td}>{eq.code}</td>
                  <td style={td}>{eq.assetTag}</td>
                  <td style={td}>{eq.equipmentType?.name}</td>
                  <td style={td}>{eq.brand}</td>
                  <td style={td}>{eq.model}</td>
                  <td style={td}>{eq.serialNumber}</td>
                  <td style={td}>{eq.laboratoryName ?? 'Sin asignar'}</td>

                  <td style={tdCenter}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        background:
                          eq.status === 'Activo'
                            ? '#dcfce7'
                            : eq.status === 'En mantenimiento'
                              ? '#fef9c3'
                              : '#fee2e2',
                        color: '#111827'
                      }}
                    >
                      {eq.status}
                    </span>
                  </td>

                  <td style={tdCenter}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem' }}>
                      <button
                        onClick={() => setShowDetail(eq)}
                        title="Ver ficha"
                        style={iconButton}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>

                      <button
                        onClick={() => openEdit(eq)}
                        title="Editar equipo"
                        style={iconButton}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {equipments.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                    No hay equipos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div style={overlay}>
          <div style={{ ...modal, maxWidth: 600 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>
                {editingEquipment ? 'Editar Equipo' : 'Registrar Equipo'}
              </h3>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={grid2}>
              <Field label="AssetTag *" value={form.assetTag} onChange={v => setForm({ ...form, assetTag: v })} placeholder="UTA-FISEI-001" />
              <Field
                label="N° Serie *"
                value={form.serialNumber}
                onChange={v => setForm({ ...form, serialNumber: v })}
                placeholder="SN123456"
                disabled={!!editingEquipment}
              />
              <Field label="Marca *" value={form.brand} onChange={v => setForm({ ...form, brand: v })} placeholder="HP, Dell..." />
              <Field label="Modelo *" value={form.model} onChange={v => setForm({ ...form, model: v })} placeholder="ProBook 450" />
              <Field label="Fecha de compra *" type="date" value={form.purchaseDate} onChange={v => setForm({ ...form, purchaseDate: v })} />
            </div>

            <div style={{ marginBottom: '0.75rem' }}>
              <label style={labelStyle}>Tipo de Equipo *</label>
              <select
                value={form.equipmentTypeId}
                onChange={e => setForm({ ...form, equipmentTypeId: e.target.value })}
                style={inputStyle}
                disabled={!!editingEquipment}
              >
                <option value="">Seleccione...</option>
                {types.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <hr style={{ margin: '1rem 0', borderColor: '#f0f0f0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <p style={{ fontWeight: 600, margin: 0 }}>Especificaciones</p>
              <button type="button" className="btn-secondary" onClick={addAttr} style={{ fontSize: '0.8rem' }}>
                Agregar
              </button>
            </div>

            {form.attributes.map((attr, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <input
                  placeholder="Clave, ej: RAM"
                  value={attr.key}
                  onChange={e => handleAttrChange(i, 'key', e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <input
                  placeholder="Valor, ej: 8GB"
                  value={attr.value}
                  onChange={e => handleAttrChange(i, 'value', e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => removeAttr(i)}
                  style={{ background: 'none', border: 'none', color: '#c0191f', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={handleSaveUnitario} disabled={saving}>
                {saving ? 'Guardando...' : editingEquipment ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetail && (
        <div style={overlay}>
          <div style={{ ...modal, maxWidth: 700 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Ficha Técnica</h3>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn-secondary"
                  onClick={() => window.print()}
                >
                  Imprimir
                </button>

                <button
                  className="btn-secondary"
                  onClick={() => {
                    const current = showDetail
                    setShowDetail(null)
                    openEdit(current)
                  }}
                >
                  Editar
                </button>
              </div>
            </div>

            {(() => {
              const lifecycle = getLifecycleStatus(showDetail.purchaseDate)

              return (
                <>
                  <div style={grid2}>
                    <Info label="Código" value={showDetail.code} />
                    <Info label="AssetTag" value={showDetail.assetTag} />
                    <Info label="Tipo" value={showDetail.equipmentType?.name} />
                    <Info label="Marca" value={showDetail.brand} />
                    <Info label="Modelo" value={showDetail.model} />
                    <Info label="N° Serie" value={showDetail.serialNumber} />
                    <Info label="Estado" value={showDetail.status} />
                    <Info label="Fecha de compra" value={showDetail.purchaseDate} />
                    <Info label="Origen" value={showDetail.importSource} />
                    <Info label="Responsable" value={showDetail.assignedUserName ?? 'Sin asignar'} />
                    <Info label="Laboratorio" value={showDetail.laboratoryName ?? 'Sin asignar'} />

                    <div style={{ marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#888', display: 'block' }}>
                        Vigencia de mantenimiento
                      </span>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.3rem 0.7rem',
                          borderRadius: '999px',
                          background: lifecycle.bg,
                          color: lifecycle.color,
                          fontWeight: 600,
                          fontSize: '0.85rem'
                        }}
                      >
                        {lifecycle.text}
                      </span>
                    </div>
                  </div>

                  {parseSpecs(showDetail.specificationsJson).length > 0 && (
                    <>
                      <hr style={{ margin: '1rem 0', borderColor: '#f0f0f0' }} />
                      <p style={{ fontWeight: 600, margin: '0 0 0.75rem' }}>Especificaciones</p>

                      <div style={{ display: 'grid', gap: '0.5rem' }}>
                        {parseSpecs(showDetail.specificationsJson).map((a, i) => (
                          <div
                            key={i}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '160px 1fr',
                              gap: '1rem',
                              padding: '0.5rem 0',
                              borderBottom: '1px solid #f5f5f5'
                            }}
                          >
                            <span style={{ fontWeight: 600 }}>{a.key}</span>
                            <span>{a.value}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}

const th = { padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.85rem' }
const td = { padding: '0.75rem 1rem' }

const overlay = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  overflowY: 'auto',
  padding: '1rem'
}

const modal = {
  background: '#fff',
  borderRadius: '12px',
  padding: '2rem',
  width: '100%',
  maxHeight: '90vh',
  overflowY: 'auto'
}

const grid2 = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '0.75rem',
  marginBottom: '0.75rem'
}

const labelStyle = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 600,
  marginBottom: '0.25rem',
  color: '#555'
}

const inputStyle = {
  width: '100%',
  padding: '0.5rem',
  borderRadius: '6px',
  border: '1px solid #ddd',
  boxSizing: 'border-box'
}

const thCenter = { ...th, textAlign: 'center' }
const tdCenter = { ...td, textAlign: 'center' }

const iconButton = {
  width: '36px',
  height: '36px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  background: '#fff',
  cursor: 'pointer',
  lineHeight: 0
}

function Field({ label, value, onChange, placeholder, type = 'text', disabled = false }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={inputStyle}
        disabled={disabled}
      />
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div style={{ marginBottom: '0.25rem' }}>
      <span style={{ fontSize: '0.75rem', color: '#888', display: 'block' }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value ?? '-'}</span>
    </div>
  )
}