import { useEffect, useRef, useState } from 'react'
import { equipmentApi } from '../../services/api'

const IMPORT_API = 'http://localhost:5002/api/import'

export default function Importar() {
  const [step, setStep] = useState('upload')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [types, setTypes] = useState([])
  const [equipmentTypeId, setEquipmentTypeId] = useState('')
  const fileRef = useRef()

  useEffect(() => {
    equipmentApi.get('/equipment-types')
      .then(res => setTypes(res.data))
      .catch(() => setError('No se pudieron cargar los tipos de equipo.'))
  }, [])

  const handleFileChange = (e) => {
    const f = e.target.files[0]
    if (!f) return

    if (!f.name.endsWith('.csv')) {
      setError('Solo se aceptan archivos .csv')
      return
    }

    setFile(f)
    setError('')
  }

  const handlePreview = async () => {
    if (!equipmentTypeId) return setError('Seleccione una categoría antes de continuar.')
    if (!file) return setError('Seleccione un archivo primero.')

    setLoading(true)
    setError('')

    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('equipmentTypeId', equipmentTypeId)

      const res = await fetch(`${IMPORT_API}/preview`, { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok) throw new Error(data.message ?? 'Error al procesar el archivo.')

      setPreview(data)
      setStep('preview')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!equipmentTypeId) return setError('Seleccione una categoría antes de continuar.')
    if (!file) return

    setLoading(true)
    setError('')

    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('equipmentTypeId', equipmentTypeId)

      const res = await fetch(`${IMPORT_API}/confirm`, { method: 'POST', body: fd })
      const text = await res.text()

      let data
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error(text || 'El servidor devolvió una respuesta no válida.')
      }

      if (!res.ok) throw new Error(data.message ?? 'Error al importar.')

      setResult(data)
      setStep('result')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setStep('upload')
    setFile(null)
    setPreview(null)
    setResult(null)
    setError('')
    setEquipmentTypeId('')
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '900px' }}>
      <h1 style={{ margin: '0 0 0.25rem' }}>Importación Masiva de Equipos</h1>
      <p style={{ color: '#888', marginBottom: '2rem' }}>
        Cargue un archivo CSV con el listado de equipos a registrar
      </p>

      {error && (
        <div style={{
          background: '#fee2e2',
          color: '#c0191f',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          {error}
          <button
            onClick={() => setError('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c0191f' }}
          >
            ✕
          </button>
        </div>
      )}

      {step === 'upload' && (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '2rem', border: '1px solid #e5e7eb' }}>
          <h3 style={{ marginTop: 0 }}>Instrucciones</h3>
          <ul style={{ color: '#555', lineHeight: '1.8' }}>
            <li>Seleccione primero la categoría del equipo.</li>
            <li>El archivo debe estar en formato <strong>.csv</strong>.</li>
            <li>Columnas obligatorias: <code>AssetTag, Brand, Model, SerialNumber, PurchaseDate</code>.</li>
            <li>Las columnas adicionales se guardarán como especificaciones dinámicas.</li>
            <li>La fecha debe venir en formato <code>YYYY-MM-DD</code>.</li>
            <li>Si existe un error, no se importará ningún registro.</li>
          </ul>

          <div style={{
            background: '#f9fafb',
            border: '2px dashed #d1d5db',
            borderRadius: '8px',
            padding: '1.5rem',
            textAlign: 'center',
            marginBottom: '1rem'
          }}>
            <p style={{ margin: '0 0 0.5rem', color: '#555' }}>Ejemplo de plantilla CSV:</p>
            <code style={{
              fontSize: '0.78rem',
              color: '#374151',
              display: 'block',
              whiteSpace: 'pre',
              overflowX: 'auto'
            }}>
              {`AssetTag,Brand,Model,SerialNumber,PurchaseDate,Processor,RAM,Storage
UTA-LAB-001,HP,ProBook 450 G8,SCD123ABC4,2024-01-15,Intel Core i7,16GB,512GB SSD
UTA-LAB-002,Dell,OptiPlex 7090,DELL789XYZ,2024-02-20,Intel Core i5,8GB,1TB HDD`}
            </code>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>
              Categoría
            </label>
            <select
              value={equipmentTypeId}
              onChange={(e) => setEquipmentTypeId(e.target.value)}
              style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #ddd' }}
            >
              <option value="">Seleccione una categoría...</option>
              {types.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>
            Seleccionar archivo CSV
          </label>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            style={{ display: 'block', marginBottom: '1rem' }}
          />

          {file && (
            <p style={{ color: '#16a34a', marginBottom: '1rem' }}>
              ✓ Archivo seleccionado: <strong>{file.name}</strong>
            </p>
          )}

          <button className="btn-primary" onClick={handlePreview} disabled={!file || !equipmentTypeId || loading}>
            {loading ? 'Procesando...' : 'Vista previa'}
          </button>
        </div>
      )}

      {step === 'preview' && preview && (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '2rem', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ margin: 0 }}>Vista previa — {preview.totalRows} registro(s)</h3>
              <p style={{ margin: '0.35rem 0 0', color: '#666' }}>
                Tipo seleccionado: <strong>{preview.equipmentType?.name}</strong>
              </p>
            </div>
            <button className="btn-secondary" onClick={handleReset}>Cambiar archivo</button>
          </div>

          <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  {['#', 'AssetTag', 'Marca', 'Modelo', 'N° Serie', 'Fecha Compra'].map(h => (
                    <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '0.5rem 0.75rem', color: '#888' }}>{row.line}</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>{row.assetTag}</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>{row.brand}</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>{row.model}</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>{row.serialNumber}</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>{row.purchaseDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-secondary" onClick={handleReset}>Cancelar</button>
            <button className="btn-primary" onClick={handleConfirm} disabled={loading}>
              {loading ? 'Importando...' : `Confirmar importación (${preview.totalRows} registros)`}
            </button>
          </div>
        </div>
      )}

      {step === 'result' && result && (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '2rem', border: '1px solid #e5e7eb' }}>
          <h3 style={{ marginTop: 0 }}>Resultado de la importación</h3>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ flex: 1, background: '#dcfce7', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '2rem', fontWeight: 700, color: '#16a34a' }}>{result.successCount}</p>
              <p style={{ margin: 0, color: '#16a34a' }}>Importados correctamente</p>
            </div>
            <div style={{ flex: 1, background: '#f9fafb', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '2rem', fontWeight: 700, color: '#888' }}>{result.errorCount}</p>
              <p style={{ margin: 0, color: '#888' }}>Con errores</p>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem' }}>
            <button className="btn-primary" onClick={handleReset}>Nueva importación</button>
            <button className="btn-secondary" onClick={() => window.location.href = '/equipos'}>
              Ver equipos
            </button>
          </div>
        </div>
      )}
    </div>
  )
}