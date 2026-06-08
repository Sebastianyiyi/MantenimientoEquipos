import { useState, useEffect } from 'react'
import { maintenanceApi, equipmentApi, locationApi } from '../../services/api'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

const HOY = new Date().toISOString().split('T')[0]
const HACE_30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

export default function Reportes() {
  const [equipments, setEquipments]               = useState([])
  const [tab, setTab]                             = useState('estadisticas')
  const [formato, setFormato]                     = useState('pdf')
  const [desde, setDesde]                         = useState(HACE_30)
  const [hasta, setHasta]                         = useState(HOY)
  const [equiposSeleccionados, setEquiposSeleccionados] = useState([]) // array de objetos equipo completos
  const [generando, setGenerando]                 = useState(false)
  const [error, setError]                         = useState('')
  const [busqueda, setBusqueda]                   = useState('')
  const [filtroCategoria, setFiltroCategoria]     = useState('')
  const [filtroEstado, setFiltroEstado]           = useState('')
  const [laboratorios, setLaboratorios]       = useState([])
  const [filtroLaboratorio, setFiltroLaboratorio] = useState('')
  const [busquedaLab, setBusquedaLab]         = useState('')
  const [labDropdownOpen, setLabDropdownOpen] = useState(false)

  useEffect(() => {
    equipmentApi.get('/equipments')
      .then(r => setEquipments(r.data))
      .catch(() => setEquipments([]))

    locationApi.get('/laboratorios')
      .then(r => setLaboratorios(r.data))
      .catch(() => setLaboratorios([]))
  }, [])

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('es-EC') : '—'

  const generarPdfEstadisticas = async () => {
    const res = await maintenanceApi.get(`/reportes/estadisticas?desde=${desde}&hasta=${hasta}`)
    const d = res.data
    const doc = new jsPDF()
    const rojo = [192, 25, 31]

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
    }

    const total = doc.getNumberOfPages()
    for (let i = 1; i <= total; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150)
      doc.text(`Generado el ${formatDate(new Date())} — Página ${i} de ${total}`, 105, 290, { align: 'center' })
    }
    doc.save(`Estadisticas_${desde}_${hasta}.pdf`)
  }

  const generarPdfHojaVida = async () => {
    if (equiposSeleccionados.length === 0) { setError('Selecciona al menos un equipo.'); return }

    const ids = equiposSeleccionados.map(e => e.id)
    const res = await maintenanceApi.post('/reportes/hoja-vida-multiple', ids)
    const lista = res.data  // array, uno por equipo

    const doc = new jsPDF()
    const rojo = [192, 25, 31]
    let esPrimeraPagina = true

    for (const datos of lista) {
      const equipo = equiposSeleccionados.find(e => e.id === datos.equipmentId)

      if (!esPrimeraPagina) doc.addPage()
      esPrimeraPagina = false

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
      doc.text(`Hoja de Vida: ${equipo?.assetTag ?? datos.equipmentId}`, 105, 23, { align: 'center' })
      doc.setTextColor(0, 0, 0)
      let y = 36

      // Datos del equipo
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.text('Datos del Equipo', 14, y); y += 6

      autoTable(doc, {
        startY: y,
        body: [
          ['Asset Tag',            equipo?.assetTag ?? '—'],
          ['Marca / Modelo',       `${equipo?.brand ?? ''} ${equipo?.model ?? ''}`],
          ['Serie',                equipo?.serialNumber ?? '—'],
          ['Estado actual',        equipo?.status ?? '—'],
          ['Total de casos',       datos.totalCasos],
          ['Total de actividades', datos.totalActividades],
          ['Total de recursos',    datos.totalRecursos],
          ['Último mantenimiento', formatDate(datos.ultimoMantenimiento)],
        ],
        headStyles: { fillColor: rojo },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } },
        margin: { left: 14, right: 14 },
      })
      y = doc.lastAutoTable.finalY + 8

      // Historia de casos
      for (const caso of datos.historia ?? []) {
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
    }

    // Numeración de páginas
    const total = doc.getNumberOfPages()
    for (let i = 1; i <= total; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150)
      doc.text(`Generado el ${formatDate(new Date())} — Página ${i} de ${total}`, 105, 290, { align: 'center' })
    }

    const nombre = equiposSeleccionados.length === 1
      ? `HojaDeVida_${equiposSeleccionados[0].assetTag}`
      : `HojasDeVida_${equiposSeleccionados.length}_equipos`
    doc.save(`${nombre}.pdf`)
  }

  const generarExcelEstadisticas = async () => {
    const res = await maintenanceApi.get(`/reportes/estadisticas?desde=${desde}&hasta=${hasta}`)
    const d = res.data
    const wb = XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['SISTEMA DE MANTENIMIENTO - FISEI UTA'],
      [`Estadísticas del ${formatDate(desde)} al ${formatDate(hasta)}`],
      [],
      ['Métrica', 'Valor'],
      ['Total de casos', d.totalCasos],
      ['Casos Pendientes', d.casosPorEstado?.find(e => e.estado === 'Pendiente')?.total ?? 0],
      ['Casos En Proceso', d.casosPorEstado?.find(e => e.estado === 'En Proceso')?.total ?? 0],
      ['Casos Terminados', d.casosPorEstado?.find(e => e.estado === 'Terminado')?.total ?? 0],
    ]), 'Resumen')

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Tipo de Mantenimiento', 'Total'],
      ...(d.casosPorTipo ?? []).map(t => [t.tipo, t.total])
    ]), 'Por Tipo')

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Recurso', 'Cantidad Total'],
      ...(d.recursosMasUsados ?? []).map(r => [r.recurso, r.totalUsado])
    ]), 'Recursos')

    XLSX.writeFile(wb, `Estadisticas_${desde}_${hasta}.xlsx`)
  }

  const generarExcelHojaVida = async () => {
    if (equiposSeleccionados.length === 0) { setError('Selecciona al menos un equipo.'); return }

    const ids = equiposSeleccionados.map(e => e.id)
    const res = await maintenanceApi.post('/reportes/hoja-vida-multiple', ids)
    const lista = res.data

    const wb = XLSX.utils.book_new()

    for (const datos of lista) {
      const equipo = equiposSeleccionados.find(e => e.id === datos.equipmentId)
      const tag = equipo?.assetTag ?? datos.equipmentId.slice(0, 8)
      // Excel limita nombres de hoja a 31 caracteres
      const nombreHoja = tag.slice(0, 31)

      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        ['HOJA DE VIDA DEL EQUIPO — FISEI UTA'],
        [],
        ['Asset Tag',            equipo?.assetTag ?? '—'],
        ['Marca / Modelo',       `${equipo?.brand ?? ''} ${equipo?.model ?? ''}`],
        ['Serie',                equipo?.serialNumber ?? '—'],
        ['Estado',               equipo?.status ?? '—'],
        ['Total de casos',       datos.totalCasos],
        ['Total de actividades', datos.totalActividades],
        ['Total de recursos',    datos.totalRecursos],
        ['Último mantenimiento', formatDate(datos.ultimoMantenimiento)],
        [],
        ['Código', 'Título', 'Tipo', 'Estado', 'Prioridad', 'Fecha Inicio', 'Fecha Cierre'],
        ...(datos.historia ?? []).map(c => [
          c.ticketNumber, c.title, c.maintenanceType,
          c.ticketStatus, c.priority,
          formatDate(c.fechaInicio), formatDate(c.fechaCierre)
        ])
      ]), nombreHoja)
    }

    const nombre = equiposSeleccionados.length === 1
      ? `HojaDeVida_${equiposSeleccionados[0].assetTag}`
      : `HojasDeVida_${equiposSeleccionados.length}_equipos`
    XLSX.writeFile(wb, `${nombre}.xlsx`)
  }

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

  const categorias = [...new Set(equipments.map(e => e.equipmentType?.name).filter(Boolean))].sort()

  const equiposFiltrados = equipments.filter(eq => {
  const matchCat = !filtroCategoria || eq.equipmentType?.name === filtroCategoria
  const matchEstado = !filtroEstado || eq.status === filtroEstado
  const matchLab = !filtroLaboratorio || eq.laboratoryName === filtroLaboratorio  // ← ajusta el campo
  const q = busqueda.toLowerCase()
  const matchBusqueda = !q ||
    eq.assetTag?.toLowerCase().includes(q) ||
    eq.brand?.toLowerCase().includes(q) ||
    eq.model?.toLowerCase().includes(q) ||
    eq.serialNumber?.toLowerCase().includes(q)
  return matchCat && matchEstado && matchLab && matchBusqueda
})

  return (
    <div style={{ padding: '2rem', maxWidth: 960 }}>
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
          <button key={t.key} onClick={() => {
            setTab(t.key); setEquiposSeleccionados([]); setBusqueda(''); setFiltroCategoria(''); setFiltroEstado(''); setFiltroLaboratorio(''); setBusquedaLab('')
          }} style={{
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

      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: '2rem 2.5rem' }}>

        {/* Formato */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Formato de exportación</label>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            {[
              { key: 'pdf',   label: '📄 PDF',   sub: 'Reporte visual' },
              { key: 'excel', label: '📊 Excel', sub: 'Hoja de cálculo' },
            ].map(f => (
              <div key={f.key} onClick={() => setFormato(f.key)} style={{
                flex: 1, padding: '1.25rem 1rem', borderRadius: 8, cursor: 'pointer',
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

        {/* Hoja de vida: filtros + buscador */}
        {tab === 'hojavida' && (
          <div style={{ marginBottom: '1.25rem' }}>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>

              {/* Filtro categoría — ahora como select */}
              <div>
                <label style={labelStyle}>Categoría</label>
                <select
                  value={filtroCategoria}
                  onChange={e => { setFiltroCategoria(e.target.value); setEquiposSeleccionados([]); setBusqueda('') }}
                  style={inputStyle}
                >
                  <option value=''>Todas</option>
                  {categorias.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Filtro estado — ahora como select */}
              <div>
                <label style={labelStyle}>Estado</label>
                <select
                  value={filtroEstado}
                  onChange={e => { setFiltroEstado(e.target.value); setEquiposSeleccionados([]); setBusqueda('') }}
                  style={inputStyle}
                >
                  <option value=''>Todos</option>
                  <option value='Activo'>🟢 Activo</option>
                  <option value='En mantenimiento'>🟡 En mantenimiento</option>
                  <option value='Dado de baja'>🔴 Dado de baja</option>
                </select>
              </div>

              {/* Filtro laboratorio */}
              <div style={{ position: 'relative' }}>
                <label style={labelStyle}>Laboratorio</label>
                <input
                  type='text'
                  placeholder='Buscar laboratorio...'
                  value={busquedaLab}
                  onChange={e => {
                    setBusquedaLab(e.target.value)
                    setFiltroLaboratorio('')
                    setEquiposSeleccionados([])
                    setBusqueda('')
                  }}
                  onFocus={() => setLabDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setLabDropdownOpen(false), 150)}
                  style={inputStyle}
                />
                {labDropdownOpen && busquedaLab.trim().length > 0 && (() => {
                  const labsFiltrados = laboratorios.filter(l =>
                    l.name.toLowerCase().includes(busquedaLab.toLowerCase())
                  )
                  return (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                      border: '1px solid #e5e7eb', borderRadius: 8, background: 'white',
                      maxHeight: 180, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}>
                      {labsFiltrados.length === 0 ? (
                        <div style={{ padding: '0.75rem 1rem', color: '#9ca3af', fontSize: '0.875rem', textAlign: 'center' }}>
                          ⚠️ No existe ese laboratorio
                        </div>
                      ) : labsFiltrados.map(lab => (
                        <div
                          key={lab.id}
                          onMouseDown={() => {
                            setBusquedaLab(lab.name)
                            setFiltroLaboratorio(lab.name)
                          }}
                          style={{
                            padding: '0.6rem 1rem', cursor: 'pointer', fontSize: '0.875rem',
                            borderBottom: '1px solid #f3f4f6',
                            background: filtroLaboratorio === lab.name ? '#fef2f2' : 'white',
                            color: filtroLaboratorio === lab.name ? '#C0191F' : '#374151',
                          }}
                        >
                          {lab.name}
                          {lab.building && <span style={{ color: '#9ca3af', fontSize: '0.78rem', marginLeft: 6 }}>· {lab.building}</span>}
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>

            </div>

            {/* Buscador */}
            <label style={labelStyle}>Buscar y agregar equipos *</label>
            <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>🔍</span>
              <input
                type="text"
                placeholder="Buscar por asset tag, marca, modelo o serie..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                style={{ ...inputStyle, paddingLeft: '2rem', padding: '0.75rem 0.75rem 0.75rem 2rem' }}
              />
              {busqueda && (
                <button
                  onClick={() => setBusqueda('')}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '1rem' }}
                >✕</button>
              )}
            </div>

            {/* Dropdown de resultados */}
            {busqueda.trim().length > 0 && (() => {
              const yaSeleccionados = new Set(equiposSeleccionados.map(e => e.id))
              const resultados = equiposFiltrados.filter(eq => !yaSeleccionados.has(eq.id))
              return (
                <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, maxHeight: 220, overflowY: 'auto', marginBottom: '0.75rem' }}>
                  {resultados.length === 0 ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>
                      No se encontraron equipos
                    </div>
                  ) : resultados.map(eq => (
                    <div
                      key={eq.id}
                      onClick={() => {
                        setEquiposSeleccionados(prev => [...prev, eq])
                        setBusqueda('')
                      }}
                      style={{
                        padding: '0.6rem 0.9rem', cursor: 'pointer', fontSize: '0.875rem',
                        borderBottom: '1px solid #f3f4f6', background: 'white',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 700 }}>{eq.assetTag}</span>
                        <span style={{ color: '#6b7280' }}> — {eq.brand} {eq.model}</span>
                        {eq.serialNumber && <span style={{ color: '#9ca3af', fontSize: '0.78rem' }}> · {eq.serialNumber}</span>}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#C0191F', fontWeight: 600 }}>+ Agregar</span>
                    </div>
                  ))}
                </div>
              )
            })()}

            {/* Equipos seleccionados */}
            {equiposSeleccionados.length > 0 && (
              <div style={{ marginTop: '0.5rem' }}>
                <label style={{ ...labelStyle, marginBottom: '0.5rem' }}>
                  Equipos seleccionados ({equiposSeleccionados.length})
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {equiposSeleccionados.map(eq => (
                    <div key={eq.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '0.5rem 0.75rem', borderRadius: 8,
                      background: '#f0fdf4', border: '1px solid #86efac',
                      fontSize: '0.875rem', color: '#166534'
                    }}>
                      <span>
                        <strong>{eq.assetTag}</strong>
                        <span style={{ color: '#6b7280', marginLeft: 6 }}>{eq.brand} {eq.model}</span>
                      </span>
                      <button
                        onClick={() => setEquiposSeleccionados(prev => prev.filter(e => e.id !== eq.id))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', fontSize: '1rem', lineHeight: 1 }}
                      >✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resultados */}
            {busqueda.trim().length > 0 && (
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, maxHeight: 220, overflowY: 'auto' }}>
                {equiposFiltrados.length === 0 ? (
                  <div style={{ padding: '1rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>
                    No se encontraron equipos
                  </div>
                ) : equiposFiltrados.map(eq => (
                  <div
                    key={eq.id}
                    onClick={() => { setEquipoId(eq.id); setBusqueda(`${eq.assetTag} — ${eq.brand} ${eq.model}`) }}
                    style={{
                      padding: '0.6rem 0.9rem', cursor: 'pointer', fontSize: '0.875rem',
                      borderBottom: '1px solid #f3f4f6',
                      background: equipoId === eq.id ? '#fef2f2' : 'white',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 700 }}>{eq.assetTag}</span>
                      <span style={{ color: '#6b7280' }}> — {eq.brand} {eq.model}</span>
                      {eq.serialNumber && <span style={{ color: '#9ca3af', fontSize: '0.78rem' }}> · {eq.serialNumber}</span>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: 10, background: '#f3f4f6', color: '#6b7280' }}>
                        {eq.equipmentType?.name ?? 'Sin tipo'}
                      </span>
                      <span style={{
                        fontSize: '0.72rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: 10,
                        background: eq.status === 'Activo' ? '#dcfce7' : eq.status === 'En mantenimiento' ? '#fef9c3' : '#fee2e2',
                        color:      eq.status === 'Activo' ? '#166534' : eq.status === 'En mantenimiento' ? '#854d0e' : '#991b1b',
                      }}>
                        {eq.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Equipo seleccionado */}
            {equipoId && (
              <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: 8, background: '#f0fdf4', border: '1px solid #86efac', fontSize: '0.875rem', color: '#166534', fontWeight: 600 }}>
                ✓ Equipo seleccionado
              </div>
            )}
          </div>
        )}

        {/* Estadísticas: rango de fechas */}
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
const inputStyle = { width: '100%', padding: '0.65rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.875rem', boxSizing: 'border-box', fontFamily: 'inherit' }
const chipStyle   = (active) => ({
  padding: '0.25rem 0.75rem', borderRadius: 20, border: 'none',
  cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
  background: active ? '#C0191F' : '#f3f4f6',
  color: active ? 'white' : '#374151',
})