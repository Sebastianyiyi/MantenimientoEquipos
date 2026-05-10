import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './routes/ProtectedRoute'
import MainLayout from './components/MainLayout'
import MsalRedirectHandler from './components/MsalRedirectHandler'

import Login from './pages/auth/Login'
import Dashboard from './pages/dashboard/Dashboard'
import Equipos from './pages/equipos/Equipos'
import Catalogos from './pages/catalogos/Catalogos'
import Importar from './pages/importar/Importar'

function App() {
  return (
    <AuthProvider>
      <MsalRedirectHandler />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/equipos" element={<Equipos />} />
            <Route path="/catalogos" element={<Catalogos />} />
            <Route path="/importar" element={<Importar />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App