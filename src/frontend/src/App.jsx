import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './routes/ProtectedRoute'
import MainLayout from './components/MainLayout'

import Login from './pages/auth/Login'
import Dashboard from './pages/dashboard/Dashboard'
import Equipos from './pages/equipos/Equipos'

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Pública */}
        <Route path="/login" element={<Login />} />

        {/* Protegidas — dentro del layout principal */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/equipos" element={<Equipos />} />
          </Route>
        </Route>

        {/* Cualquier ruta desconocida → login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App