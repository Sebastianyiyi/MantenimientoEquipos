import { useState, useEffect } from 'react'
import { equipmentApi, maintenanceApi } from '../../services/api'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
  LineChart, Line, CartesianGrid,
} from 'recharts/umd/Recharts'

/* ─── Colores ───────────────────────────────────────────── */
const C = {
  red:    '#c0191f',
  blue:   '#3b82f6',
  green:  '#16a34a',
  amber:  '#d97706',
  purple: '#7c3aed',
  border: 'var(--border)',
  bg:     'var(--bg)',
  text:   'var(--text)',
  textH:  'var(--text-h)',
}

const TYPE_COLORS = ['#c0191f', '#3b82f6', '#d97706', '#16a34a', '#7c3aed', '#0891b2']

/* ─── Helpers ───────────────────────────────────────────── */
const card = {
  background: C.bg,
  border: `1px solid ${C.border}`,
  borderRadius: '12px',
  padding: '1.5rem',
}

const label = {
  fontSize: '0.7rem',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: C.text,
  marginBottom: '0.5rem',
}

/* ─── Tarjeta KPI ───────────────────────────────────────── */
function KPI({ title, value, sub, subColor, icon }) {
  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: C.text }}>{title}</span>
        <span style={{ fontSize: '1.1rem', opacity: 0.4 }}>{icon}</span>
      </div>
      <span style={{ fontSize: '2.2rem', fontWeight: 700, color: C.textH, lineHeight: 1 }}>{value ?? '—'}</span>
      {sub && <span style={{ fontSize: '0.75rem', color: subColor ?? C.text }}>{sub}</span>}
    </div>
  )
}

/* ─── Tooltip personalizado ─────────────────────────────── */
function CustomTooltip({ active, payload, label: lbl }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '0.6rem 0.9rem', fontSize: '0.8rem', color: C.textH }}>
      <p style={{ margin: 0, fontWeight: 600 }}>{lbl}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ margin: '0.15rem 0 0', color: p.color }}>{p.name ?? p.dataKey}: <strong>{p.value}</strong></p>
      ))}
    </div>
  )
}

/* ─── Leyenda Donut ─────────────────────────────────────── */
function DonutLegend({ data, total }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', flex: 1 }}>
      {data.map((item, i) => {
        const pct = total ? Math.round((item.value / total) * 100) : 0
        return (
          <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '3px', height: '28px', borderRadius: '2px', background: TYPE_COLORS[i % TYPE_COLORS.length], flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.82rem', color: C.textH, fontWeight: 500 }}>{item.name}</div>
              <div style={{ fontSize: '0.73rem', color: C.text }}>{item.value} unidades</div>
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: TYPE_COLORS[i % TYPE_COLORS.length] }}>{pct}%</span>
          </div>
        )
      })}
    </div>
  )
}

/* ─── Alerta item ───────────────────────────────────────── */
const PRIORITY_DOT = { Alta: C.red, Media: C.amber, Baja: C.green }
const STATUS_DOT   = { Pendiente: C.amber, 'En Proceso': C.blue, Terminado: C.green }

function AlertItem({ ticket }) {
  const dot = PRIORITY_DOT[ticket.priority] ?? STATUS_DOT[ticket.status] ?? C.text
  const timeAgo = ticket.createdAt
    ? (() => {
        const diff = Date.now() - new Date(ticket.createdAt)
        const h = Math.floor(diff / 3600000)
        if (h < 1) return 'Hace menos de 1h'
        if (h < 24) return `Hace ${h}h`
        return `Hace ${Math.floor(h / 24)}d`
      })()
    : ''
  return (
    <div style={{ display: 'flex', gap: '0.75rem', paddingBottom: '0.85rem', borderBottom: `1px solid ${C.border}` }}>
      <div style={{ marginTop: '4px', width: '8px', height: '8px', borderRadius: '50%', background: dot, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: C.textH }}>
          {ticket.priority === 'Alta' ? 'Crítico: ' : ''}{ticket.equipmentName ?? ticket.title ?? `Ticket #${ticket.id}`}
        </p>
        <p style={{ margin: '0.1rem 0 0', fontSize: '0.75rem', color: C.text }}>{ticket.description ?? ticket.status}</p>
        {timeAgo && <p style={{ margin: '0.1rem 0 0', fontSize: '0.7rem', color: C.text, opacity: 0.6 }}>{timeAgo}</p>}
      </div>
    </div>
  )
}

/* ─── Skeleton loader ───────────────────────────────────── */
function Skeleton({ h = '100%', w = '100%', r = '8px' }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: r,
      background: 'linear-gradient(90deg, var(--border) 25%, var(--code-bg, #f4f3ec) 50%, var(--border) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
    }} />
  )
}

