import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { equipmentApi, userApi, locationApi } from '../../../services/api'
import '../../FormPage.css'

export default function NuevoEquipo() {
  const navigate = useNavigate()

  const [types, setTypes] = useState([])
  const [laboratoristas, setLaboratoristas] = useState([])
  const [laboratories, setLaboratories] = useState([])
  const [equipments, setEquipments] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    assetTag: '',
    brand: '',
    model: '',
    serialNumber: '',
    equipmentTypeId: '',
    purchaseDate: '',
    laboratoristaUserId: '',
    laboratoryId: '',
    attributes: [],
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        const [typRes, usersRes, labsRes, eqRes, locRes] = await Promise.allSettled([
          equipmentApi.get('/equipment-types'),
          userApi.get('/users'),
          locationApi.get('/laboratorios'),
          equipmentApi.get('/equipments'),
          locationApi.get('/equipment-locations'),
        ])
        if (typRes.status === 'fulfilled') setTypes(typRes.value.data)
        if (usersRes.status === 'fulfilled')
          setLaboratoristas(usersRes.value.data.filter(u => u.role === 'Laboratorista' && u.isActive))
        if (eqRes.status === 'fulfilled') setEquipments(eqRes.value.data)

        if (labsRes.status === 'fulfilled') {
          const labsData = labsRes.value.data
          const capacityResults = await Promise.allSettled(
            labsData.map(lab => locationApi.get(`/laboratorios/${lab.id}/capacidades`))
          )
          setLaboratories(labsData.map((lab, i) => ({
            ...lab,
            capacities: capacityResults[i].status === 'fulfilled' ? capacityResults[i].value.data : []
          })))
        }
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const getLaboratoryLabel = (lab) => {
    const base = `${lab.name}${lab.building ? ` — ${lab.building}` : ''}${lab.floor ? ` — ${lab.floor}` : ''}`
    if (!form.equipmentTypeId) return base
    const capacity = lab.capacities?.find(c => c.equipmentTypeId === form.equipmentTypeId)
    if (!capacity) return base
    const assigned = equipments.filter(
      eq => eq.laboratory?.id === lab.id && eq.equipmentType?.id === form.equipmentTypeId
    ).length
    return `${base}   (Cupos disponibles: ${capacity.maxCapacity - assigned})`
  }

  const handleAttrChange = (idx, field, value) => {
    const attrs = [...form.attributes]
    attrs[idx] = { ...attrs[idx], [field]: value }
    setForm({ ...form, attributes: attrs })
  }

  const handleSubmit = async () => {
    setError('')
    if (!form.assetTag || !form.brand || !form.model || !form.serialNumber || !form.equipmentTypeId || !form.purchaseDate) {
      return setError('Por favor completa todos los campos obligatorios (*).')
    }

    setSaving(true)
    try {
      const cleanAttrs = form.attributes.filter(a => a.key && a.value)
      const payload = {
        assetTag: form.assetTag.trim(),
        brand: form.brand.trim(),
        model: form.model.trim(),
        serialNumber: form.serialNumber.trim(),
        equipmentTypeId: form.equipmentTypeId,
        purchaseDate: form.purchaseDate,
        laboratoristaUserId: form.laboratoristaUserId || null,
        specificationsJson: JSON.stringify(Object.fromEntries(cleanAttrs.map(a => [a.key, a.value]))),
        importSource: 'Manual',
      }

      const res = await equipmentApi.post('/equipments', payload)
      const newId = res.data.id

      if (form.laboratoryId) {
        await locationApi.post('/equipment-locations/assign', {
          equipmentId: newId,
          laboratoryId: form.laboratoryId,
          notes: 'Asignado al registrar equipo',
        })
      }

      setSuccess(`Equipo registrado con código ${res.data.code}. Redirigiendo…`)
      setTimeout(() => navigate('/equipos'), 1800)
    } catch (e) {
      setError(e.response?.data?.message ?? 'Error al guardar el equipo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fp-page">
      {/* Cabecera */}
      <div className="fp-header">
        <button className="fp-back-btn" onClick={() => navigate('/equipos')}>
          ← Volver a Equipos
        </button>
        <div className="fp-heading">
          <h1 className="fp-title">Registrar Nuevo Equipo</h1>
          <p className="fp-subtitle">Completa la información del dispositivo a inventariar</p>
        </div>
      </div>

      {error && (
        <div className="fp-alert error"><span>⚠️</span> {error}</div>
      )}
      {success && (
        <div className="fp-alert success"><span>✓</span> {success}</div>
      )}

      {loading ? (
        <div className="fp-empty">Cargando datos del sistema…</div>
      ) : (
        <>
          {/* ── Datos del equipo ── */}
          <div className="fp-card">
            <div className="fp-card-header">
              <span className="fp-card-icon">🖥️</span>
              <span className="fp-card-title">Información del Dispositivo</span>
            </div>
            <div className="fp-card-body">
              <div className="fp-grid-2">
                <div className="fp-field">
                  <label className="fp-label">AssetTag *</label>
                  <input className="fp-input" value={form.assetTag} onChange={e => setForm({ ...form, assetTag: e.target.value })} placeholder="Ej: UTA-FISEI-001" />
                </div>
                <div className="fp-field">
                  <label className="fp-label">N° de Serie *</label>
                  <input className="fp-input" value={form.serialNumber} onChange={e => setForm({ ...form, serialNumber: e.target.value })} placeholder="Ej: SN123456" />
                </div>
                <div className="fp-field">
                  <label className="fp-label">Marca *</label>
                  <input className="fp-input" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} placeholder="HP, Dell, Epson…" />
                </div>
                <div className="fp-field">
                  <label className="fp-label">Modelo *</label>
                  <input className="fp-input" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} placeholder="ProBook 450 G8" />
                </div>
                <div className="fp-field">
                  <label className="fp-label">Tipo de Equipo *</label>
                  <select
                    className="fp-select"
                    value={form.equipmentTypeId}
                    onChange={e => setForm({ ...form, equipmentTypeId: e.target.value, laboratoryId: '' })}
                  >
                    <option value="">Seleccione un tipo…</option>
                    {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="fp-field">
                  <label className="fp-label">Fecha de Compra *</label>
                  <input className="fp-input" type="date" value={form.purchaseDate} onChange={e => setForm({ ...form, purchaseDate: e.target.value })} />
                </div>
              </div>
            </div>
          </div>

          {/* ── Asignación ── */}
          <div className="fp-card">
            <div className="fp-card-header">
              <span className="fp-card-icon">📍</span>
              <span className="fp-card-title">Asignación</span>
            </div>
            <div className="fp-card-body">
              <div className="fp-grid-2">
                <div className="fp-field">
                  <label className="fp-label">Laboratorista responsable</label>
                  <select className="fp-select" value={form.laboratoristaUserId} onChange={e => setForm({ ...form, laboratoristaUserId: e.target.value })}>
                    <option value="">Sin asignar</option>
                    {laboratoristas.map(u => <option key={u.id} value={u.id}>{u.fullName} — {u.email}</option>)}
                  </select>
                </div>
                <div className="fp-field">
                  <label className="fp-label">Laboratorio</label>
                  <select
                    className="fp-select"
                    value={form.laboratoryId}
                    onChange={e => setForm({ ...form, laboratoryId: e.target.value })}
                    disabled={!form.equipmentTypeId}
                  >
                    <option value="">Sin asignar</option>
                    {laboratories.map(l => <option key={l.id} value={l.id}>{getLaboratoryLabel(l)}</option>)}
                  </select>
                  {!form.equipmentTypeId && (
                    <span className="fp-field-hint">Selecciona el tipo de equipo primero para ver los cupos.</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Especificaciones ── */}
          <div className="fp-card">
            <div className="fp-card-header">
              <span className="fp-card-icon">🔧</span>
              <span className="fp-card-title">Especificaciones técnicas</span>
            </div>
            <div className="fp-card-body">
              {form.attributes.length === 0 && (
                <p className="fp-empty" style={{ padding: 'var(--space-4) 0' }}>
                  Sin especificaciones aún. Agrega pares clave-valor.
                </p>
              )}
              <div className="fp-attrs-list">
                {form.attributes.map((attr, i) => (
                  <div key={i} className="fp-attr-row">
                    <input className="fp-input" placeholder="Clave (ej: RAM)" value={attr.key} onChange={e => handleAttrChange(i, 'key', e.target.value)} />
                    <input className="fp-input" placeholder="Valor (ej: 8 GB)" value={attr.value} onChange={e => handleAttrChange(i, 'value', e.target.value)} />
                    <button className="fp-attr-remove" onClick={() => setForm({ ...form, attributes: form.attributes.filter((_, j) => j !== i) })}>✕</button>
                  </div>
                ))}
              </div>
              <button
                className="fp-add-attr-btn"
                onClick={() => setForm({ ...form, attributes: [...form.attributes, { key: '', value: '' }] })}
              >
                + Agregar especificación
              </button>
            </div>
            <div className="fp-actions">
              <button className="fp-btn btn-secondary" onClick={() => navigate('/equipos')}>Cancelar</button>
              <button className="fp-btn btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? <><span className="fp-btn-spinner" /> Guardando…</> : '✓ Registrar equipo'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
