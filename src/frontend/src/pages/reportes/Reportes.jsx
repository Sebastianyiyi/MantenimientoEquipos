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
    const lista = res.data

    const doc = new jsPDF()
    const ROJO    = [192, 25, 31]
    const GRIS_OS = [31, 41, 55]    // encabezados de sección
    const GRIS_CL = [249, 250, 251] // fondo alterno de filas
    const VERDE   = [220, 252, 231]
    const VERDE_T = [22, 101, 52]
    const AMARILLO   = [254, 249, 195]
    const AMARILLO_T = [133, 77, 14]
    const ROJO_CL = [254, 226, 226]
    const ROJO_T  = [153, 27, 27]
    const AZUL_CL = [219, 234, 254]
    const AZUL_T  = [30, 64, 175]

    const tipoColor = (tipo) => {
      if (tipo === 'Preventivo')  return { bg: VERDE,    txt: VERDE_T }
      if (tipo === 'Correctivo')  return { bg: ROJO_CL,  txt: ROJO_T  }
      if (tipo === 'Adaptativo')  return { bg: AZUL_CL,  txt: AZUL_T  }
      return { bg: [243,244,246], txt: [55,65,81] }
    }

    const estadoColor = (estado) => {
      if (estado === 'Terminado')   return { bg: VERDE,    txt: VERDE_T }
      if (estado === 'En Proceso')  return { bg: AMARILLO, txt: AMARILLO_T }
      if (estado === 'Pendiente')   return { bg: [243,244,246], txt: [55,65,81] }
      return { bg: [243,244,246], txt: [55,65,81] }
    }

    // Dibuja una "pill" (badge redondeado) con texto centrado
    const drawBadge = (doc, text, x, y, bgColor, txtColor) => {
      const fs = 7
      doc.setFontSize(fs)
      const w = doc.getTextWidth(text) + 6
      const h = 5
      doc.setFillColor(...bgColor)
      doc.roundedRect(x, y - 3.5, w, h, 1.5, 1.5, 'F')
      doc.setTextColor(...txtColor)
      doc.setFont('helvetica', 'bold')
      doc.text(text, x + 3, y)
      doc.setFont('helvetica', 'normal')
      return w  // ancho del badge para encadenar
    }

    // Línea separadora gris
    const drawDivider = (doc, y) => {
      doc.setDrawColor(229, 231, 235)
      doc.setLineWidth(0.3)
      doc.line(14, y, 196, y)
    }

    // Verifica salto de página
    const checkPage = (doc, y, needed = 20) => {
      if (y + needed > 280) { doc.addPage(); return 20 }
      return y
    }

    let esPrimeraPagina = true

    for (const datos of lista) {
      const equipo = equiposSeleccionados.find(e => e.id === datos.equipmentId)

      if (!esPrimeraPagina) doc.addPage()
      esPrimeraPagina = false

      // ── ENCABEZADO ──────────────────────────────────────────────
      doc.setFillColor(...ROJO)
      doc.rect(0, 0, 210, 30, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text('UNIVERSIDAD TÉCNICA DE AMBATO — FISEI', 105, 11, { align: 'center' })
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text('Sistema de Mantenimiento de Equipos Tecnológicos', 105, 18, { align: 'center' })
      doc.text(`Hoja de Vida del Equipo · Generado el ${formatDate(new Date())}`, 105, 24, { align: 'center' })
      doc.setTextColor(0, 0, 0)

      let y = 38

      // ── FICHA DEL EQUIPO ─────────────────────────────────────────
      doc.setFillColor(...GRIS_OS)
      doc.roundedRect(14, y - 5, 182, 6, 1, 1, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('IDENTIFICACIÓN DEL EQUIPO', 17, y)
      doc.setTextColor(0, 0, 0)
      y += 5

      autoTable(doc, {
        startY: y,
        body: [
          ['Asset Tag', equipo?.assetTag ?? '—',   'Marca / Modelo', `${equipo?.brand ?? ''} ${equipo?.model ?? ''}`],
          ['N° de Serie', equipo?.serialNumber ?? '—', 'Tipo',          equipo?.equipmentType?.name ?? equipo?.equipmentTypeName ?? '—'],
          ['Estado',     equipo?.status ?? '—',    'Último mant.',   formatDate(datos.ultimoMantenimiento)],
        ],
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 32, fillColor: [243,244,246] },
          1: { cellWidth: 55 },
          2: { fontStyle: 'bold', cellWidth: 32, fillColor: [243,244,246] },
          3: { cellWidth: 55 },
        },
        styles: { fontSize: 8.5, cellPadding: 3 },
        margin: { left: 14, right: 14 },
        theme: 'grid',
      })
      y = doc.lastAutoTable.finalY + 4

      // ── RESUMEN ESTADÍSTICO ───────────────────────────────────────
      const stats = [
        { label: 'Casos registrados',    value: datos.totalCasos },
        { label: 'Actividades realizadas', value: datos.totalActividades },
        { label: 'Recursos utilizados',  value: datos.totalRecursos },
      ]
      const boxW = 58, boxH = 14, gap = 4
      let bx = 14
      stats.forEach(s => {
        doc.setFillColor(254, 242, 242)
        doc.roundedRect(bx, y, boxW, boxH, 2, 2, 'F')
        doc.setDrawColor(...ROJO)
        doc.setLineWidth(0.4)
        doc.roundedRect(bx, y, boxW, boxH, 2, 2, 'S')
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...ROJO)
        doc.text(String(s.value), bx + boxW / 2, y + 8, { align: 'center' })
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(107, 114, 128)
        doc.text(s.label, bx + boxW / 2, y + 12, { align: 'center' })
        bx += boxW + gap
      })
      y += boxH + 8

      // ── LÍNEA DE TIEMPO DE CASOS ──────────────────────────────────
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...GRIS_OS)
      doc.text('LÍNEA DE TIEMPO DE INTERVENCIONES', 14, y)
      y += 5
      drawDivider(doc, y)
      y += 4

      if ((datos.historia ?? []).length === 0) {
        doc.setFontSize(8.5)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(156, 163, 175)
        doc.text('Este equipo no tiene casos de mantenimiento registrados.', 14, y)
        y += 10
      }

      for (const caso of datos.historia ?? []) {
        y = checkPage(doc, y, 30)

        const tc = tipoColor(caso.maintenanceType)
        const ec = estadoColor(caso.ticketStatus)

        // Línea de tiempo: círculo de color
        doc.setFillColor(...tc.txt)
        doc.circle(17, y + 1, 2, 'F')
        // Línea vertical (si no es el último)
        doc.setDrawColor(...tc.txt)
        doc.setLineWidth(0.5)

        // Fondo de cabecera del caso
        doc.setFillColor(248, 248, 248)
        doc.roundedRect(22, y - 4, 174, 13, 2, 2, 'F')
        doc.setDrawColor(229, 231, 235)
        doc.setLineWidth(0.3)
        doc.roundedRect(22, y - 4, 174, 13, 2, 2, 'S')

        // Número del ticket
        doc.setFontSize(8.5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...GRIS_OS)
        doc.text(caso.ticketNumber, 26, y + 1)

        // Badges tipo y estado
        const badgeX = 26 + doc.getTextWidth(caso.ticketNumber) + 4
        const bw1 = drawBadge(doc, caso.maintenanceType, badgeX, y + 1, tc.bg, tc.txt)
        drawBadge(doc, caso.ticketStatus, badgeX + bw1 + 2, y + 1, ec.bg, ec.txt)

        // Fecha (derecha)
        const fechaTxt = caso.fechaInicio
          ? `${formatDate(caso.fechaInicio)}${caso.fechaCierre ? ' → ' + formatDate(caso.fechaCierre) : ''}`
          : '—'
        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(107, 114, 128)
        doc.text(fechaTxt, 193, y + 1, { align: 'right' })

        y += 11

        // Título del caso
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(17, 24, 39)
        doc.text(caso.title ?? '—', 26, y)
        y += 5

        // Contador rápido: técnicos, actividades, diagnósticos, recursos
        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(107, 114, 128)
        const contadores = [
          `👤 ${caso.tecnicos?.length ?? 0} técnico(s)`,
          `🔧 ${caso.actividades?.length ?? 0} actividad(es)`,
          `🔍 ${caso.diagnosticos?.length ?? 0} diagnóstico(s)`,
          `📦 ${caso.recursos?.length ?? 0} recurso(s)`,
        ]
        doc.text(contadores.join('   '), 26, y)
        y += 6

        // ── TÉCNICOS ──
        if ((caso.tecnicos ?? []).length > 0) {
          y = checkPage(doc, y, 12)
          doc.setFontSize(8)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(...GRIS_OS)
          doc.text('TÉCNICOS QUE INTERVINIERON', 26, y)
          y += 4

          for (const t of caso.tecnicos) {
            y = checkPage(doc, y, 10)
            const nombre = t.technicianUserId ?? '—'
            // Avatar circular
            doc.setFillColor(...ROJO)
            doc.circle(30, y, 3, 'F')
            doc.setFontSize(6.5)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(255, 255, 255)
            doc.text((nombre[0] ?? 'T').toUpperCase(), 30, y + 1, { align: 'center' })
            // Nombre
            doc.setFontSize(8)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(17, 24, 39)
            doc.text(nombre, 36, y + 1)
            y += 5
            if (t.activityDescription) {
              doc.setFontSize(7.5)
              doc.setFont('helvetica', 'normal')
              doc.setTextColor(75, 85, 99)
              doc.text(t.activityDescription, 36, y)
              y += 4
            }
          }
          y += 2
        }

        // ── ACTIVIDADES ──
        if ((caso.actividades ?? []).length > 0) {
          y = checkPage(doc, y, 16)
          doc.setFontSize(8)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(...GRIS_OS)
          doc.text('ACTIVIDADES REALIZADAS', 26, y)
          y += 3

          autoTable(doc, {
            startY: y,
            head: [['Actividad', 'Categoría', 'Fecha']],
            body: caso.actividades.map(a => [
              a.nombre ?? a.activityName ?? '—',
              a.categoria ?? a.activityCategory ?? '—',
              formatDate(a.addedAt)
            ]),
            headStyles: { fillColor: GRIS_OS, fontSize: 7.5 },
            bodyStyles: { fontSize: 7.5 },
            alternateRowStyles: { fillColor: GRIS_CL },
            columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 60 }, 2: { cellWidth: 36 } },
            margin: { left: 26, right: 14 },
            styles: { cellPadding: 2 },
          })
          y = doc.lastAutoTable.finalY + 3
        }

        // ── DIAGNÓSTICOS ──
        if ((caso.diagnosticos ?? []).length > 0) {
          y = checkPage(doc, y, 16)
          doc.setFontSize(8)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(...GRIS_OS)
          doc.text('DIAGNÓSTICOS IDENTIFICADOS', 26, y)
          y += 3

          autoTable(doc, {
            startY: y,
            head: [['Diagnóstico', 'Severidad', 'Fecha']],
            body: caso.diagnosticos.map(d => [
              d.nombre ?? d.diagnosisName ?? '—',
              d.severidad ?? d.diagnosisSeverity ?? '—',
              formatDate(d.addedAt)
            ]),
            headStyles: { fillColor: GRIS_OS, fontSize: 7.5 },
            bodyStyles: { fontSize: 7.5 },
            alternateRowStyles: { fillColor: GRIS_CL },
            columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 60 }, 2: { cellWidth: 36 } },
            margin: { left: 26, right: 14 },
            styles: { cellPadding: 2 },
          })
          y = doc.lastAutoTable.finalY + 3
        }

        // ── RECURSOS ──
        if ((caso.recursos ?? []).length > 0) {
          y = checkPage(doc, y, 16)
          doc.setFontSize(8)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(...GRIS_OS)
          doc.text('RECURSOS UTILIZADOS', 26, y)
          y += 3

          autoTable(doc, {
            startY: y,
            head: [['Recurso', 'Cantidad', 'Descripción']],
            body: caso.recursos.map(r => [r.name ?? '—', r.quantity ?? '—', r.description ?? '—']),
            headStyles: { fillColor: GRIS_OS, fontSize: 7.5 },
            bodyStyles: { fontSize: 7.5 },
            alternateRowStyles: { fillColor: GRIS_CL },
            columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 20 }, 2: { cellWidth: 96 } },
            margin: { left: 26, right: 14 },
            styles: { cellPadding: 2 },
          })
          y = doc.lastAutoTable.finalY + 3
        }

        // Separador entre casos
        y += 2
        drawDivider(doc, y)
        y += 5
      }
    }

    // Numeración de páginas
    const total = doc.getNumberOfPages()
    for (let i = 1; i <= total; i++) {
      doc.setPage(i)
      doc.setFontSize(7.5)
      doc.setTextColor(156, 163, 175)
      doc.text(`FISEI-UTA · Sistema de Mantenimiento`, 14, 291)
      doc.text(`Página ${i} de ${total}`, 196, 291, { align: 'right' })
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
      const status = e?.response?.status
      const msg = e?.response?.data?.message ?? e?.response?.data ?? e?.message ?? 'Error desconocido'
      setError(`Error ${status ?? ''}: ${JSON.stringify(msg)}`)
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