import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function Layout() {
  return (
    <div className="h-full flex bg-space-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto p-6">
          <div className="h-full grid-pattern rounded-2xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}