/* ─── Página ────────────────────────────────────────────── */
export default function Dashboard() {
  const [stats,   setStats]   = useState(null)
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      equipmentApi.get('/equipments/stats').then(r => r.data).catch(() => null),
      maintenanceApi.get('/tickets').then(r => r.data).catch(() => []),
    ]).then(([s, t]) => {
      setStats(s)
      setTickets(Array.isArray(t) ? t : [])
    }).finally(() => setLoading(false))
  }, [])

  /* ── Derived data ── */
  const statusBarData = stats ? [
    { name: 'Activos',       value: stats.activos         ?? 0, color: C.green  },
    { name: 'Mantenimiento', value: stats.enMantenimiento ?? 0, color: C.amber  },
    { name: 'En Pausa',      value: stats.enPausa         ?? 0, color: C.purple },
    { name: 'Bajas',         value: stats.dadosDeBaja     ?? 0, color: C.red    },
  ] : []

  const typeDonutData = stats?.porTipo?.map(t => ({ name: t.tipo, value: t.cantidad })) ?? []

  /* Evolución mensual derivada de tickets */
  const monthlyData = (() => {
    const map = {}
    const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
    tickets.forEach(t => {
      if (!t.createdAt) return
      const d = new Date(t.createdAt)
      const key = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
      map[key] = (map[key] ?? 0) + 1
    })
    return Object.entries(map)
      .sort((a, b) => new Date('1 ' + a[0]) - new Date('1 ' + b[0]))
      .slice(-6)
      .map(([mes, casos]) => ({ mes, casos }))
  })()

  /* Tickets recientes (últimos 5, priorizando Alta) */
  const recentTickets = [...tickets]
    .sort((a, b) => {
      const pd = { Alta: 0, Media: 1, Baja: 2 }
      return (pd[a.priority] ?? 3) - (pd[b.priority] ?? 3)
    })
    .slice(0, 5)

  /* Tasas */
  const resolved   = tickets.filter(t => t.status === 'Terminado').length
  const resRate    = tickets.length ? Math.round((resolved / tickets.length) * 100) : null
  const pending    = tickets.filter(t => t.status === 'Pendiente').length
  const inProgress = tickets.filter(t => t.status === 'En Proceso').length

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px' }}>

      {/* shimmer keyframe */}
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>

      {/* Encabezado */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: C.textH }}>Dashboard Estadístico</h1>
        <p style={{ fontSize: '0.83rem', color: C.text, marginTop: '0.2rem' }}>
          Panel avanzado para la trazabilidad y toma de decisiones técnica.
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem' }}>
          {[...Array(4)].map((_, i) => <Skeleton key={i} h="110px" r="12px" />)}
        </div>
      ) : !stats ? (
        <div style={{ ...card, textAlign: 'center', color: C.text, fontSize: '0.9rem' }}>
          No se pudieron cargar las estadísticas. Verifique que el EquipmentService esté activo.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* ── Fila 1: KPIs ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <KPI title="Inventario Total"   value={stats.total}            icon="🖥️"
                 sub="+4 registros esta semana" subColor={C.blue} />
            <KPI title="Operatividad"       value={stats.activos}          icon="✅"
                 sub={`${stats.total ? Math.round((stats.activos/stats.total)*100) : 0}% salud de red`} subColor={C.green} />
            <KPI title="Atención"           value={stats.enMantenimiento}  icon="⚠️"
                 sub="Mantenimientos críticos" subColor={C.amber} />
            <KPI title="Retirados"          value={stats.dadosDeBaja}      icon="🗑️"
                 sub="Bajas este trimestre"    subColor={C.red} />
          </div>

          {/* ── Fila 2: Barras + Donut ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

            {/* Barras — estado */}
            <div style={card}>
              <p style={label}>Estado de equipos (cantidades)</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={statusBarData} barSize={36} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.text }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: C.text }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--code-bg,#f4f3ec)' }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {statusBarData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Donut — tipo */}
            {typeDonutData.length > 0 && (
              <div style={{ ...card, display: 'flex', flexDirection: 'column' }}>
                <p style={label}>Distribución por categoría</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1 }}>
                  <div style={{ position: 'relative', width: 160, height: 160, flexShrink: 0 }}>
                    <ResponsiveContainer width={160} height={160}>
                      <PieChart>
                        <Pie data={typeDonutData} cx={75} cy={75} innerRadius={50} outerRadius={72}
                             dataKey="value" stroke="none" paddingAngle={2}>
                          {typeDonutData.map((_, i) => <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                      <span style={{ fontSize: '1.4rem', fontWeight: 700, color: C.textH }}>{stats.total}</span>
                      <span style={{ fontSize: '0.65rem', color: C.text, textTransform: 'uppercase', letterSpacing: '0.06em' }}>equipos</span>
                    </div>
                  </div>
                  <DonutLegend data={typeDonutData} total={stats.total} />
                </div>
              </div>
            )}
          </div>

          {/* ── Fila 3: Línea temporal + Alertas ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

            {/* Línea — evolución de casos */}
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <p style={{ ...label, margin: 0 }}>Evolución de casos de mantenimiento</p>
                <span style={{ fontSize: '0.7rem', color: C.red, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: C.red, display: 'inline-block' }} />
                  Mensual
                </span>
              </div>
              {monthlyData.length > 1 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={monthlyData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis dataKey="mes" tick={{ fontSize: 10, fill: C.text }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: C.text }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="casos" stroke={C.red} strokeWidth={2}
                          dot={{ r: 4, fill: C.red, stroke: C.bg, strokeWidth: 2 }}
                          activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text, fontSize: '0.82rem' }}>
                  Sin suficientes datos de evolución
                </div>
              )}
            </div>

            {/* Alertas y cambios recientes */}
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <p style={{ ...label, margin: 0 }}>Alertas y cambios</p>
                <span style={{ fontSize: '1rem', opacity: 0.4 }}>🔔</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {recentTickets.length > 0
                  ? recentTickets.map((t, i) => <AlertItem key={t.id ?? i} ticket={t} />)
                  : <p style={{ fontSize: '0.82rem', color: C.text, margin: 0 }}>Sin tickets recientes.</p>
                }
              </div>
            </div>
          </div>

          {/* ── Fila 4: Estadísticas de gestión ── */}
          {tickets.length > 0 && (
            <div style={card}>
              <p style={label}>Estadísticas detalladas de gestión</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div>
                  <p style={{ ...label, margin: '0 0 0.25rem' }}>Tasa de resolución</p>
                  <p style={{ margin: 0, fontSize: '2rem', fontWeight: 700, color: C.textH }}>
                    {resRate !== null ? `${resRate}%` : '—'}
                    {resRate !== null && <span style={{ fontSize: '0.8rem', color: C.green, fontWeight: 500, marginLeft: '0.4rem' }}>+2.1%</span>}
                  </p>
                </div>
                <div>
                  <p style={{ ...label, margin: '0 0 0.25rem' }}>Casos pendientes</p>
                  <p style={{ margin: 0, fontSize: '2rem', fontWeight: 700, color: C.textH }}>
                    {pending}
                    <span style={{ fontSize: '0.8rem', color: C.amber, fontWeight: 500, marginLeft: '0.4rem' }}>En cola</span>
                  </p>
                </div>
                <div>
                  <p style={{ ...label, margin: '0 0 0.25rem' }}>En proceso</p>
                  <p style={{ margin: 0, fontSize: '2rem', fontWeight: 700, color: C.textH }}>
                    {inProgress}
                    <span style={{ fontSize: '0.8rem', color: C.blue, fontWeight: 500, marginLeft: '0.4rem' }}>Activos</span>
                  </p>
                </div>
                <div>
                  <p style={{ ...label, margin: '0 0 0.25rem' }}>Total tickets</p>
                  <p style={{ margin: 0, fontSize: '2rem', fontWeight: 700, color: C.textH }}>{tickets.length}</p>
                </div>
              </div>

              {/* Tabla resumen por estado */}
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  {['Estado', 'Total', 'Resueltos', '% Eficiencia'].map(h => (
                    <span key={h} style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: C.text }}>{h}</span>
                  ))}
                </div>
                {['Pendiente', 'En Proceso', 'Terminado'].map(status => {
                  const total = tickets.filter(t => t.status === status).length
                  const done  = status === 'Terminado' ? total : 0
                  const eff   = total ? Math.round((done / total) * 100) : 0
                  return (
                    <div key={status} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.5rem', padding: '0.6rem 0', borderTop: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: '0.83rem', color: C.textH }}>{status}</span>
                      <span style={{ fontSize: '0.83rem', color: C.text }}>{total}</span>
                      <span style={{ fontSize: '0.83rem', color: C.text }}>{done}</span>
                      <span style={{ fontSize: '0.83rem', fontWeight: 700, color: status === 'Terminado' ? C.green : C.text }}>
                        {status === 'Terminado' ? '100%' : total > 0 ? `${eff}%` : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}