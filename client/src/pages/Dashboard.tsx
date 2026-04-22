import { useState, useEffect } from 'react'
import { useSocketStore } from '../store/socketStore'
import { Cpu, MemoryStick, HardDrive, Network, Activity, Clock } from 'lucide-react'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import clsx from 'clsx'

interface SystemStats {
  timestamp: number
  cpu: { current: string; cores: number; perCore: string[] }
  memory: { total: number; used: number; free: number; percent: string }
  disk: { mount: string; size: number; used: number; available: number; percent: string }
  network: { rx: number; tx: number; totalRx: number; totalTx: number }
  load: number[]
  uptime: number
  history: { timestamps: number[]; cpu: number[]; memory: number[]; network: { rx: number; tx: number }[] }
}

function formatBytes(bytes: number): string { if (bytes === 0) return '0 B'; const k = 1024; const sizes = ['B', 'KB', 'MB', 'GB', 'TB']; const i = Math.floor(Math.log(bytes) / Math.log(k)); return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]; }
function formatUptime(seconds: number): string { const days = Math.floor(seconds / 86400); const hours = Math.floor((seconds % 86400) / 3600); const mins = Math.floor((seconds % 3600) / 60); if (days > 0) return `${days}d ${hours}h`; if (hours > 0) return `${hours}h ${mins}m`; return `${mins}m`; }

