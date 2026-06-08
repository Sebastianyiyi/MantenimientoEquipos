import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './routes/ProtectedRoute'
import MainLayout from './components/MainLayout'
import MsalRedirectHandler from './components/MsalRedirectHandler'

import Login from './pages/auth/Login'
import SinAcceso from './pages/auth/SinAcceso'
import Dashboard from './pages/dashboard/Dashboard'
import Equipos from './pages/equipos/Equipos'
import Catalogos from './pages/catalogos/Catalogos'
import Importar from './pages/importar/Importar'
import Usuarios from './pages/usuarios/Usuarios'
import Casos from './pages/casos/Casos'
import HojaDeVida from './pages/hojadevida/HojaDeVida'
import Reemplazo from './pages/reemplazo/Reemplazo'
import NuevoEquipo from './pages/equipos/nuevo/NuevoEquipo'
import EditarEquipo from './pages/equipos/editar/EditarEquipo'
import FichaEquipo from './pages/equipos/ficha/FichaEquipo'
import NuevoCaso from './pages/casos/nuevo/NuevoCaso'
import EditarCaso from './pages/casos/editar/EditarCaso'
import DetalleCaso from './pages/casos/detalle/DetalleCaso'

function App() {
  return (
    <AuthProvider>
      <MsalRedirectHandler />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/sin-acceso" element={<SinAcceso />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/equipos" element={<Equipos />} />
            <Route path="/equipos/importar" element={<Importar />} />
            <Route path="/casos" element={<Casos />} />
            <Route path="/equipos/:id/hoja-de-vida" element={<HojaDeVida />} />
            <Route path="/equipos/nuevo" element={<NuevoEquipo />} />
            <Route path="/equipos/:id/ficha" element={<FichaEquipo />} />
            <Route path="/equipos/:id/editar" element={<EditarEquipo />} />
            <Route path="/reemplazo" element={<Reemplazo />} />
            <Route path="/casos/nuevo" element={<NuevoCaso />} />
            <Route path="/casos/:id/editar" element={<EditarCaso />} />
            <Route path="/casos/:id/detalle" element={<DetalleCaso />} />
            <Route path="/importar" element={<Importar />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={['Administrador']} />}>
          <Route element={<MainLayout />}>
            <Route path="/catalogos" element={<Catalogos />} />
            <Route path="/usuarios" element={<Usuarios />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App