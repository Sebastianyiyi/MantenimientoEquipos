import { useState, useEffect } from 'react'
import { equipmentApi } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    equipmentApi.get('/equipments/stats')
      .then(res => setStats(res.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0 }}>Panel de Control</h1>
        <p style={{ color: '#888', margin: '0.25rem 0 0' }}>
          Sistema de Mantenimiento de Equipos Tecnológicos — FISEI
        </p>
      </div>

      {loading ? <p>Cargando estadísticas...</p> : stats ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <StatCard label="Total Equipos"     value={stats.total}            color="#3b82f6" icon="🖥️" />
            <StatCard label="Activos"            value={stats.activos}          color="#16a34a" icon="✅" />
            <StatCard label="En Mantenimiento"   value={stats.enMantenimiento}  color="#d97706" icon="🔧" />
            <StatCard label="En Pausa"           value={stats.enPausa ?? 0}     color="#7c3aed" icon="⏸️" />
            <StatCard label="Dados de Baja"      value={stats.dadosDeBaja}      color="#c0191f" icon="❌" />
          </div>

          {stats.porTipo?.length > 0 && (
            <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
              <h3 style={{ marginTop: 0 }}>Equipos por Tipo</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {stats.porTipo.map(item => (
                  <div key={item.tipo} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ minWidth: '120px', fontSize: '0.9rem' }}>{item.tipo}</span>
                    <div style={{ flex: 1, background: '#f3f4f6', borderRadius: '4px', height: '20px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min((item.cantidad / stats.total) * 100, 100)}%`,
                        background: '#c0191f',
                        borderRadius: '4px',
                        transition: 'width 0.3s'
                      }} />
                    </div>
                    <span style={{ minWidth: '30px', fontWeight: 600, fontSize: '0.9rem' }}>{item.cantidad}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e5e7eb' }}>
            <h3 style={{ marginTop: 0 }}>Accesos Rápidos</h3>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <QuickLink href="/equipos"   icon="🖥️" label="Registrar Equipo" />
              <QuickLink href="/importar"  icon="📤" label="Importar CSV" />
              <QuickLink href="/catalogos" icon="📋" label="Catálogos" />
              {user?.role === 'Administrador' && (
                <QuickLink href="/usuarios" icon="👥" label="Gestión de Usuarios" />
              )}
            </div>
          </div>
        </>
      ) : (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '2rem', border: '1px solid #e5e7eb', textAlign: 'center', color: '#888' }}>
          No se pudieron cargar las estadísticas. Verifique que el EquipmentService esté activo.
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color, icon }) {
  return (
    <div style={{ background: '#fff', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.85rem', color: '#888' }}>{label}</span>
        <span style={{ fontSize: '1.2rem' }}>{icon}</span>
      </div>
      <span style={{ fontSize: '2rem', fontWeight: 700, color }}>{value}</span>
    </div>
  )
}

function QuickLink({ href, icon, label }) {
  return (
    <a href={href} style={{
      display: 'flex', alignItems: 'center', gap: '0.5rem',
      padding: '0.75rem 1.25rem', background: '#f9fafb',
      borderRadius: '8px', border: '1px solid #e5e7eb',
      textDecoration: 'none', color: '#374151', fontWeight: 500,
      transition: 'background 0.2s'
    }}
      onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
      onMouseLeave={e => e.currentTarget.style.background = '#f9fafb'}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </a>
  )
}