import { useState, useEffect, useCallback } from 'react'
import { equipmentApi, locationApi } from '../../services/api'

const STATUSES = ['Activo', 'En mantenimiento', 'Dado de baja']

export default function Equipos() {
  const [equipments, setEquipments] = useState([])
  const [types, setTypes] = useState([])
  const [labs, setLabs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState(null)
  const [formMode, setFormMode] = useState('unitario') // 'unitario' | 'lote'
  const [saving, setSaving] = useState(false)

  const emptyForm = {
    code: '', brand: '', model: '', serialNumber: '',
    equipmentTypeId: '',
    attributes: [],
    purchase: { purchaseDate: '', price: '', supplier: '', invoiceNumber: '', notes: '' }
  }
  const [form, setForm] = useState(emptyForm)

  // Lote
  const [batchRows, setBatchRows] = useState([{ ...emptyForm }])

  const load = useCallback(async (searchTerm = search) => {
    try {
      setLoading(true)
      const params = {}
      if (filterStatus) params.status = filterStatus
      if (searchTerm) params.search = searchTerm
      const [eqRes, typRes, labRes] = await Promise.all([
        equipmentApi.get('/equipments', { params }),
        equipmentApi.get('/equipment-types'),
        locationApi.get('/laboratorios')
      ])
      setEquipments(eqRes.data)
      setTypes(typRes.data)
      setLabs(labRes.data)
    } catch {
      setError('Error al cargar datos.')
    } finally {
      setLoading(false)
    }
  }, [filterStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load()
  }, [filterStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e) => {
    e.preventDefault()
    load(search)
  }

  const openNew = (mode) => {
    setFormMode(mode)
    setForm(emptyForm)
    setBatchRows([{ ...emptyForm }])
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
    if (!form.code || !form.brand || !form.model || !form.serialNumber || !form.equipmentTypeId)
      return alert('Complete los campos obligatorios.')
    setSaving(true)
    try {
      await equipmentApi.post('/equipments', {
        code: form.code,
        brand: form.brand,
        model: form.model,
        serialNumber: form.serialNumber,
        equipmentTypeId: form.equipmentTypeId,
        attributes: form.attributes.filter(a => a.key && a.value),
        purchase: form.purchase.purchaseDate ? {
          purchaseDate: form.purchase.purchaseDate,
          price: parseFloat(form.purchase.price) || 0,
          supplier: form.purchase.supplier,
          invoiceNumber: form.purchase.invoiceNumber,
          notes: form.purchase.notes
        } : null
      })
      setShowForm(false)
      load()
    } catch (e) {
      alert(e.response?.data?.message ?? 'Error al guardar.')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveLote = async () => {
    const valid = batchRows.every(r => r.code && r.brand && r.model && r.serialNumber && r.equipmentTypeId)
    if (!valid) return alert('Complete todos los campos obligatorios en cada fila.')
    setSaving(true)
    try {
      const res = await equipmentApi.post('/equipments/batch', batchRows.map(r => ({
        code: r.code, brand: r.brand, model: r.model,
        serialNumber: r.serialNumber, equipmentTypeId: r.equipmentTypeId,
        attributes: [], purchase: null
      })))
      const failures = res.data.filter(r => !r.success)
      if (failures.length > 0)
        alert(`${failures.length} equipo(s) no se registraron:\n${failures.map(f => `${f.serialNumber}: ${f.error}`).join('\n')}`)
      setShowForm(false)
      load()
    } catch (e) {
      alert(e.response?.data?.message ?? 'Error al guardar lote.')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (id, status) => {
    try {
      await equipmentApi.patch(`/equipments/${id}/status`, { status })
      load()
    } catch (e) {
      alert(e.response?.data?.message ?? 'Error al cambiar estado.')
    }
  }

  return (
    <div style={{ padding: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>Gestión de Equipos</h1>
          <p style={{ margin: 0, color: '#888' }}>Registro y control del inventario tecnológico</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-primary" onClick={() => openNew('unitario')}>+ Registrar Equipo</button>
          <button className="btn-secondary" onClick={() => openNew('lote')}>+ Registrar Lote</button>
        </div>
      </div>

      {error && <div className="alert-error">{error}<button onClick={() => setError('')}>✕</button></div>}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
          <input
            placeholder="Buscar por código, marca, modelo, serie..."
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

      {/* Tabla */}
      {loading ? <p>Cargando...</p> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <th style={th}>Código</th>
                <th style={th}>Marca / Modelo</th>
                <th style={th}>N° Serie</th>
                <th style={th}>Tipo</th>
                <th style={th}>Estado</th>
                <th style={th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {equipments.map(eq => (
                <tr key={eq.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={td}>{eq.code}</td>
                  <td style={td}>{eq.brand} {eq.model}</td>
                  <td style={td}>{eq.serialNumber}</td>
                  <td style={td}>{eq.equipmentType?.name}</td>
                  <td style={td}>
                    <select
                      value={eq.status}
                      onChange={e => handleStatusChange(eq.id, e.target.value)}
                      style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        background: eq.status === 'Activo' ? '#dcfce7' : eq.status === 'En mantenimiento' ? '#fef9c3' : '#fee2e2'
                      }}
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td style={td}>
                    <button className="btn-icon" onClick={() => setShowDetail(eq)} title="Ver ficha">👁️</button>
                  </td>
                </tr>
              ))}
              {equipments.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>No hay equipos registrados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Registro */}
      {showForm && (
        <div style={overlay}>
          <div style={{ ...modal, maxWidth: formMode === 'lote' ? '900px' : '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>
                {formMode === 'unitario' ? 'Registrar Equipo' : 'Registrar por Lote'}
              </h3>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            {formMode === 'unitario' ? (
              <>
                <div style={grid2}>
                  <Field label="Código *" value={form.code} onChange={v => setForm({ ...form, code: v })} placeholder="EJ: EQ-001" />
                  <Field label="N° Serie *" value={form.serialNumber} onChange={v => setForm({ ...form, serialNumber: v })} placeholder="SN123456" />
                  <Field label="Marca *" value={form.brand} onChange={v => setForm({ ...form, brand: v })} placeholder="HP, Dell..." />
                  <Field label="Modelo *" value={form.model} onChange={v => setForm({ ...form, model: v })} placeholder="ProBook 450" />
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={labelStyle}>Tipo de Equipo *</label>
                  <select value={form.equipmentTypeId} onChange={e => setForm({ ...form, equipmentTypeId: e.target.value })} style={inputStyle}>
                    <option value="">Seleccione...</option>
                    {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>

                <hr style={{ margin: '1rem 0', borderColor: '#f0f0f0' }} />
                <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Datos de Compra</p>
                <div style={grid2}>
                  <Field label="Fecha de compra" type="date" value={form.purchase.purchaseDate} onChange={v => setForm({ ...form, purchase: { ...form.purchase, purchaseDate: v } })} />
                  <Field label="Precio" type="number" value={form.purchase.price} onChange={v => setForm({ ...form, purchase: { ...form.purchase, price: v } })} placeholder="0.00" />
                  <Field label="Proveedor" value={form.purchase.supplier} onChange={v => setForm({ ...form, purchase: { ...form.purchase, supplier: v } })} />
                  <Field label="N° Factura" value={form.purchase.invoiceNumber} onChange={v => setForm({ ...form, purchase: { ...form.purchase, invoiceNumber: v } })} />
                </div>

                <hr style={{ margin: '1rem 0', borderColor: '#f0f0f0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <p style={{ fontWeight: 600, margin: 0 }}>Características</p>
                  <button className="btn-secondary" onClick={addAttr} style={{ fontSize: '0.8rem' }}>+ Agregar</button>
                </div>
                {form.attributes.map((attr, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <input placeholder="Clave (ej: RAM)" value={attr.key} onChange={e => handleAttrChange(i, 'key', e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                    <input placeholder="Valor (ej: 8GB)" value={attr.value} onChange={e => handleAttrChange(i, 'value', e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                    <button onClick={() => removeAttr(i)} style={{ background: 'none', border: 'none', color: '#c0191f', cursor: 'pointer' }}>✕</button>
                  </div>
                ))}
              </>
            ) : (
              <>
                <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '1rem' }}>Ingrese los equipos del lote. Todos comparten el mismo tipo de equipo.</p>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb' }}>
                        {['Código *', 'Marca *', 'Modelo *', 'N° Serie *', 'Tipo *', ''].map(h => (
                          <th key={h} style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {batchRows.map((row, i) => (
                        <tr key={i}>
                          {['code', 'brand', 'model', 'serialNumber'].map(f => (
                            <td key={f} style={{ padding: '0.25rem' }}>
                              <input value={row[f]} onChange={e => {
                                const rows = [...batchRows]
                                rows[i] = { ...rows[i], [f]: e.target.value }
                                setBatchRows(rows)
                              }} style={{ ...inputStyle, minWidth: '100px' }} />
                            </td>
                          ))}
                          <td style={{ padding: '0.25rem' }}>
                            <select value={row.equipmentTypeId} onChange={e => {
                              const rows = [...batchRows]
                              rows[i] = { ...rows[i], equipmentTypeId: e.target.value }
                              setBatchRows(rows)
                            }} style={inputStyle}>
                              <option value="">Tipo...</option>
                              {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: '0.25rem' }}>
                            <button onClick={() => setBatchRows(batchRows.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#c0191f', cursor: 'pointer' }}>✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button className="btn-secondary" onClick={() => setBatchRows([...batchRows, { ...emptyForm }])} style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                  + Agregar fila
                </button>
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              <button className="btn-primary" onClick={formMode === 'unitario' ? handleSaveUnitario : handleSaveLote} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ficha */}
      {showDetail && (
        <div style={overlay}>
          <div style={{ ...modal, maxWidth: '550px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Ficha Técnica</h3>
              <button onClick={() => setShowDetail(null)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={grid2}>
              <Info label="Código" value={showDetail.code} />
              <Info label="Tipo" value={showDetail.equipmentType?.name} />
              <Info label="Marca" value={showDetail.brand} />
              <Info label="Modelo" value={showDetail.model} />
              <Info label="N° Serie" value={showDetail.serialNumber} />
              <Info label="Estado" value={showDetail.status} />
            </div>
            {showDetail.purchase && (
              <>
                <hr style={{ margin: '1rem 0', borderColor: '#f0f0f0' }} />
                <p style={{ fontWeight: 600, margin: '0 0 0.5rem' }}>Compra</p>
                <div style={grid2}>
                  <Info label="Fecha" value={showDetail.purchase.purchaseDate?.slice(0, 10)} />
                  <Info label="Precio" value={`$${showDetail.purchase.price}`} />
                  <Info label="Proveedor" value={showDetail.purchase.supplier} />
                  <Info label="Factura" value={showDetail.purchase.invoiceNumber} />
                </div>
              </>
            )}
            {showDetail.attributes?.length > 0 && (
              <>
                <hr style={{ margin: '1rem 0', borderColor: '#f0f0f0' }} />
                <p style={{ fontWeight: 600, margin: '0 0 0.5rem' }}>Características</p>
                {showDetail.attributes.map((a, i) => (
                  <div key={i} style={{ display: 'flex', gap: '1rem', marginBottom: '0.3rem', fontSize: '0.9rem' }}>
                    <span style={{ fontWeight: 500, minWidth: '120px' }}>{a.key}:</span>
                    <span>{a.value}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Helpers de estilo
const th = { padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.85rem' }
const td = { padding: '0.75rem 1rem' }
const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, overflowY: 'auto', padding: '1rem' }
const modal = { background: '#fff', borderRadius: '12px', padding: '2rem', width: '100%', maxHeight: '90vh', overflowY: 'auto' }
const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }
const labelStyle = { display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem', color: '#555' }
const inputStyle = { width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box' }

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div style={{ marginBottom: '0.25rem' }}>
      <span style={{ fontSize: '0.75rem', color: '#888', display: 'block' }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value ?? '—'}</span>
    </div>
  )
}