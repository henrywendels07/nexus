import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSocketStore } from '../store/socketStore'
import { Container, Play, Pause, Square, RotateCcw, Trash2, Terminal, Loader2, Search, RefreshCw } from 'lucide-react'
import clsx from 'clsx'

const API_BASE = '/api/docker'
interface ContainerInfo { id: string; name: string; image: string; state: string; status: string; ports: { private: number; public: number; type: string }[] }


async function fetchDockerStatus() { const res = await fetch(`${API_BASE}/status`); return res.json() }
async function fetchContainers() { const res = await fetch(`${API_BASE}/containers`); return res.json() }
async function startContainer(id: string) { await fetch(`${API_BASE}/containers/${id}/start`, { method: 'POST' }) }
async function stopContainer(id: string) { await fetch(`${API_BASE}/containers/${id}/stop`, { method: 'POST' }) }
async function removeContainer(id: string) { await fetch(`${API_BASE}/containers/${id}`, { method: 'DELETE' }) }
async function getContainerLogs(id: string) { const res = await fetch(`${API_BASE}/containers/${id}/logs`); const data = await res.json(); return data.logs || '' }

export default function Docker() {
  const [selectedContainer, setSelectedContainer] = useState<ContainerInfo | null>(null)
  const [logs, setLogs] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showLogs, setShowLogs] = useState(false)
  const queryClient = useQueryClient()
  const socket = useSocketStore(state => state.socket)

  const { data: status, isLoading: statusLoading } = useQuery({ queryKey: ['dockerStatus'], queryFn: fetchDockerStatus, refetchInterval: 10000 })
  const { data: containers = [], isLoading: containersLoading, refetch: refetchContainers } = useQuery({ queryKey: ['containers'], queryFn: fetchContainers, refetchInterval: 5000 })
  useEffect(() => { if (!socket) return; socket.on('container:update', () => refetchContainers()); return () => { socket.off('container:update') } }, [socket, refetchContainers])
  const startMutation = useMutation({ mutationFn: startContainer, onSuccess: () => refetchContainers() })
  const stopMutation = useMutation({ mutationFn: stopContainer, onSuccess: () => refetchContainers() })
  const removeMutation = useMutation({ mutationFn: removeContainer, onSuccess: () => { refetchContainers(); setSelectedContainer(null) } })
  const handleViewLogs = async (container: ContainerInfo) => { setSelectedContainer(container); const logsData = await getContainerLogs(container.id); setLogs(logsData); setShowLogs(true) }
  const filteredContainers = containers.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.image.toLowerCase().includes(searchQuery.toLowerCase()))
  const getStateColor = (state: string) => { switch (state) { case 'running': return 'bg-accent'; case 'exited': return 'bg-gray-500'; default: return 'bg-gray-400' } }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div><h1 className="font-orbitron text-2xl font-bold text-white mb-2">Docker Manager</h1><p className="text-gray-400">Manage your containers</p></div>
        <div className="flex items-center gap-4">
          {statusLoading ? <div className="flex items-center gap-2 text-gray-400"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Checking...</span></div> : status?.status === 'online' ? <div className="flex items-center gap-4 px-4 py-2 bg-space-800 rounded-lg border border-space-700"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-accent animate-pulse" /><span className="text-sm text-gray-300">Online</span></div><div className="w-px h-4 bg-space-600" /><span className="text-sm text-gray-400">{status.running} running</span></div> : <div className="flex items-center gap-2 px-4 py-2 bg-error/10 border border-error/30 rounded-lg"><div className="w-2 h-2 rounded-full bg-error" /><span className="text-sm text-error">Offline</span></div>}
          <button onClick={() => refetchContainers()} className="p-2 bg-space-800 text-gray-400 hover:text-white rounded-lg transition-colors"><RefreshCw className={clsx('w-5 h-5', containersLoading && 'animate-spin')} /></button>
        </div>
      </div>
      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1 max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" /><input type="text" placeholder="Search containers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-space-800 border border-space-600 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-primary" /></div>
      </div>
      {containersLoading ? <div className="flex-1 flex items-center justify-center"><div className="flex items-center gap-3 text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /><span>Loading...</span></div></div> : filteredContainers.length === 0 ? <div className="flex-1 flex flex-col items-center justify-center"><div className="w-16 h-16 rounded-full bg-space-700 flex items-center justify-center mb-4"><Container className="w-8 h-8 text-gray-500" /></div><h3 className="text-lg font-semibold text-white mb-2">No Containers</h3><p className="text-gray-400 text-center">Create a container to get started</p></div> :
      <div className="flex-1 overflow-y-auto"><div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredContainers.map((container) => (
          <div key={container.id} className={clsx('card card-hover transition-all', selectedContainer?.id === container.id && 'border-primary/50')} onClick={() => setSelectedContainer(container)}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="relative"><div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center', container.state === 'running' ? 'bg-accent/10 text-accent' : 'bg-space-700 text-gray-400')}><Container className="w-5 h-5" /></div>{container.state === 'running' && <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full border-2 border-space-800 animate-pulse" />}</div>
                <div><h3 className="font-semibold text-white">{container.name}</h3><p className="text-xs text-gray-500 font-mono">{container.id.slice(0, 12)}</p></div>
              </div>
              <div className={clsx('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', container.state === 'running' ? 'bg-accent/10 text-accent' : 'bg-gray-500/10 text-gray-400')}><div className={clsx('w-1.5 h-1.5 rounded-full', getStateColor(container.state))} />{container.state}</div>
            </div>
            <div className="space-y-2 mb-4"><div className="flex items-center justify-between text-sm"><span className="text-gray-400">Image</span><span className="font-mono text-gray-300 text-xs">{container.image}</span></div><div className="flex items-center justify-between text-sm"><span className="text-gray-400">Status</span><span className="text-xs">{container.status}</span></div></div>
            <div className="flex items-center gap-2 pt-3 border-t border-space-700/50">
              {container.state === 'running' ? <><button onClick={(e) => { e.stopPropagation(); stopMutation.mutate(container.id) }} className="flex-1 flex items-center justify-center gap-2 py-2 bg-warning/10 text-warning hover:bg-warning/20 rounded-lg transition-colors text-sm"><Square className="w-4 h-4" />Stop</button><button onClick={(e) => { e.stopPropagation(); stopMutation.mutate(container.id) }} className="flex-1 flex items-center justify-center gap-2 py-2 bg-space-700 text-gray-300 hover:bg-space-600 rounded-lg transition-colors text-sm"><RotateCcw className="w-4 h-4" />Restart</button></> : <button onClick={(e) => { e.stopPropagation(); startMutation.mutate(container.id) }} className="flex-1 flex items-center justify-center gap-2 py-2 bg-accent/10 text-accent hover:bg-accent/20 rounded-lg transition-colors text-sm"><Play className="w-4 h-4" />Start</button>}
              <button onClick={(e) => { e.stopPropagation(); handleViewLogs(container) }} className="p-2 bg-space-700 text-gray-400 hover:text-white rounded-lg transition-colors" title="Logs"><Terminal className="w-4 h-4" /></button>
              <button onClick={(e) => { e.stopPropagation(); if (confirm(`Remove ${container.name}?`)) removeMutation.mutate(container.id) }} className="p-2 bg-error/10 text-error hover:bg-error/20 rounded-lg transition-colors" title="Remove"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div></div>}
      {showLogs && selectedContainer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="w-full max-w-4xl bg-space-800 rounded-xl border border-space-600 overflow-hidden"><div className="flex items-center justify-between p-4 border-b border-space-700"><div className="flex items-center gap-3"><Terminal className="w-5 h-5 text-primary" /><div><h3 className="font-semibold text-white">{selectedContainer.name}</h3><p className="text-xs text-gray-500">Logs</p></div></div><button onClick={() => setShowLogs(false)} className="p-2 text-gray-400 hover:text-white hover:bg-space-700 rounded-lg transition-colors">✕</button></div><div className="p-4 bg-space-900 max-h-96 overflow-y-auto"><pre className="font-mono text-sm text-gray-300 whitespace-pre-wrap">{logs || 'No logs'}</pre></div><div className="p-4 border-t border-space-700"><button onClick={() => setShowLogs(false)} className="btn-secondary">Close</button></div></div>
        </div>
      )}
    </div>
  )
}