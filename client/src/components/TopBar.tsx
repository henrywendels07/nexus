import { useState, useEffect } from 'react'
import { useSocketStore } from '../store/socketStore'
import { Bell, Search, User, Clock } from 'lucide-react'
import clsx from 'clsx'

export default function TopBar() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [cpuUsage, setCpuUsage] = useState(0)
  const [memUsage, setMemUsage] = useState(0)
  const connected = useSocketStore(state => state.connected)
  const socket = useSocketStore(state => state.socket)

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!socket) return
    socket.on('system:stats', (stats: any) => {
      setCpuUsage(parseFloat(stats.cpu.current))
      setMemUsage(parseFloat(stats.memory.percent))
    })
    return () => { socket.off('system:stats') }
  }, [socket])


  const getStatusColor = (percent: number) => {
    if (percent >= 90) return 'text-error'
    if (percent >= 70) return 'text-warning'
    return 'text-accent'
  }

  return (
    <header className="h-14 bg-space-800/50 border-b border-space-700/50 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input type="text" placeholder="Search commands, files..." className="w-80 bg-space-900/50 border border-space-600 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-primary transition-colors" />
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2"><span className="text-gray-500">CPU</span><span className={clsx('font-mono font-medium', getStatusColor(cpuUsage))}>{cpuUsage.toFixed(1)}%</span></div>
          <div className="w-px h-4 bg-space-600" />
          <div className="flex items-center gap-2"><span className="text-gray-500">MEM</span><span className={clsx('font-mono font-medium', getStatusColor(memUsage))}>{memUsage.toFixed(1)}%</span></div>
        </div>
        <div className="w-px h-6 bg-space-600" />
        <div className="flex items-center gap-2 text-gray-400">
          <Clock className="w-4 h-4" />
          <span className="font-mono text-sm">{currentTime.toLocaleTimeString('en-US', { hour12: false })}</span>
        </div>
        <div className="w-px h-6 bg-space-600" />
        <div className="flex items-center gap-2">
          <div className={clsx('w-2 h-2 rounded-full', connected ? 'bg-accent animate-pulse' : 'bg-error')} />
          <span className="text-xs text-gray-400">{connected ? 'Connected' : 'Disconnected'}</span>
        </div>
        <button className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-space-700 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
        </button>
        <button className="flex items-center gap-2 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-space-700 transition-colors">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
        </button>
      </div>
    </header>
  )
}