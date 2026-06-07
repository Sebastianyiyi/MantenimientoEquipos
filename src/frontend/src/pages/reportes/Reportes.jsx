import { useState, useEffect } from 'react'
import { maintenanceApi, equipmentApi } from '../../services/api'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

const HOY = new Date().toISOString().split('T')[0]
const HACE_30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

export default function Reportes() {
  const [equipments, setEquipments]   = useState([])
  const [tab, setTab]                 = useState('estadisticas') // 'estadisticas' | 'hojavida'
  const [formato, setFormato]         = useState('pdf')          // 'pdf' | 'excel'
  const [desde, setDesde]             = useState(HACE_30)
  const [hasta, setHasta]             = useState(HOY)
  const [equipoId, setEquipoId]       = useState('')
  const [generando, setGenerando]     = useState(false)
  const [error, setError]             = useState('')

  useEffect(() => {
    equipmentApi.get('/equipments')
      .then(r => setEquipments(r.data))
      .catch(() => setEquipments([]))
  }, [])

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('es-EC') : '—'

  // ── GENERAR PDF ESTADÍSTICAS ──────────────────────────────────────────────
  const generarPdfEstadisticas = async () => {
    const res = await maintenanceApi.get(`/reportes/estadisticas?desde=${desde}&hasta=${hasta}`)
    const d = res.data

    const doc = new jsPDF()
    const rojo = [192, 25, 31]

    // Encabezado
    doc.setFillColor(...rojo)
    doc.rect(0, 0, 210, 28, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('UNIVERSIDAD TÉCNICA DE AMBATO', 105, 10, { align: 'center' })
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Sistema de Mantenimiento de Equipos Tecnológicos — FISEI', 105, 17, { align: 'center' })
    doc.text(`Reporte de Estadísticas: ${formatDate(desde)} al ${formatDate(hasta)}`, 105, 23, { align: 'center' })

    doc.setTextColor(0, 0, 0)
    let y = 36

    // Resumen
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('Resumen General', 14, y); y += 6

    autoTable(doc, {
      startY: y,
      head: [['Métrica', 'Valor']],
      body: [
        ['Total de casos', d.totalCasos],
        ['Casos pendientes', d.casosPorEstado?.find(e => e.estado === 'Pendiente')?.total ?? 0],
        ['Casos en proceso', d.casosPorEstado?.find(e => e.estado === 'En Proceso')?.total ?? 0],
        ['Casos terminados', d.casosPorEstado?.find(e => e.estado === 'Terminado')?.total ?? 0],
      ],
      headStyles: { fillColor: rojo },
      margin: { left: 14, right: 14 },
    })
    y = doc.lastAutoTable.finalY + 8

    // Por tipo
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('Casos por Tipo de Mantenimiento', 14, y); y += 4

    autoTable(doc, {
      startY: y,
      head: [['Tipo', 'Total']],
      body: (d.casosPorTipo ?? []).map(t => [t.tipo, t.total]),
      headStyles: { fillColor: rojo },
      margin: { left: 14, right: 14 },
    })
    y = doc.lastAutoTable.finalY + 8

    // Recursos más usados
    if (d.recursosMasUsados?.length > 0) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text('Recursos Más Utilizados', 14, y); y += 4

      autoTable(doc, {
        startY: y,
        head: [['Recurso', 'Cantidad Total']],
        body: d.recursosMasUsados.map(r => [r.recurso, r.totalUsado]),
        headStyles: { fillColor: rojo },
        margin: { left: 14, right: 14 },
      })
      y = doc.lastAutoTable.finalY + 8
    }

    // Pie de página
    const total = doc.getNumberOfPages()
    for (let i = 1; i <= total; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150)
      doc.text(`Generado el ${formatDate(new Date())} — Página ${i} de ${total}`, 105, 290, { align: 'center' })
    }

    doc.save(`Estadisticas_${desde}_${hasta}.pdf`)
  }

  // ── GENERAR PDF HOJA DE VIDA ──────────────────────────────────────────────
  const generarPdfHojaVida = async () => {
    if (!equipoId) { setError('Selecciona un equipo.'); return }

    const equipo = equipments.find(e => e.id === equipoId)
    const res = await maintenanceApi.get(`/reportes/hoja-vida/${equipoId}`)
    const d = res.data

    const doc = new jsPDF()
    const rojo = [192, 25, 31]

    // Encabezado
    doc.setFillColor(...rojo)
    doc.rect(0, 0, 210, 28, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('UNIVERSIDAD TÉCNICA DE AMBATO', 105, 10, { align: 'center' })
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Sistema de Mantenimiento de Equipos Tecnológicos — FISEI', 105, 17, { align: 'center' })
    doc.text(`Hoja de Vida: ${equipo?.assetTag ?? equipoId}`, 105, 23, { align: 'center' })

    doc.setTextColor(0, 0, 0)
    let y = 36

    // Info del equipo
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('Datos del Equipo', 14, y); y += 6

    autoTable(doc, {
      startY: y,
      body: [
        ['Asset Tag', equipo?.assetTag ?? '—'],
        ['Marca / Modelo', `${equipo?.brand ?? ''} ${equipo?.model ?? ''}`],
        ['Serie', equipo?.serialNumber ?? '—'],
        ['Estado actual', equipo?.status ?? '—'],
        ['Total de casos', d.totalCasos],
        ['Total de actividades', d.totalActividades],
        ['Total de recursos', d.totalRecursos],
        ['Último mantenimiento', formatDate(d.ultimoMantenimiento)],
      ],
      headStyles: { fillColor: rojo },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } },
      margin: { left: 14, right: 14 },
    })
    y = doc.lastAutoTable.finalY + 8

    // Historial de casos
    for (const caso of d.historia ?? []) {
      if (y > 240) { doc.addPage(); y = 20 }

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(...rojo)
      doc.text(`${caso.ticketNumber} — ${caso.title}`, 14, y); y += 5
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(`Tipo: ${caso.maintenanceType}  |  Estado: ${caso.ticketStatus}  |  Prioridad: ${caso.priority}  |  Inicio: ${formatDate(caso.fechaInicio)}  |  Cierre: ${formatDate(caso.fechaCierre)}`, 14, y)
      y += 5

      if (caso.actividades?.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [['Actividades realizadas', 'Categoría', 'Fecha']],
          body: caso.actividades.map(a => [a.nombre, a.categoria, formatDate(a.addedAt)]),
          headStyles: { fillColor: [75, 85, 99] },
          margin: { left: 14, right: 14 },
          styles: { fontSize: 8 },
        })
        y = doc.lastAutoTable.finalY + 4
      }

      if (caso.diagnosticos?.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [['Diagnósticos', 'Severidad', 'Fecha']],
          body: caso.diagnosticos.map(d => [d.nombre, d.severidad, formatDate(d.addedAt)]),
          headStyles: { fillColor: [75, 85, 99] },
          margin: { left: 14, right: 14 },
          styles: { fontSize: 8 },
        })
        y = doc.lastAutoTable.finalY + 4
      }

      if (caso.recursos?.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [['Recursos utilizados', 'Descripción', 'Cantidad']],
          body: caso.recursos.map(r => [r.name, r.description ?? '—', r.quantity]),
          headStyles: { fillColor: [75, 85, 99] },
          margin: { left: 14, right: 14 },
          styles: { fontSize: 8 },
        })
        y = doc.lastAutoTable.finalY + 8
      }
    }

    // Pie
    const total = doc.getNumberOfPages()
    for (let i = 1; i <= total; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150)
      doc.text(`Generado el ${formatDate(new Date())} — Página ${i} de ${total}`, 105, 290, { align: 'center' })
    }

    doc.save(`HojaDeVida_${equipo?.assetTag ?? equipoId}.pdf`)
  }

  // ── GENERAR EXCEL ESTADÍSTICAS ────────────────────────────────────────────
  const generarExcelEstadisticas = async () => {
    const res = await maintenanceApi.get(`/reportes/estadisticas?desde=${desde}&hasta=${hasta}`)
    const d = res.data

    const wb = XLSX.utils.book_new()

    // Hoja 1: Resumen
    const resumen = [
      ['SISTEMA DE MANTENIMIENTO - FISEI UTA'],
      [`Estadísticas del ${formatDate(desde)} al ${formatDate(hasta)}`],
      [],
      ['Métrica', 'Valor'],
      ['Total de casos', d.totalCasos],
      ['Casos Pendientes', d.casosPorEstado?.find(e => e.estado === 'Pendiente')?.total ?? 0],
      ['Casos En Proceso', d.casosPorEstado?.find(e => e.estado === 'En Proceso')?.total ?? 0],
      ['Casos Terminados', d.casosPorEstado?.find(e => e.estado === 'Terminado')?.total ?? 0],
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumen), 'Resumen')

    // Hoja 2: Por tipo
    const tipoData = [
      ['Tipo de Mantenimiento', 'Total'],
      ...(d.casosPorTipo ?? []).map(t => [t.tipo, t.total])
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(tipoData), 'Por Tipo')

    // Hoja 3: Recursos más usados
    const recursosData = [
      ['Recurso', 'Cantidad Total'],
      ...(d.recursosMasUsados ?? []).map(r => [r.recurso, r.totalUsado])
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(recursosData), 'Recursos')

    XLSX.writeFile(wb, `Estadisticas_${desde}_${hasta}.xlsx`)
  }

  // ── GENERAR EXCEL HOJA DE VIDA ────────────────────────────────────────────
  const generarExcelHojaVida = async () => {
    if (!equipoId) { setError('Selecciona un equipo.'); return }

    const equipo = equipments.find(e => e.id === equipoId)
    const res = await maintenanceApi.get(`/reportes/hoja-vida/${equipoId}`)
    const d = res.data

    const wb = XLSX.utils.book_new()

    // Hoja 1: Resumen del equipo
    const resumen = [
      ['HOJA DE VIDA DEL EQUIPO — FISEI UTA'],
      [],
      ['Asset Tag', equipo?.assetTag ?? '—'],
      ['Marca / Modelo', `${equipo?.brand ?? ''} ${equipo?.model ?? ''}`],
      ['Serie', equipo?.serialNumber ?? '—'],
      ['Estado', equipo?.status ?? '—'],
      ['Total de casos', d.totalCasos],
      ['Total de actividades', d.totalActividades],
      ['Total de recursos', d.totalRecursos],
      ['Último mantenimiento', formatDate(d.ultimoMantenimiento)],
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumen), 'Resumen')

    // Hoja 2: Detalle de casos
    const casosData = [
      ['Código', 'Título', 'Tipo', 'Estado', 'Prioridad', 'Fecha Inicio', 'Fecha Cierre'],
      ...(d.historia ?? []).map(c => [
        c.ticketNumber, c.title, c.maintenanceType,
        c.ticketStatus, c.priority,
        formatDate(c.fechaInicio), formatDate(c.fechaCierre)
      ])
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(casosData), 'Casos')

    // Hoja 3: Actividades
    const actData = [
      ['Caso', 'Actividad', 'Categoría', 'Fecha'],
      ...(d.historia ?? []).flatMap(c =>
        (c.actividades ?? []).map(a => [c.ticketNumber, a.nombre, a.categoria, formatDate(a.addedAt)])
      )
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(actData), 'Actividades')

    // Hoja 4: Recursos
    const recData = [
      ['Caso', 'Recurso', 'Descripción', 'Cantidad'],
      ...(d.historia ?? []).flatMap(c =>
        (c.recursos ?? []).map(r => [c.ticketNumber, r.name, r.description ?? '—', r.quantity])
      )
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(recData), 'Recursos')

    XLSX.writeFile(wb, `HojaDeVida_${equipo?.assetTag ?? equipoId}.xlsx`)
  }

  // ── HANDLER PRINCIPAL ─────────────────────────────────────────────────────
  const handleGenerar = async () => {
    setError('')
    setGenerando(true)
    try {
      if (tab === 'estadisticas') {
        formato === 'pdf' ? await generarPdfEstadisticas() : await generarExcelEstadisticas()
      } else {
        formato === 'pdf' ? await generarPdfHojaVida() : await generarExcelHojaVida()
      }
    } catch (e) {
      setError('Error al generar el reporte. Verifica que los servicios estén corriendo.')
      console.error(e)
    } finally {
      setGenerando(false)
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 700 }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0 }}>Reportes Exportables</h1>
        <p style={{ margin: '0.25rem 0 0', color: '#6b7280' }}>
          Genera reportes en PDF o Excel con los datos del sistema
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {[
          { key: 'estadisticas', label: '📊 Estadísticas del sistema' },
          { key: 'hojavida',     label: '📋 Hoja de vida de equipo' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '0.5rem 1.25rem', borderRadius: 8, border: 'none',
            cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
            background: tab === t.key ? '#C0191F' : '#f3f4f6',
            color: tab === t.key ? 'white' : '#374151',
            transition: 'all 0.15s'
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Formulario */}
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.5rem' }}>

        {/* Formato */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Formato de exportación</label>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            {[
              { key: 'pdf',   label: '📄 PDF',   sub: 'Reporte visual' },
              { key: 'excel', label: '📊 Excel', sub: 'Hoja de cálculo' },
            ].map(f => (
              <div key={f.key} onClick={() => setFormato(f.key)} style={{
                flex: 1, padding: '0.75rem 1rem', borderRadius: 8, cursor: 'pointer',
                border: `2px solid ${formato === f.key ? '#C0191F' : '#e5e7eb'}`,
                background: formato === f.key ? '#fef2f2' : 'white',
                textAlign: 'center', transition: 'all 0.15s'
              }}>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{f.label}</div>
                <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{f.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Si es hoja de vida: selector de equipo */}
        {tab === 'hojavida' && (
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>Equipo *</label>
            <select
              value={equipoId}
              onChange={e => setEquipoId(e.target.value)}
              style={inputStyle}
            >
              <option value="">Selecciona un equipo...</option>
              {equipments.map(eq => (
                <option key={eq.id} value={eq.id}>
                  {eq.assetTag} — {eq.brand} {eq.model}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Si es estadísticas: rango de fechas */}
        {tab === 'estadisticas' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={labelStyle}>Desde</label>
              <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Hasta</label>
              <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={inputStyle} />
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '0.75rem 1rem', color: '#b91c1c', fontSize: '0.875rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {/* Botón generar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleGenerar}
            disabled={generando}
            style={{
              background: generando ? '#9ca3af' : '#C0191F',
              color: 'white', border: 'none', borderRadius: 10,
              padding: '0.6rem 1.5rem', fontSize: '0.9rem',
              fontWeight: 600, cursor: generando ? 'not-allowed' : 'pointer'
            }}
          >
            {generando ? '⏳ Generando...' : `⬇ Descargar ${formato.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }
const inputStyle  = { width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.875rem', boxSizing: 'border-box', fontFamily: 'inherit' }