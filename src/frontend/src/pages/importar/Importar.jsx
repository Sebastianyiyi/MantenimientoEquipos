import { useState, useRef } from 'react'

const IMPORT_API = 'http://localhost:5002/api/import'

export default function Importar() {
  const [step, setStep] = useState('upload') // 'upload' | 'preview' | 'result'
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

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
    if (!file) return setError('Seleccione un archivo primero.')
    setLoading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
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
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`${IMPORT_API}/confirm`, { method: 'POST', body: fd })
      const data = await res.json()
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
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '900px' }}>
      <h1 style={{ margin: '0 0 0.25rem' }}>Importación Masiva de Equipos</h1>
      <p style={{ color: '#888', marginBottom: '2rem' }}>Cargue un archivo CSV con el listado de equipos a registrar</p>

      {error && (
        <div style={{ background: '#fee2e2', color: '#c0191f', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
          {error}
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c0191f' }}>✕</button>
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '2rem', border: '1px solid #e5e7eb' }}>
          <h3 style={{ marginTop: 0 }}>Instrucciones</h3>
          <ul style={{ color: '#555', lineHeight: '1.8' }}>
            <li>El archivo debe estar en formato <strong>.csv</strong></li>
            <li>Columnas obligatorias: <code>Code, Brand, Model, SerialNumber, EquipmentTypeName</code></li>
            <li>Columnas opcionales: <code>PurchaseDate, Price, Supplier, InvoiceNumber</code></li>
            <li>El nombre del tipo de equipo debe coincidir exactamente con los registrados en Catálogos</li>
            <li>Los registros duplicados (código o serie) serán reportados sin cancelar el resto</li>
          </ul>

          <div style={{ background: '#f9fafb', border: '2px dashed #d1d5db', borderRadius: '8px', padding: '1.5rem', textAlign: 'center', marginBottom: '1rem' }}>
            <p style={{ margin: '0 0 0.5rem', color: '#555' }}>Ejemplo de plantilla CSV:</p>
            <code style={{ fontSize: '0.78rem', color: '#374151', display: 'block', whiteSpace: 'pre', overflowX: 'auto' }}>
              {`Code,Brand,Model,SerialNumber,EquipmentTypeName,PurchaseDate,Price,Supplier,InvoiceNumber
EQ-001,HP,ProBook 450 G8,SCD123ABC4,Laptop,2024-01-15,850.00,TecnoShop,FAC-001
EQ-002,Dell,OptiPlex 7090,DELL789XYZ,PC,2024-02-20,650.00,CompuStore,FAC-002`}
            </code>
          </div>

          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Seleccionar archivo CSV</label>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleFileChange} style={{ display: 'block', marginBottom: '1rem' }} />

          {file && <p style={{ color: '#16a34a', marginBottom: '1rem' }}>✓ Archivo seleccionado: <strong>{file.name}</strong></p>}

          <button className="btn-primary" onClick={handlePreview} disabled={!file || loading}>
            {loading ? 'Procesando...' : 'Vista Previa'}
          </button>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 'preview' && preview && (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '2rem', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Vista Previa — {preview.totalRows} registro(s)</h3>
            <button className="btn-secondary" onClick={handleReset}>Cambiar archivo</button>
          </div>

          <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  {['#', 'Código', 'Marca', 'Modelo', 'N° Serie', 'Tipo', 'Fecha Compra', 'Precio', 'Proveedor'].map(h => (
                    <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '0.5rem 0.75rem', color: '#888' }}>{row.line}</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>{row.code}</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>{row.brand}</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>{row.model}</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>{row.serialNumber}</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>{row.equipmentTypeName}</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>{row.purchaseDate}</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>{row.price}</td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>{row.supplier}</td>
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

      {/* Step 3: Result */}
      {step === 'result' && result && (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '2rem', border: '1px solid #e5e7eb' }}>
          <h3 style={{ marginTop: 0 }}>Resultado de la importación</h3>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ flex: 1, background: '#dcfce7', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '2rem', fontWeight: 700, color: '#16a34a' }}>{result.successCount}</p>
              <p style={{ margin: 0, color: '#16a34a' }}>Importados correctamente</p>
            </div>
            <div style={{ flex: 1, background: result.errorCount > 0 ? '#fee2e2' : '#f9fafb', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '2rem', fontWeight: 700, color: result.errorCount > 0 ? '#c0191f' : '#888' }}>{result.errorCount}</p>
              <p style={{ margin: 0, color: result.errorCount > 0 ? '#c0191f' : '#888' }}>Con errores</p>
            </div>
          </div>

          {result.errors?.length > 0 && (
            <>
              <h4>Detalle de errores:</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#fef2f2' }}>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Línea</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>N° Serie</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {result.errors.map((e, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #fee2e2' }}>
                      <td style={{ padding: '0.5rem' }}>{e.line}</td>
                      <td style={{ padding: '0.5rem' }}>{e.serial}</td>
                      <td style={{ padding: '0.5rem', color: '#c0191f' }}>{e.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem' }}>
            <button className="btn-primary" onClick={handleReset}>Nueva importación</button>
            <button className="btn-secondary" onClick={() => window.location.href = '/equipos'}>Ver equipos</button>
          </div>
        </div>
      )}
    </div>
  )
}