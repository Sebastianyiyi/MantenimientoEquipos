import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import './MainLayout.css'

export default function MainLayout() {
  return (
    <div className="layout">
      <Sidebar />
      <div className="layout-body">
        <Topbar />
        <main className="layout-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}