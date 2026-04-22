import { useEffect, useRef, useState } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { Plus, Copy, Download } from 'lucide-react'
import clsx from 'clsx'

interface TerminalSession { id: string; title: string; active: boolean }

export default function Terminal() {
  const [sessions, setSessions] = useState<TerminalSession[]>([{ id: 'default', title: 'Terminal 1', active: true }])
  const [activeSession, setActiveSession] = useState('default')
  const termRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)

  useEffect(() => {
    if (!termRef.current || xtermRef.current) return
    const term = new XTerm({ cursorBlink: true, fontFamily: 'JetBrains Mono, monospace', fontSize: 14, lineHeight: 1.4, theme: { background: '#0A0F1C', foreground: '#F9FAFB', cursor: '#00D9FF' }, scrollback: 10000 })
    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(termRef.current)
    fitAddon.fit()
    xtermRef.current = term
    fitAddonRef.current = fitAddon
    term.writeln('\x1b[36m[NEXUS Terminal]\x1b[0m Welcome! This connects to your VPS terminal.')
    term.writeln('In production, this establishes a real PTY connection via WebSocket.')
    term.writeln('')
    term.onData((data) => term.write(data))
    const handleResize = () => fitAddon.fit()
    window.addEventListener('resize', handleResize)
    return () => { window.removeEventListener('resize', handleResize); term.dispose() }
  }, [])

  const handleNewTab = () => { const newId = `session-${Date.now()}`; setSessions([...sessions, { id: newId, title: `Terminal ${sessions.length + 1}`, active: false }]); setActiveSession(newId) }
  const handleCloseTab = (id: string) => { if (sessions.length === 1) return; const newSessions = sessions.filter(s => s.id !== id); setSessions(newSessions); if (activeSession === id) setActiveSession(newSessions[0].id) }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 flex items-center justify-between"><div><h1 className="font-orbitron text-2xl font-bold text-white mb-2">Terminal</h1><p className="text-gray-400">Web-based terminal emulator</p></div><div className="flex items-center gap-2"><button className="p-2 bg-space-800 text-gray-400 hover:text-white rounded-lg transition-colors" title="Copy"><Copy className="w-4 h-4" /></button><button className="p-2 bg-space-800 text-gray-400 hover:text-white rounded-lg transition-colors" title="Download"><Download className="w-4 h-4" /></button></div></div>
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 flex items-center gap-1 overflow-x-auto">
          {sessions.map((session) => (<div key={session.id} className={clsx('flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all group', activeSession === session.id ? 'bg-space-700 text-white' : 'bg-space-800/50 text-gray-400 hover:text-white hover:bg-space-700/50')} onClick={() => setActiveSession(session.id)}><span className="text-sm font-medium">{session.title}</span>{sessions.length > 1 && <button onClick={(e) => { e.stopPropagation(); handleCloseTab(session.id) }} className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-space-600 rounded transition-all text-xs">×</button>}</div>))}
        </div>
        <button onClick={handleNewTab} className="p-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors" title="New terminal"><Plus className="w-4 h-4" /></button>
      </div>
      <div className="flex-1 bg-space-800 rounded-xl border border-space-700/50 overflow-hidden p-4 relative">
        <div className="absolute inset-0 pointer-events-none"><div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" /><div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" /></div>
        <div ref={termRef} className="h-full w-full" />
        <div className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-space-900/80 rounded-full text-xs"><div className="w-2 h-2 rounded-full bg-accent animate-pulse" /><span className="text-gray-400">Connected</span></div>
      </div>
      <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2">
        <span className="text-xs text-gray-500 whitespace-nowrap">Quick:</span>
        {['htop', 'ls -la', 'cd /workspace', 'docker ps', 'git status'].map((cmd) => (<button key={cmd} onClick={() => { if (xtermRef.current) xtermRef.current.writeln(cmd) }} className="px-3 py-1.5 bg-space-800 text-gray-400 text-xs font-mono rounded-lg hover:text-white hover:bg-space-700 transition-colors whitespace-nowrap">{cmd}</button>))}
      </div>
    </div>
  )
}