function CircularGauge({ value, max = 100, label, unit = '%', size = 140, strokeWidth = 12 }) {
  const percent = Math.min((value / max) * 100, 100)
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percent / 100) * circumference
  const getColor = () => { if (percent >= 90) return '#EF4444'; if (percent >= 70) return '#F59E0B'; return '#00D9FF'; }
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="currentColor" strokeWidth={strokeWidth} fill="none" className="text-space-700" />
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={getColor()} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-500" style={{ filter: `drop-shadow(0 0 6px ${getColor()}40)` }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-bold font-orbitron" style={{ color: getColor() }}>{value.toFixed(1)}</span><span className="text-xs text-gray-400">{unit}</span></div>
      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-xs text-gray-400 bg-space-800 px-2">{label}</span>
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const socket = useSocketStore(state => state.socket)

  useEffect(() => {
    if (!socket) return
    socket.on('system:stats', (data: SystemStats) => setStats(data))
    return () => { socket.off('system:stats') }
  }, [socket])

  const chartData = stats?.history?.timestamps?.map((ts, i) => ({
    time: new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    cpu: stats.history.cpu[i],
    memory: stats.history.memory[i],
    networkRx: (stats.history.network[i]?.rx || 0) / 1024,
    networkTx: (stats.history.network[i]?.tx || 0) / 1024,
  })) || []


  return (
    <div className="h-full overflow-y-auto">
      <div className="mb-6"><h1 className="font-orbitron text-2xl font-bold text-white mb-2">System Dashboard</h1><p className="text-gray-400">Real-time monitoring of your Oracle Cloud VPS</p></div>
      <div className="grid grid-cols-4 gap-6 mb-6">
        <div className="card card-hover flex flex-col items-center py-6"><CircularGauge value={parseFloat(stats?.cpu.current || '0')} label="CPU" size={140} strokeWidth={12} /><div className="mt-4 flex items-center gap-2 text-sm"><Cpu className="w-4 h-4 text-primary" /><span className="text-gray-400">{stats?.cpu.cores || 0} cores</span></div></div>
        <div className="card card-hover flex flex-col items-center py-6"><CircularGauge value={parseFloat(stats?.memory.percent || '0')} label="Memory" size={140} strokeWidth={12} /><div className="mt-4 flex flex-col items-center text-sm"><span className="text-gray-400">{formatBytes(stats?.memory.used || 0)} / {formatBytes(stats?.memory.total || 0)}</span></div></div>
        <div className="card card-hover flex flex-col items-center py-6"><CircularGauge value={parseFloat(stats?.disk?.percent || '0')} label="Disk" size={140} strokeWidth={12} /><div className="mt-4 flex flex-col items-center text-sm"><span className="text-gray-400">{formatBytes(stats?.disk?.used || 0)} used</span></div></div>
        <div className="card card-hover py-6"><div className="flex flex-col items-center h-full justify-center"><div className="text-3xl font-bold font-orbitron text-primary">{formatUptime(stats?.uptime || 0)}</div><div className="flex items-center gap-2 mt-3 text-sm text-gray-400"><Clock className="w-4 h-4" /><span>Uptime</span></div></div></div>
      </div>
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-white flex items-center gap-2"><Activity className="w-5 h-5 text-primary" />CPU & Memory Usage</h3><div className="flex items-center gap-4 text-xs"><div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-primary" /><span className="text-gray-400">CPU</span></div><div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-secondary" /><span className="text-gray-400">Memory</span></div></div></div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><defs><linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00D9FF" stopOpacity={0.3} /><stop offset="95%" stopColor="#00D9FF" stopOpacity={0} /></linearGradient><linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} /><stop offset="95%" stopColor="#6366F1" stopOpacity={0} /></linearGradient></defs><XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} /><Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px', fontSize: '12px' }} labelStyle={{ color: '#9CA3AF' }} /><Area type="monotone" dataKey="cpu" stroke="#00D9FF" strokeWidth={2} fill="url(#colorCpu)" /><Area type="monotone" dataKey="memory" stroke="#6366F1" strokeWidth={2} fill="url(#colorMem)" /></AreaChart></ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-white flex items-center gap-2"><Network className="w-5 h-5 text-primary" />Network Activity</h3><div className="flex items-center gap-4 text-xs"><div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-accent" /><span className="text-gray-400">Download</span></div><div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-warning" /><span className="text-gray-400">Upload</span></div></div></div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><defs><linearGradient id="colorRx" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10B981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10B981" stopOpacity={0} /></linearGradient><linearGradient id="colorTx" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} /><stop offset="95%" stopColor="#F59E0B" stopOpacity={0} /></linearGradient></defs><XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} tickFormatter={(v) => `${v.toFixed(0)} KB/s`} /><Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px', fontSize: '12px' }} labelStyle={{ color: '#9CA3AF' }} /><Area type="monotone" dataKey="networkRx" stroke="#10B981" strokeWidth={2} fill="url(#colorRx)" /><Area type="monotone" dataKey="networkTx" stroke="#F59E0B" strokeWidth={2} fill="url(#colorTx)" /></AreaChart></ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="card"><h3 className="font-semibold text-white mb-4 flex items-center gap-2"><Cpu className="w-5 h-5 text-primary" />CPU Details</h3><div className="space-y-3"><div className="flex justify-between items-center"><span className="text-gray-400 text-sm">Load (1m)</span><span className="font-mono text-primary">{stats?.load?.[0]?.toFixed(2) || '0.00'}</span></div><div className="flex justify-between items-center"><span className="text-gray-400 text-sm">Load (5m)</span><span className="font-mono text-white">{stats?.load?.[1]?.toFixed(2) || '0.00'}</span></div></div></div>
        <div className="card"><h3 className="font-semibold text-white mb-4 flex items-center gap-2"><MemoryStick className="w-5 h-5 text-primary" />Memory Details</h3><div className="space-y-3"><div className="flex justify-between items-center"><span className="text-gray-400 text-sm">Total</span><span className="font-mono text-white">{formatBytes(stats?.memory.total || 0)}</span></div><div className="flex justify-between items-center"><span className="text-gray-400 text-sm">Used</span><span className="font-mono text-primary">{formatBytes(stats?.memory.used || 0)}</span></div></div></div>
        <div className="card"><h3 className="font-semibold text-white mb-4 flex items-center gap-2"><Network className="w-5 h-5 text-primary" />Network Details</h3><div className="space-y-3"><div className="flex justify-between items-center"><span className="text-gray-400 text-sm">Download</span><span className="font-mono text-accent">{((stats?.network.rx || 0) / 1024).toFixed(2)} KB/s</span></div><div className="flex justify-between items-center"><span className="text-gray-400 text-sm">Upload</span><span className="font-mono text-warning">{((stats?.network.tx || 0) / 1024).toFixed(2)} KB/s</span></div></div></div>
      </div>
    </div>
  )
}