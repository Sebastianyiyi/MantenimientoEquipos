import { useEffect, useRef, useState } from 'react'
import { equipmentApi } from '../../services/api'
import './Importar.css'

const IMPORT_API = 'http://localhost:5002/api/import'

function UploadIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  )
}

function CheckIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5"/>
    </svg>
  )
}

export default function Importar() {
  const [step, setStep] = useState('upload')
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [types, setTypes] = useState([])
  const [equipmentTypeId, setEquipmentTypeId] = useState('')
  const fileRef = useRef()

  useEffect(() => {
    // Si no tienes este endpoint disponible de momento, coméntalo para evitar errores
    equipmentApi.get('/equipment-types')
      .then(res => setTypes(res.data))
      .catch(() => setError('No se pudieron cargar los tipos de equipo.'))
  }, [])

  const handleFileChange = (f) => {
    if (!f) return
    if (!f.name.endsWith('.csv')) {
      setError('Solo se aceptan archivos .csv')
      return
    }
    setFile(f)
    setError('')
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    handleFileChange(f)
  }

  const handlePreview = async () => {
    if (!equipmentTypeId) return setError('Seleccione una categoría antes de continuar.')
    if (!file) return setError('Seleccione un archivo primero.')
    setLoading(true); setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('equipmentTypeId', equipmentTypeId)
      const res = await fetch(`${IMPORT_API}/preview`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? 'Error al procesar el archivo.')
      setPreview(data); setStep('preview')
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const handleConfirm = async () => {
    if (!equipmentTypeId || !file) return
    setLoading(true); setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('equipmentTypeId', equipmentTypeId)
      const res = await fetch(`${IMPORT_API}/confirm`, { method: 'POST', body: fd })
      const text = await res.text()
      let data
      try { data = JSON.parse(text) } catch { throw new Error(text || 'Respuesta inválida del servidor.') }
      if (!res.ok) throw new Error(data.message ?? 'Error al importar.')
      setResult(data); setStep('result')
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const handleReset = () => {
    setStep('upload'); setFile(null); setPreview(null)
    setResult(null); setError(''); setEquipmentTypeId('')
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="imp-page">
      {/* Encabezado */}
      <div className="imp-header">
        <h1>Importación Masiva de Equipos</h1>
        <p>Carga un archivo CSV con el listado de equipos a registrar de forma masiva.</p>
      </div>

      {/* Error */}
      {error && (
        <div className="imp-error">
          <span>{error}</span>
          <button onClick={() => setError('')} aria-label="Cerrar">✕</button>
        </div>
      )}

      {/* ── Paso: Upload ── */}
      {step === 'upload' && (
        <div className="imp-upload-container">
          
          {/* 1. Bloque de Instrucciones Independiente */}
          <div className="imp-info-box">
            <div className="imp-info-icon">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            </div>
            <div className="imp-info-body">
              <strong>Formato del archivo CSV</strong>
              <ul className="imp-rules">
                <li>Selecciona la categoría del equipo antes de subir el archivo.</li>
                <li>Solo se aceptan archivos en formato <code>.csv</code>.</li>
                <li>Columnas obligatorias: AssetTag, Brand, Model, SerialNumber, PurchaseDate.</li>
                <li>Especificaciones dinámicas pueden incluirse como columnas adicionales.</li>
                <li>Formato de fecha obligatorio: <code>YYYY-MM-DD</code>.</li>
                <li>Validación estricta: si hay un error en una fila, se cancelará la operación.</li>
              </ul>
            </div>
          </div>

          {/* 2. Fila Categoría */}
          <div className="imp-step-row">
            <div className="imp-step-label">
              <span>1. CATEGORÍA DE EQUIPO</span>
            </div>
            <div className="imp-step-input">
              <select
                className={`imp-select${equipmentTypeId ? ' active' : ''}`}
                value={equipmentTypeId}
                onChange={e => setEquipmentTypeId(e.target.value)}
              >
                <option value="">Seleccione una categoría…</option>
                {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>

          {/* 3. Dropzone */}
          <div className="imp-step-col">
            <div className="imp-step-label">
              <span>2. SELECCIONAR ARCHIVO CSV</span>
            </div>
            <div
              className={`imp-dropzone${dragOver ? ' drag-over' : ''}${file ? ' has-file' : ''}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              {file ? (
                <div className="imp-dropzone-icon-bg success-bg">
                  <CheckIcon className="imp-dropzone-icon success-icon" />
                </div>
              ) : (
                <div className="imp-dropzone-icon-bg">
                  <UploadIcon className="imp-dropzone-icon" />
                </div>
              )}
              
              {file ? (
                <p className="imp-filename">{file.name}</p>
              ) : (
                <>
                  <p className="imp-dropzone-title">Arrastra tu archivo CSV aquí o haz clic para seleccionar</p>
                  <small>Tamaño máximo recomendado: 5MB</small>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                onChange={e => handleFileChange(e.target.files[0])}
              />
            </div>
          </div>

          {/* Acciones */}
          <div className="imp-actions-bottom">
            <button
              className="imp-btn-primary"
              onClick={handlePreview}
              disabled={!file || !equipmentTypeId || loading}
            >
              {loading ? 'Procesando…' : 'Vista previa'}
            </button>
          </div>
        </div>
      )}

      {/* ── Paso: Preview ── */}
      {step === 'preview' && preview && (
        <div className="imp-card">
          <div className="imp-preview-meta">
            <div>
              <h3>Vista previa de importación</h3>
              <p>Tipo seleccionado: <strong>{preview.equipmentType?.name}</strong></p>
            </div>
            <span className="imp-badge">{preview.totalRows} registro{preview.totalRows !== 1 ? 's' : ''}</span>
          </div>

          <div className="imp-table-wrap">
            <table className="imp-table">
              <thead>
                <tr>
                  {['#', 'AssetTag', 'Marca', 'Modelo', 'N.° Serie', 'Fecha de compra'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, i) => (
                  <tr key={i}>
                    <td>{row.line}</td>
                    <td>{row.assetTag}</td>
                    <td>{row.brand}</td>
                    <td>{row.model}</td>
                    <td>{row.serialNumber}</td>
                    <td>{row.purchaseDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="imp-actions">
            <button className="imp-btn-primary" onClick={handleConfirm} disabled={loading}>
              {loading ? 'Importando…' : `Confirmar importación (${preview.totalRows} registros)`}
            </button>
            <button className="imp-btn-secondary" onClick={handleReset}>Cancelar</button>
          </div>
        </div>
      )}

      {/* ── Paso: Resultado ── */}
      {step === 'result' && result && (
        <div className="imp-card">
          <p className="imp-result-title">Resultado de la importación</p>
          <div className="imp-result-stats">
            <div className="imp-stat success">
              <div className="imp-stat-num">{result.successCount}</div>
              <div className="imp-stat-label">Importados correctamente</div>
            </div>
            <div className="imp-stat neutral">
              <div className="imp-stat-num">{result.errorCount}</div>
              <div className="imp-stat-label">Con errores</div>
            </div>
          </div>
          <div className="imp-actions">
            <button className="imp-btn-primary" onClick={handleReset}>Nueva importación</button>
            <button className="imp-btn-secondary" onClick={() => window.location.href = '/equipos'}>Ver equipos</button>
          </div>
        </div>
      )}
    </div>
  )
}