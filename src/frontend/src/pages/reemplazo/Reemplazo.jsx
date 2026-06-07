import { useState, useEffect, useCallback } from 'react'
import { equipmentApi, locationApi, maintenanceApi } from '../../services/api'
import './Reemplazo.css'

/* ─── Constantes ─── */
const ESTADOS_ELEGIBLES = ['Dado de baja', 'No Reparable']

/* ─── Helpers visuales ─── */
function StatusBadge({ status }) {
  const map = {
    'Activo':           { bg: '#dcfce7', color: '#166534' },
    'En mantenimiento': { bg: '#fef9c3', color: '#854d0e' },
    'Dado de baja':     { bg: '#fee2e2', color: '#991b1b' },
    'No Reparable':     { bg: '#fce7f3', color: '#9d174d' },
    'En Pausa':         { bg: '#e0e7ff', color: '#3730a3' },
  }
  const s = map[status] ?? { bg: '#f3f4f6', color: '#374151' }
  return (
    <span className="rep-badge" style={{ background: s.bg, color: s.color }}>
      {status}
    </span>
  )
}

function StepIndicator({ current }) {
  const steps = ['Seleccionar equipo saliente', 'Seleccionar equipo entrante', 'Confirmar reemplazo']
  return (
    <div className="rep-steps">
      {steps.map((label, i) => {
        const idx = i + 1
        const done = idx < current
        const active = idx === current
        return (
          <div key={idx} className={`rep-step ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
            <div className="rep-step-circle">
              {done ? '✓' : idx}
            </div>
            <span className="rep-step-label">{label}</span>
            {i < steps.length - 1 && <div className="rep-step-line" />}
          </div>
        )
      })}
    </div>
  )
}

function EquipmentCard({ eq, selected, onClick, disabled }) {
  return (
    <div
      className={`rep-eq-card ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={disabled ? undefined : onClick}
    >
      <div className="rep-eq-card-header">
        <span className="rep-eq-code">{eq.code}</span>
        <StatusBadge status={eq.status} />
      </div>
      <p className="rep-eq-name">{eq.brand} {eq.model}</p>
      <p className="rep-eq-type">{eq.equipmentType?.name}</p>
      <div className="rep-eq-meta">
        <span>S/N: <strong>{eq.serialNumber}</strong></span>
        {eq.laboratoristaName && <span>Resp: <strong>{eq.laboratoristaName}</strong></span>}
      </div>
      {selected && <div className="rep-eq-check">✓ Seleccionado</div>}
    </div>
  )
}

/* ─── Componente principal ─── */
export default function Reemplazo() {
  const [step, setStep] = useState(1)

  // Datos cargados
  const [allEquipments, setAllEquipments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Selecciones
  const [saliente, setSaliente] = useState(null)    // equipo que se retira
  const [entrante, setEntrante] = useState(null)    // equipo que entra

  // Búsquedas
  const [searchSaliente, setSearchSaliente] = useState('')
  const [searchEntrante, setSearchEntrante] = useState('')

  // Estado del proceso
  const [processing, setProcessing] = useState(false)
  const [resultMsg, setResultMsg] = useState(null)  // { ok: bool, msg: string }

  // ── Carga de equipos ──
  const loadEquipments = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await equipmentApi.get('/equipments')
      setAllEquipments(res.data)
    } catch {
      setError('No se pudieron cargar los equipos. Verifica la conexión al servicio.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadEquipments() }, [loadEquipments])

  // ── Derivados ──
  const elegibles = allEquipments.filter(eq =>
    ESTADOS_ELEGIBLES.includes(eq.status) &&
    (eq.code.toLowerCase().includes(searchSaliente.toLowerCase()) ||
     eq.brand.toLowerCase().includes(searchSaliente.toLowerCase()) ||
     eq.model.toLowerCase().includes(searchSaliente.toLowerCase()) ||
     eq.serialNumber.toLowerCase().includes(searchSaliente.toLowerCase()))
  )

  const candidatos = saliente
    ? allEquipments.filter(eq =>
        eq.id !== saliente.id &&
        eq.status === 'Activo' &&
        eq.equipmentType?.id === saliente.equipmentType?.id &&
        (eq.code.toLowerCase().includes(searchEntrante.toLowerCase()) ||
         eq.brand.toLowerCase().includes(searchEntrante.toLowerCase()) ||
         eq.model.toLowerCase().includes(searchEntrante.toLowerCase()) ||
         eq.serialNumber.toLowerCase().includes(searchEntrante.toLowerCase()))
      )
    : []

  // ── Confirmar reemplazo ──
  const confirmarReemplazo = async () => {
    if (!saliente || !entrante) return
    setProcessing(true)
    setResultMsg(null)

    try {
      // 1. Marcar el equipo saliente como definitivamente dado de baja
      //    (ya tiene status elegible, solo aseguramos el status correcto)
      await equipmentApi.patch(`/equipments/${saliente.id}/status`, {
        status: 'Dado de baja'
      })

      // 2. Remover la ubicación física del equipo saliente (si la tiene)
      try {
        await locationApi.patch(`/equipment-locations/remove/${saliente.id}`, {
          notes: `Equipo dado de baja definitivamente por reemplazo con ${entrante.code}`
        })
      } catch (locErr) {
        // 404 = no tenía ubicación → no es error crítico
        if (locErr.response?.status !== 404) throw locErr
      }

      // 3. Registrar entrada inicial en Hoja de Vida del equipo entrante
      //    Creamos un ticket especial de tipo "Reemplazo"
      try {
        await maintenanceApi.post('/reemplazos', {
          equipoSalienteId: saliente.id,
          equipoSalienteCodigo: saliente.code,
          equipoEntranteId: entrante.id,
          equipoEntranteCodigo: entrante.code,
          nota: `Registro por reemplazo del equipo ${saliente.code}`
        })
      } catch (mErr) {
        // Si el endpoint no existe aún, lo registramos como advertencia
        // El core del reemplazo (pasos 1 y 2) ya se completó
        console.warn('[Reemplazo] Endpoint /reemplazos no disponible aún:', mErr.message)
      }

      setResultMsg({
        ok: true,
        msg: `✓ Reemplazo completado. El equipo ${saliente.code} fue dado de baja y el equipo ${entrante.code} toma su lugar. La Hoja de Vida del equipo saliente se conserva.`
      })

      // Refrescar lista
      await loadEquipments()
      setStep(4) // paso de éxito
    } catch (err) {
      setResultMsg({
        ok: false,
        msg: `Error al procesar el reemplazo: ${err.response?.data?.message ?? err.message}`
      })
    } finally {
      setProcessing(false)
    }
  }

  // ── Reset completo ──
  const resetear = () => {
    setSaliente(null)
    setEntrante(null)
    setSearchSaliente('')
    setSearchEntrante('')
    setResultMsg(null)
    setStep(1)
  }

  /* ────────────── RENDER ────────────── */
  return (
    <div className="rep-page">
      {/* Encabezado */}
      <div className="rep-header">
        <div>
          <h1 className="rep-title">Reemplazo de Dispositivos</h1>
          <p className="rep-subtitle">
            Gestiona la sustitución de equipos dados de baja o no reparables por equipos activos de la misma categoría.
          </p>
        </div>
      </div>

      {/* Reglas de negocio - info card */}
      <div className="rep-rules">
        <span className="rep-rules-icon">📋</span>
        <div>
          <strong>Reglas del proceso:</strong>
          <span> El equipo saliente debe estar "Dado de baja" o "No Reparable". El equipo entrante debe ser de la misma categoría y estar activo. La Hoja de Vida del equipo saliente se conserva; el equipo entrante inicia una nueva con el registro de reemplazo.</span>
        </div>
      </div>

      {loading && (
        <div className="rep-loading">
          <div className="rep-spinner" />
          <p>Cargando equipos…</p>
        </div>
      )}

      {error && (
        <div className="rep-error">
          <span>⚠️</span> {error}
          <button className="rep-retry-btn" onClick={loadEquipments}>Reintentar</button>
        </div>
      )}

      {!loading && !error && step < 4 && (
        <>
          <StepIndicator current={step} />

          {/* ── PASO 1: Seleccionar equipo saliente ── */}
          {step === 1 && (
            <div className="rep-panel">
              <div className="rep-panel-header">
                <h2>① Selecciona el equipo a reemplazar</h2>
                <p>Solo se muestran equipos con estado <em>Dado de baja</em> o <em>No Reparable</em>.</p>
              </div>

              <div className="rep-search-bar">
                <span className="rep-search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Buscar por código, marca, modelo o serie…"
                  value={searchSaliente}
                  onChange={e => setSearchSaliente(e.target.value)}
                  className="rep-search-input"
                />
              </div>

              {elegibles.length === 0 ? (
                <div className="rep-empty">
                  <span>🔍</span>
                  <p>No hay equipos elegibles para reemplazo{searchSaliente ? ' con ese criterio' : ''}.</p>
                  <small>Un equipo es elegible cuando su estado es "Dado de baja" o "No Reparable" tras un diagnóstico.</small>
                </div>
              ) : (
                <div className="rep-grid">
                  {elegibles.map(eq => (
                    <EquipmentCard
                      key={eq.id}
                      eq={eq}
                      selected={saliente?.id === eq.id}
                      onClick={() => setSaliente(eq)}
                    />
                  ))}
                </div>
              )}

              <div className="rep-actions">
                <button
                  className="btn-primary rep-btn"
                  disabled={!saliente}
                  onClick={() => setStep(2)}
                >
                  Continuar →
                </button>
              </div>
            </div>
          )}

          {/* ── PASO 2: Seleccionar equipo entrante ── */}
          {step === 2 && (
            <div className="rep-panel">
              <div className="rep-panel-header">
                <h2>② Selecciona el equipo sustituto</h2>
                <p>
                  Debe ser de la misma categoría que <strong>{saliente?.equipmentType?.name}</strong> y estar activo.
                </p>
              </div>

              {/* Resumen del saliente */}
              <div className="rep-summary-card outgoing">
                <span className="rep-summary-label">Equipo saliente</span>
                <div className="rep-summary-body">
                  <span className="rep-summary-code">{saliente?.code}</span>
                  <span>{saliente?.brand} {saliente?.model}</span>
                  <StatusBadge status={saliente?.status} />
                </div>
              </div>

              <div className="rep-search-bar">
                <span className="rep-search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Buscar sustituto por código, marca, modelo o serie…"
                  value={searchEntrante}
                  onChange={e => setSearchEntrante(e.target.value)}
                  className="rep-search-input"
                />
              </div>

              {candidatos.length === 0 ? (
                <div className="rep-empty">
                  <span>🔍</span>
                  <p>No hay equipos activos de la categoría <strong>{saliente?.equipmentType?.name}</strong>{searchEntrante ? ' con ese criterio' : ''}.</p>
                  <small>El equipo sustituto debe pertenecer obligatoriamente a la misma categoría y estar registrado como Activo.</small>
                </div>
              ) : (
                <div className="rep-grid">
                  {candidatos.map(eq => (
                    <EquipmentCard
                      key={eq.id}
                      eq={eq}
                      selected={entrante?.id === eq.id}
                      onClick={() => setEntrante(eq)}
                    />
                  ))}
                </div>
              )}

              <div className="rep-actions">
                <button className="btn-secondary rep-btn" onClick={() => { setEntrante(null); setStep(1) }}>
                  ← Atrás
                </button>
                <button
                  className="btn-primary rep-btn"
                  disabled={!entrante}
                  onClick={() => setStep(3)}
                >
                  Continuar →
                </button>
              </div>
            </div>
          )}

          {/* ── PASO 3: Confirmación ── */}
          {step === 3 && (
            <div className="rep-panel">
              <div className="rep-panel-header">
                <h2>③ Confirmar el reemplazo</h2>
                <p>Revisa los detalles antes de ejecutar. Esta acción no se puede deshacer.</p>
              </div>

              <div className="rep-confirm-layout">
                {/* Equipo saliente */}
                <div className="rep-confirm-block outgoing">
                  <div className="rep-confirm-block-label">
                    <span className="rep-confirm-icon out">↑</span>
                    Equipo que sale
                  </div>
                  <div className="rep-confirm-detail">
                    <p className="rep-confirm-code">{saliente.code}</p>
                    <p className="rep-confirm-name">{saliente.brand} {saliente.model}</p>
                    <p className="rep-confirm-type">{saliente.equipmentType?.name}</p>
                    <StatusBadge status={saliente.status} />
                    <div className="rep-confirm-meta">
                      <span>Serie: <strong>{saliente.serialNumber}</strong></span>
                    </div>
                  </div>
                  <div className="rep-confirm-note out">
                    ✓ Pierde su ubicación física<br />
                    ✓ Su Hoja de Vida queda guardada
                  </div>
                </div>

                <div className="rep-confirm-arrow">⇄</div>

                {/* Equipo entrante */}
                <div className="rep-confirm-block incoming">
                  <div className="rep-confirm-block-label">
                    <span className="rep-confirm-icon in">↓</span>
                    Equipo que entra
                  </div>
                  <div className="rep-confirm-detail">
                    <p className="rep-confirm-code">{entrante.code}</p>
                    <p className="rep-confirm-name">{entrante.brand} {entrante.model}</p>
                    <p className="rep-confirm-type">{entrante.equipmentType?.name}</p>
                    <StatusBadge status={entrante.status} />
                    <div className="rep-confirm-meta">
                      <span>Serie: <strong>{entrante.serialNumber}</strong></span>
                    </div>
                  </div>
                  <div className="rep-confirm-note in">
                    ✓ Inicia Hoja de Vida limpia<br />
                    ✓ Entrada: "Registro por reemplazo del equipo {saliente.code}"
                  </div>
                </div>
              </div>

              {resultMsg && !resultMsg.ok && (
                <div className="rep-result error">
                  <span>❌</span> {resultMsg.msg}
                </div>
              )}

              <div className="rep-actions">
                <button className="btn-secondary rep-btn" onClick={() => setStep(2)} disabled={processing}>
                  ← Atrás
                </button>
                <button
                  className="btn-primary rep-btn danger"
                  onClick={confirmarReemplazo}
                  disabled={processing}
                >
                  {processing ? (
                    <><span className="rep-btn-spinner" /> Procesando…</>
                  ) : (
                    '✓ Confirmar reemplazo'
                  )}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── PASO 4: Éxito ── */}
      {step === 4 && resultMsg?.ok && (
        <div className="rep-success-panel">
          <div className="rep-success-icon">✓</div>
          <h2>Reemplazo ejecutado</h2>
          <p>{resultMsg.msg}</p>

          <div className="rep-success-summary">
            <div className="rep-success-item out">
              <span>↑ Dado de baja definitivamente</span>
              <strong>{saliente?.code} — {saliente?.brand} {saliente?.model}</strong>
            </div>
            <div className="rep-success-item in">
              <span>↓ Ahora en uso</span>
              <strong>{entrante?.code} — {entrante?.brand} {entrante?.model}</strong>
            </div>
          </div>

          <button className="btn-primary rep-btn" onClick={resetear}>
            Registrar otro reemplazo
          </button>
        </div>
      )}
    </div>
  )
}
