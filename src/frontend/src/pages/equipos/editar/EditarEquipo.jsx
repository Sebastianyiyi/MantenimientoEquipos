import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { equipmentApi, userApi, locationApi } from '../../../services/api'
import '../../FormPage.css'

export default function EditarEquipo() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [types, setTypes] = useState([])
  const [laboratoristas, setLaboratoristas] = useState([])
  const [laboratories, setLaboratories] = useState([])
  const [equipments, setEquipments] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [originalLab, setOriginalLab] = useState('')

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

  const parseSpecs = (value) => {
    try {
      const parsed = JSON.parse(value || '{}')
      if (Array.isArray(parsed)) return parsed
      return Object.entries(parsed).map(([key, value]) => ({ key, value }))
    } catch { return [] }
  }

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [eqRes, typRes, usersRes, labsRes, allEqRes, locRes] = await Promise.allSettled([
          equipmentApi.get(`/equipments/${id}`),
          equipmentApi.get('/equipment-types'),
          userApi.get('/users'),
          locationApi.get('/laboratorios'),
          equipmentApi.get('/equipments'),
          locationApi.get(`/equipment-locations/current/${id}`),
        ])

        if (eqRes.status !== 'fulfilled') throw new Error('Equipo no encontrado')
        const eq = eqRes.value.data

        if (typRes.status === 'fulfilled') setTypes(typRes.value.data)
        if (usersRes.status === 'fulfilled')
          setLaboratoristas(usersRes.value.data.filter(u => u.role === 'Laboratorista' && u.isActive))
        if (allEqRes.status === 'fulfilled') setEquipments(allEqRes.value.data)

        const currentLabId = locRes.status === 'fulfilled' ? locRes.value.data?.laboratory?.id ?? '' : ''
        setOriginalLab(currentLabId)

        if (labsRes.status === 'fulfilled') {
          const labsData = labsRes.value.data
          const capResults = await Promise.allSettled(
            labsData.map(l => locationApi.get(`/laboratorios/${l.id}/capacidades`))
          )
          setLaboratories(labsData.map((l, i) => ({
            ...l,
            capacities: capResults[i].status === 'fulfilled' ? capResults[i].value.data : []
          })))
        }

        setForm({
          assetTag: eq.assetTag ?? '',
          brand: eq.brand ?? '',
          model: eq.model ?? '',
          serialNumber: eq.serialNumber ?? '',
          equipmentTypeId: eq.equipmentType?.id ?? '',
          purchaseDate: eq.purchaseDate ?? '',
          laboratoristaUserId: eq.laboratoristaUserId ?? '',
          laboratoryId: currentLabId,
          attributes: parseSpecs(eq.specificationsJson),
        })
      } catch (e) {
        setError('No se pudo cargar el equipo. ' + (e.message ?? ''))
      } finally {
        setLoadingData(false)
      }
    }
    loadAll()
  }, [id])

  const getLaboratoryLabel = (lab) => {
    const base = `${lab.name}${lab.building ? ` — ${lab.building}` : ''}${lab.floor ? ` — ${lab.floor}` : ''}`
    if (!form.equipmentTypeId) return base
    const capacity = lab.capacities?.find(c => c.equipmentTypeId === form.equipmentTypeId)
    if (!capacity) return base
    const assigned = equipments.filter(
      eq => eq.laboratory?.id === lab.id && eq.equipmentType?.id === form.equipmentTypeId
    ).length
    return `${base}   (Cupos: ${capacity.maxCapacity - assigned})`
  }

  const handleAttrChange = (idx, field, value) => {
    const attrs = [...form.attributes]
    attrs[idx] = { ...attrs[idx], [field]: value }
    setForm({ ...form, attributes: attrs })
  }

  const handleSubmit = async () => {
    setError('')
    if (!form.assetTag || !form.brand || !form.model || !form.purchaseDate) {
      return setError('Completa los campos obligatorios.')
    }

    setSaving(true)
    try {
      const cleanAttrs = form.attributes.filter(a => a.key && a.value)
      await equipmentApi.put(`/equipments/${id}`, {
        assetTag: form.assetTag.trim(),
        brand: form.brand.trim(),
        model: form.model.trim(),
        purchaseDate: form.purchaseDate,
        specificationsJson: JSON.stringify(Object.fromEntries(cleanAttrs.map(a => [a.key, a.value]))),
        laboratoristaUserId: form.laboratoristaUserId || null,
      })

      // Manejo de ubicación
      if (form.laboratoryId && form.laboratoryId !== originalLab) {
        await locationApi.post('/equipment-locations/assign', {
          equipmentId: id,
          laboratoryId: form.laboratoryId,
          notes: 'Actualizado desde edición de equipo',
        })
      } else if (!form.laboratoryId && originalLab) {
        await locationApi.patch(`/equipment-locations/remove/${id}`, {
          notes: 'Removido desde edición de equipo',
        })
      }

      setSuccess('Equipo actualizado correctamente. Volviendo…')
      setTimeout(() => navigate('/equipos'), 1600)
    } catch (e) {
      setError(e.response?.data?.message ?? 'Error al actualizar el equipo.')
    } finally {
      setSaving(false)
    }
  }

  if (loadingData) {
    return (
      <div className="fp-page">
        <div className="fp-empty">Cargando datos del equipo…</div>
      </div>
    )
  }

  return (
    <div className="fp-page">
      <div className="fp-header">
        <button className="fp-back-btn" onClick={() => navigate('/equipos')}>
          ← Volver a Equipos
        </button>
        <div className="fp-heading">
          <h1 className="fp-title">Editar Equipo</h1>
          <p className="fp-subtitle">Serie: <strong>{form.serialNumber}</strong></p>
        </div>
      </div>

      {error && <div className="fp-alert error"><span>⚠️</span> {error}</div>}
      {success && <div className="fp-alert success"><span>✓</span> {success}</div>}

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
              <input className="fp-input" value={form.assetTag} onChange={e => setForm({ ...form, assetTag: e.target.value })} />
            </div>
            <div className="fp-field">
              <label className="fp-label">N° de Serie (no editable)</label>
              <input className="fp-input fp-input-readonly" value={form.serialNumber} readOnly />
            </div>
            <div className="fp-field">
              <label className="fp-label">Marca *</label>
              <input className="fp-input" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} />
            </div>
            <div className="fp-field">
              <label className="fp-label">Modelo *</label>
              <input className="fp-input" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} />
            </div>
            <div className="fp-field">
              <label className="fp-label">Tipo de Equipo (no editable)</label>
              <select className="fp-select" value={form.equipmentTypeId} disabled>
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
              <select className="fp-select" value={form.laboratoryId} onChange={e => setForm({ ...form, laboratoryId: e.target.value })}>
                <option value="">Sin asignar</option>
                {laboratories.map(l => <option key={l.id} value={l.id}>{getLaboratoryLabel(l)}</option>)}
              </select>
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
            <p className="fp-empty" style={{ padding: 'var(--space-4) 0' }}>Sin especificaciones. Agrega pares clave-valor.</p>
          )}
          <div className="fp-attrs-list">
            {form.attributes.map((attr, i) => (
              <div key={i} className="fp-attr-row">
                <input className="fp-input" placeholder="Clave" value={attr.key} onChange={e => handleAttrChange(i, 'key', e.target.value)} />
                <input className="fp-input" placeholder="Valor" value={attr.value} onChange={e => handleAttrChange(i, 'value', e.target.value)} />
                <button className="fp-attr-remove" onClick={() => setForm({ ...form, attributes: form.attributes.filter((_, j) => j !== i) })}>✕</button>
              </div>
            ))}
          </div>
          <button className="fp-add-attr-btn" onClick={() => setForm({ ...form, attributes: [...form.attributes, { key: '', value: '' }] })}>
            + Agregar especificación
          </button>
        </div>
        <div className="fp-actions">
          <button className="fp-btn btn-secondary" onClick={() => navigate('/equipos')}>Cancelar</button>
          <button className="fp-btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? <><span className="fp-btn-spinner" /> Guardando…</> : '✓ Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}
