import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { equipmentApi, userApi, locationApi } from '../../../services/api'
import BackButton from '../../../components/BackButton'
import '../../FormPage.css'

function DeviceIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="4" y="3" width="12" height="14" rx="2" />
      <path d="M8 21h4" />
      <path d="M10 17v4" />
      <path d="M20 7v6" />
      <path d="M17 10h6" />
    </svg>
  )
}

function AssignmentIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function SpecsIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M9 9h6" />
      <path d="M9 12h6" />
      <path d="M9 15h3" />
    </svg>
  )
}

function ChevronDown(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

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
  const [specsOpen, setSpecsOpen] = useState(true)

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
        const [typRes, usersRes, labsRes, eqRes] = await Promise.allSettled([
          equipmentApi.get('/equipment-types'),
          userApi.get('/users'),
          locationApi.get('/laboratorios'),
          equipmentApi.get('/equipments'),
        ])

        if (typRes.status === 'fulfilled') setTypes(typRes.value.data)

        if (usersRes.status === 'fulfilled') {
          setLaboratoristas(
            usersRes.value.data.filter(u => u.role === 'Laboratorista' && u.isActive)
          )
        }

        if (eqRes.status === 'fulfilled') setEquipments(eqRes.value.data)

        if (labsRes.status === 'fulfilled') {
          const labsData = labsRes.value.data
          const capRes = await Promise.allSettled(
            labsData.map(lab => locationApi.get(`/laboratorios/${lab.id}/capacidades`))
          )

          setLaboratories(
            labsData.map((lab, i) => ({
              ...lab,
              capacities: capRes[i].status === 'fulfilled' ? capRes[i].value.data : []
            }))
          )
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

    return `${base} (${capacity.maxCapacity - assigned} cupos disponibles)`
  }

  const handleAttrChange = (idx, field, value) => {
    const attrs = [...form.attributes]
    attrs[idx] = { ...attrs[idx], [field]: value }
    setForm({ ...form, attributes: attrs })
  }

  const handleSubmit = async () => {
    setError('')

    if (
      !form.assetTag ||
      !form.brand ||
      !form.model ||
      !form.serialNumber ||
      !form.equipmentTypeId ||
      !form.purchaseDate
    ) {
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
        specificationsJson: JSON.stringify(
          Object.fromEntries(cleanAttrs.map(a => [a.key, a.value]))
        ),
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
    <div className="fp-page fp-page-device">
      <BackButton to="/equipos" label="Volver a Equipos" />
      <div className="fp-heading fp-heading-simple">
        <h1 className="fp-title">Registrar Nuevo Equipo</h1>
        <p className="fp-subtitle">
          Completa la información técnica y administrativa del dispositivo.
        </p>
      </div>

      {error && <div className="fp-alert error"><span>⚠</span>{error}</div>}
      {success && <div className="fp-alert success"><span>✓</span>{success}</div>}

      {loading ? (
        <div className="fp-empty">Cargando datos del sistema…</div>
      ) : (
        <>
          <section className="fp-section fp-section-clean">
            <div className="fp-section-header">
              <DeviceIcon className="fp-section-icon" />
              <span className="fp-section-title">Información del dispositivo</span>
            </div>

            <div className="fp-grid-2">
              <div className="fp-field">
                <label className="fp-label">AssetTag *</label>
                <input
                  className="fp-input"
                  value={form.assetTag}
                  onChange={e => setForm({ ...form, assetTag: e.target.value })}
                  placeholder="Ej: UTA-FISEI-001"
                />
              </div>

              <div className="fp-field">
                <label className="fp-label">N° de Serie *</label>
                <input
                  className="fp-input"
                  value={form.serialNumber}
                  onChange={e => setForm({ ...form, serialNumber: e.target.value })}
                  placeholder="Ej: SN123456"
                />
              </div>

              <div className="fp-field">
                <label className="fp-label">Marca *</label>
                <input
                  className="fp-input"
                  value={form.brand}
                  onChange={e => setForm({ ...form, brand: e.target.value })}
                  placeholder="HP, Dell, Epson..."
                />
              </div>

              <div className="fp-field">
                <label className="fp-label">Modelo *</label>
                <input
                  className="fp-input"
                  value={form.model}
                  onChange={e => setForm({ ...form, model: e.target.value })}
                  placeholder="ProBook 450 G8"
                />
              </div>

              <div className="fp-field">
                <label className="fp-label">Tipo de Equipo *</label>
                <div className="fp-select-wrap">
                  <select
                    className="fp-select"
                    value={form.equipmentTypeId}
                    onChange={e => setForm({ ...form, equipmentTypeId: e.target.value, laboratoryId: '' })}
                  >
                    <option value="">Seleccione una categoría...</option>
                    {types.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="fp-select-chevron" />
                </div>
              </div>

              <div className="fp-field">
                <label className="fp-label">Fecha de Compra *</label>
                <input
                  className="fp-input"
                  type="date"
                  value={form.purchaseDate}
                  onChange={e => setForm({ ...form, purchaseDate: e.target.value })}
                />
              </div>
            </div>
          </section>

          <section className="fp-section fp-section-clean">
            <div className="fp-section-header">
              <AssignmentIcon className="fp-section-icon" />
              <span className="fp-section-title">Asignación</span>
            </div>

            <div className="fp-grid-2">
              <div className="fp-field">
                <label className="fp-label">Laboratorista Responsable</label>
                <div className="fp-select-wrap">
                  <select
                    className="fp-select"
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
                  <ChevronDown className="fp-select-chevron" />
                </div>
              </div>

              <div className="fp-field">
                <label className="fp-label">Laboratorio</label>
                <div className="fp-select-wrap">
                  <select
                    className="fp-select"
                    value={form.laboratoryId}
                    onChange={e => setForm({ ...form, laboratoryId: e.target.value })}
                    disabled={!form.equipmentTypeId}
                  >
                    <option value="">Seleccione el laboratorio...</option>
                    {laboratories.map(l => (
                      <option key={l.id} value={l.id}>
                        {getLaboratoryLabel(l)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="fp-select-chevron" />
                </div>

                {!form.equipmentTypeId && (
                  <span className="fp-field-hint">
                    Selecciona el tipo de equipo primero para ver los cupos.
                  </span>
                )}
              </div>
            </div>
          </section>

          <section className="fp-section fp-section-clean">
            <button
              type="button"
              className="fp-section-collapse"
              onClick={() => setSpecsOpen(v => !v)}
            >
              <div className="fp-section-header fp-section-header-tight">
                <SpecsIcon className="fp-section-icon" />
                <span className="fp-section-title">Especificaciones Técnicas</span>
              </div>
              <ChevronDown className={`fp-collapse-chevron ${specsOpen ? 'open' : ''}`} />
            </button>

            {specsOpen && (
              <div className="fp-specs-box">
                {form.attributes.length === 0 ? (
                  <div className="fp-specs-empty">
                    <p>Sin especificaciones aún. Agrega pares clave-valor.</p>
                    <button
                      type="button"
                      className="fp-add-attr-btn centered"
                      onClick={() =>
                        setForm({
                          ...form,
                          attributes: [...form.attributes, { key: '', value: '' }]
                        })
                      }
                    >
                      + Agregar especificación
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="fp-attrs-list">
                      {form.attributes.map((attr, i) => (
                        <div key={i} className="fp-attr-row">
                          <input
                            className="fp-input"
                            placeholder="Clave (ej: RAM)"
                            value={attr.key}
                            onChange={e => handleAttrChange(i, 'key', e.target.value)}
                          />
                          <input
                            className="fp-input"
                            placeholder="Valor (ej: 8 GB)"
                            value={attr.value}
                            onChange={e => handleAttrChange(i, 'value', e.target.value)}
                          />
                          <button
                            type="button"
                            className="fp-attr-remove"
                            onClick={() =>
                              setForm({
                                ...form,
                                attributes: form.attributes.filter((_, j) => j !== i)
                              })
                            }
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      className="fp-add-attr-btn"
                      onClick={() =>
                        setForm({
                          ...form,
                          attributes: [...form.attributes, { key: '', value: '' }]
                        })
                      }
                    >
                      + Agregar especificación
                    </button>
                  </>
                )}
              </div>
            )}
          </section>

          <div className="fp-actions-standalone fp-actions-clean">
            <button className="fp-btn btn-secondary" onClick={() => navigate('/equipos')}>
              Cancelar
            </button>

            <button className="fp-btn btn-primary fp-btn-submit" onClick={handleSubmit} disabled={saving}>
              {saving ? <><span className="fp-btn-spinner" /> Guardando…</> : 'Registrar equipo'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}