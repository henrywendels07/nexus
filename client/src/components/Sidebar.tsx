import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useSocketStore } from '../store/socketStore'
import { MessageSquare, LayoutDashboard, Container, Terminal, Folder, Settings, ChevronLeft, ChevronRight, Zap } from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { path: '/chat', icon: MessageSquare, label: 'AI Chat' },
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/docker', icon: Container, label: 'Docker' },
  { path: '/terminal', icon: Terminal, label: 'Terminal' },
  { path: '/files', icon: Folder, label: 'Files' },
  { path: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const connected = useSocketStore(state => state.connected)
  return (
    <aside className={clsx('h-full flex flex-col bg-space-800/50 border-r border-space-700/50 transition-all duration-300', collapsed ? 'w-16' : 'w-60')}>
      <div className="h-14 flex items-center px-4 border-b border-space-700/50">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            {connected && <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-accent rounded-full border-2 border-space-800 animate-pulse" />}
          </div>
          {!collapsed && <span className="font-orbitron font-bold text-lg text-white tracking-wider">NEXUS</span>}
        </div>
      </div>
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <li key={item.path}>
                <NavLink to={item.path} className={clsx('flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative', isActive ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:text-white hover:bg-space-700/50')}>
                  {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />}
                  <item.icon className={clsx('w-5 h-5 flex-shrink-0', isActive && 'text-primary')} />
                  {!collapsed && <span className="font-medium text-sm">{item.label}</span>}
                  {collapsed && <div className="absolute left-full ml-2 px-2 py-1 bg-space-700 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">{item.label}</div>}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>
      <div className="p-2 border-t border-space-700/50">
        <button onClick={() => setCollapsed(!collapsed)} className="w-full flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-white hover:bg-space-700/50 transition-colors">
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>
    </aside>
  )
}