import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { equipmentApi, userApi, locationApi } from '../../../services/api'
import BackButton from '../../../components/BackButton'
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
    } catch {
      return []
    }
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
        if (usersRes.status === 'fulfilled') {
          setLaboratoristas(usersRes.value.data.filter(u => u.role === 'Laboratorista' && u.isActive))
        }
        if (allEqRes.status === 'fulfilled') setEquipments(allEqRes.value.data)

        const currentLabId =
          locRes.status === 'fulfilled' ? locRes.value.data?.laboratory?.id ?? '' : ''
        setOriginalLab(currentLabId)

        if (labsRes.status === 'fulfilled') {
          const labsData = labsRes.value.data
          const capResults = await Promise.allSettled(
            labsData.map(l => locationApi.get(`/laboratorios/${l.id}/capacidades`))
          )

          setLaboratories(
            labsData.map((l, i) => ({
              ...l,
              capacities: capResults[i].status === 'fulfilled' ? capResults[i].value.data : [],
            }))
          )
        }

        setForm({
          assetTag: eq.assetTag ?? '',
          brand: eq.brand ?? '',
          model: eq.model ?? '',
          serialNumber: eq.serialNumber ?? '',
          equipmentTypeId: eq.equipmentType?.id ?? '',
          purchaseDate: eq.purchaseDate ? eq.purchaseDate.slice(0, 10) : '',
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

    return `${base} (Cupos: ${capacity.maxCapacity - assigned})`
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
        specificationsJson: JSON.stringify(
          Object.fromEntries(cleanAttrs.map(a => [a.key, a.value]))
        ),
        laboratoristaUserId: form.laboratoristaUserId || null,
      })

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

  const pageStyle = {
    width: '100%',
    maxWidth: '1120px',
    margin: '0 auto',
    padding: '2rem 1.25rem 3rem',
  }

  const sectionTitleStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.55rem',
    marginBottom: '1rem',
    color: '#9ca3af',
    fontSize: '0.72rem',
    fontWeight: 700,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
  }

  const sectionBlockStyle = {
    paddingTop: '2rem',
    marginTop: '2rem',
    borderTop: '1px solid #ececec',
  }

  const grid2 = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '1.45rem 2rem',
  }

  const fieldStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.45rem',
  }

  const labelStyle = {
    fontSize: '0.68rem',
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: '#9ca3af',
  }

  const inputStyle = {
    height: '46px',
    borderRadius: '14px',
    border: '1px solid #e5e7eb',
    background: '#fff',
    padding: '0 0.95rem',
    fontSize: '0.96rem',
    color: '#111827',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const readOnlyStyle = {
    ...inputStyle,
    background: '#f3f4f6',
    color: '#9ca3af',
  }

  const iconButtonStyle = {
    background: 'transparent',
    border: 'none',
    color: '#9ca3af',
    fontWeight: 600,
    padding: 0,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.45rem',
    cursor: 'pointer',
  }

  const actionBtn = {
    height: '42px',
    padding: '0 1.15rem',
    borderRadius: '14px',
    border: '1px solid #e5e7eb',
    background: '#fff',
    color: '#6b7280',
    fontSize: '0.95rem',
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.55rem',
    cursor: 'pointer',
  }

  const primaryBtn = {
    ...actionBtn,
    minWidth: '178px',
    background: '#c81e3a',
    border: '1px solid #c81e3a',
    color: '#fff',
    boxShadow: '0 8px 20px rgba(200, 30, 58, 0.18)',
  }

  if (loadingData) {
    return (
      <div className="fp-page">
        <div className="fp-empty">Cargando datos del equipo…</div>
      </div>
    )
  }

  return (
    <div className="fp-page" style={pageStyle}>
      <BackButton to="/equipos" label="Volver a Equipos" />

      <div style={{ marginBottom: '2.1rem' }}>
        <h1
          className="fp-title"
          style={{
            margin: 0,
            fontSize: '2.25rem',
            lineHeight: 1.1,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: '#111827',
          }}
        >
          Editar Equipo
        </h1>

        <p
          className="fp-subtitle"
          style={{
            margin: '0.5rem 0 0',
            color: '#9ca3af',
            fontSize: '1rem',
          }}
        >
          {form.brand} {form.model} <span style={{ color: '#d1d5db' }}>—</span> Serie:{' '}
          <strong style={{ color: '#c81e3a' }}>{form.serialNumber}</strong>
        </p>
      </div>

      {error && <div className="fp-alert error"><span>⚠️</span> {error}</div>}
      {success && <div className="fp-alert success"><span>✓</span> {success}</div>}

      <section>
        <div style={sectionTitleStyle}>
          <span>🖥️</span>
          <span>Información del dispositivo</span>
        </div>

        <div style={grid2}>
          <div style={fieldStyle}>
            <label className="fp-label" style={labelStyle}>AssetTag *</label>
            <input
              className="fp-input"
              style={inputStyle}
              value={form.assetTag}
              onChange={e => setForm({ ...form, assetTag: e.target.value })}
            />
          </div>

          <div style={fieldStyle}>
            <label className="fp-label" style={labelStyle}>N° de Serie (no editable)</label>
            <input
              className="fp-input fp-input-readonly"
              style={readOnlyStyle}
              value={form.serialNumber}
              readOnly
            />
          </div>

          <div style={fieldStyle}>
            <label className="fp-label" style={labelStyle}>Marca *</label>
            <input
              className="fp-input"
              style={inputStyle}
              value={form.brand}
              onChange={e => setForm({ ...form, brand: e.target.value })}
            />
          </div>

          <div style={fieldStyle}>
            <label className="fp-label" style={labelStyle}>Modelo *</label>
            <input
              className="fp-input"
              style={inputStyle}
              value={form.model}
              onChange={e => setForm({ ...form, model: e.target.value })}
            />
          </div>

          <div style={fieldStyle}>
            <label className="fp-label" style={labelStyle}>Tipo de Equipo (no editable)</label>
            <select
              className="fp-select"
              style={readOnlyStyle}
              value={form.equipmentTypeId}
              disabled
            >
              {types.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div style={fieldStyle}>
            <label className="fp-label" style={labelStyle}>Fecha de compra *</label>
            <input
              className="fp-input"
              style={inputStyle}
              type="date"
              value={form.purchaseDate}
              onChange={e => setForm({ ...form, purchaseDate: e.target.value })}
            />
          </div>
        </div>
      </section>

      <section style={sectionBlockStyle}>
        <div style={sectionTitleStyle}>
          <span>📍</span>
          <span>Asignación</span>
        </div>

        <div style={grid2}>
          <div style={fieldStyle}>
            <label className="fp-label" style={labelStyle}>Laboratorista responsable</label>
            <select
              className="fp-select"
              style={inputStyle}
              value={form.laboratoristaUserId}
              onChange={e => setForm({ ...form, laboratoristaUserId: e.target.value })}
            >
              <option value="">Sin asignar</option>
              {laboratoristas.map(u => (
                <option key={u.id} value={u.id}>
                  {u.fullName} — {u.email}
                </option>
              ))}
            </select>
          </div>

          <div style={fieldStyle}>
            <label className="fp-label" style={labelStyle}>Laboratorio</label>
            <select
              className="fp-select"
              style={inputStyle}
              value={form.laboratoryId}
              onChange={e => setForm({ ...form, laboratoryId: e.target.value })}
            >
              <option value="">Sin asignar</option>
              {laboratories.map(l => (
                <option key={l.id} value={l.id}>
                  {getLaboratoryLabel(l)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section style={sectionBlockStyle}>
        <div style={sectionTitleStyle}>
          <span>⚙️</span>
          <span>Especificaciones técnicas</span>
        </div>

        {form.attributes.length === 0 && (
          <p className="fp-empty" style={{ padding: '0.75rem 0 1rem', color: '#9ca3af' }}>
            Sin especificaciones. Agrega pares clave-valor.
          </p>
        )}

        <div
          className="fp-attrs-list"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.8rem',
          }}
        >
          {form.attributes.map((attr, i) => (
            <div
              key={i}
              className="fp-attr-row"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 46px',
                gap: '0.7rem',
                alignItems: 'center',
              }}
            >
              <input
                className="fp-input"
                style={inputStyle}
                placeholder="Clave"
                value={attr.key}
                onChange={e => handleAttrChange(i, 'key', e.target.value)}
              />

              <input
                className="fp-input"
                style={inputStyle}
                placeholder="Valor"
                value={attr.value}
                onChange={e => handleAttrChange(i, 'value', e.target.value)}
              />

              <button
                className="fp-attr-remove"
                onClick={() =>
                  setForm({
                    ...form,
                    attributes: form.attributes.filter((_, j) => j !== i),
                  })
                }
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '12px',
                  border: '1px solid #f1f1f1',
                  background: '#fff',
                  color: '#e7a8b5',
                  fontSize: '1rem',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <button
          className="fp-add-attr-btn"
          onClick={() =>
            setForm({
              ...form,
              attributes: [...form.attributes, { key: '', value: '' }],
            })
          }
          style={{
            marginTop: '1rem',
            height: '38px',
            borderRadius: '10px',
            border: '1px solid #ececec',
            background: '#fff',
            color: '#9ca3af',
            fontWeight: 700,
            padding: '0 0.95rem',
            cursor: 'pointer',
          }}
        >
          + Agregar especificación
        </button>
      </section>

      <div
        className="fp-actions"
        style={{
          marginTop: '2.5rem',
          paddingTop: '2rem',
          borderTop: '1px solid #ececec',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.9rem',
          flexWrap: 'wrap',
        }}
      >
        <button
          className="fp-btn btn-secondary"
          style={actionBtn}
          onClick={() => navigate('/equipos')}
        >
          Cancelar
        </button>

        <button
          className="fp-btn btn-primary"
          style={primaryBtn}
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <>
              <span className="fp-btn-spinner" /> Guardando…
            </>
          ) : (
            <>💾 Guardar cambios</>
          )}
        </button>
      </div>
    </div>
  )
}