import { useState, useRef, useEffect } from 'react'
import { useChatStore, Message } from '../store/chatStore'
import { Send, Plus, Trash2, Copy, Check, ChevronDown, RefreshCw } from 'lucide-react'
import clsx from 'clsx'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'


const API_BASE = '/api/ollama'

export default function Chat() {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const [models, setModels] = useState<{ name: string; size: number }[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)


  const { conversations, activeConversationId, currentModel, systemPrompt, isStreaming, createConversation, deleteConversation, setActiveConversation, addMessage, updateMessage, setCurrentModel, setStreaming, getActiveConversation } = useChatStore()
  const activeConversation = getActiveConversation()

  useEffect(() => { fetchModels() }, [])

  const fetchModels = async () => {
    try {
      const res = await fetch(`${API_BASE}/models`)
      const data = await res.json()
      setModels(data)
      if (data.length > 0 && !currentModel) setCurrentModel(data[0].name)
    } catch { console.error('Failed to fetch models') }
  }

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [activeConversation?.messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    let conversationId = activeConversationId
    if (!conversationId) { const conv = createConversation(); conversationId = conv.id }
    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: input.trim(), timestamp: Date.now() }
    addMessage(conversationId!, userMessage)
    setInput('')
    setIsLoading(true)
    setStreaming(true)
    const assistantMessageId = crypto.randomUUID()
    addMessage(conversationId!, { id: assistantMessageId, role: 'assistant', content: '', timestamp: Date.now() })

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: currentModel, messages: [{ role: 'system', content: systemPrompt }, ...(activeConversation?.messages.map(m => ({ role: m.role, content: m.content })) || []), { role: 'user', content: input.trim() }], stream: true })
      })
      if (!response.ok) throw new Error('Request failed')
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullResponse = ''
      while (reader) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(Boolean)
        for (const line of lines) {
          try {
            const data = JSON.parse(line)
            if (data.message?.content) { fullResponse += data.message.content; updateMessage(conversationId!, assistantMessageId, fullResponse) }
          } catch {}
        }
      }
      if (activeConversation && activeConversation.messages.length === 2) {
        const title = input.trim().slice(0, 50) + (input.trim().length > 50 ? '...' : '')
        useChatStore.getState().updateConversationTitle(conversationId!, title)
      }
    } catch { updateMessage(conversationId!, assistantMessageId, '⚠️ Error: Failed to get response. Make sure Ollama is running.') }
    finally { setIsLoading(false); setStreaming(false) }
  }

  const copyToClipboard = (text: string, id: string) => { navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000) }
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }

  return (
    <div className="h-full flex gap-6">
      <div className="w-64 flex-shrink-0 flex flex-col bg-space-800/30 rounded-xl border border-space-700/50 overflow-hidden">
        <div className="p-4 border-b border-space-700/50">
          <button onClick={() => createConversation()} className="w-full flex items-center justify-center gap-2 bg-primary text-space-900 font-semibold py-2.5 rounded-lg hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" />New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 && <div className="text-center text-gray-500 py-8 px-4"><p className="text-sm">No conversations yet</p><p className="text-xs mt-1">Start chatting with your AI</p></div>}
          {conversations.map(conv => (
            <div key={conv.id} className={clsx('group relative p-3 rounded-lg cursor-pointer transition-all', conv.id === activeConversationId ? 'bg-primary/10 border border-primary/30' : 'hover:bg-space-700/50')} onClick={() => setActiveConversation(conv.id)}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className={clsx('text-sm truncate', conv.id === activeConversationId ? 'text-primary font-medium' : 'text-gray-300')}>{conv.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{conv.messages.length} messages</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id) }} className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-error transition-all"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>


      <div className="flex-1 flex flex-col bg-space-800/30 rounded-xl border border-space-700/50 overflow-hidden">
        <div className="p-4 border-b border-space-700/50 flex items-center justify-between">
          <h2 className="font-orbitron font-semibold text-lg text-white">{activeConversation ? activeConversation.title : 'New Chat'}</h2>
          <div className="relative">
            <button onClick={() => setShowModelDropdown(!showModelDropdown)} className="flex items-center gap-2 bg-space-700 px-4 py-2 rounded-lg text-sm text-gray-300 hover:text-white transition-colors">
              <span className="font-medium">{currentModel}</span><ChevronDown className="w-4 h-4" />
            </button>
            {showModelDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-space-800 border border-space-600 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
                {models.map(model => (
                  <button key={model.name} onClick={() => { setCurrentModel(model.name); setShowModelDropdown(false) }} className={clsx('w-full text-left px-4 py-3 text-sm hover:bg-space-700 transition-colors', model.name === currentModel ? 'text-primary bg-primary/10' : 'text-gray-300')}>
                    <div className="font-medium">{model.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{(model.size / 1024 / 1024 / 1024).toFixed(1)} GB</div>
                  </button>
                ))}
                <div className="p-2 border-t border-space-700">
                  <button onClick={fetchModels} className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-white py-2"><RefreshCw className="w-4 h-4" />Refresh</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeConversation?.messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-6 glow-primary"><span className="text-4xl">🤖</span></div>
              <h3 className="text-xl font-semibold text-white mb-2">Welcome to NEXUS</h3>
              <p className="text-gray-400 max-w-md">Your personal AI command center. Select a model and start chatting.</p>
            </div>
          )}
          {activeConversation?.messages.map(message => (
            <div key={message.id} className={clsx('flex gap-4 animate-fade-in-up', message.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
              <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', message.role === 'user' ? 'bg-gradient-to-br from-primary to-secondary' : 'bg-space-700 border border-space-600')}>
                {message.role === 'user' ? <span className="text-white text-sm font-bold">U</span> : <span className="text-primary text-lg">✨</span>}
              </div>
              <div className={clsx('flex-1 max-w-3xl rounded-2xl p-4', message.role === 'user' ? 'bg-primary/10 border border-primary/20' : 'bg-space-800/80 border border-space-700/50')}>
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown components={{ code: ({ className, children, ...props }) => { const match = /language-(\w+)/.exec(className || ''); const isInline = !match; if (isInline) return <code className="bg-space-700 px-1.5 py-0.5 rounded text-primary text-sm" {...props}>{children}</code>; return <div className="relative group"><div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => copyToClipboard(String(children), message.id)} className="p-1.5 bg-space-700 rounded text-gray-400 hover:text-white transition-colors">{copiedId === message.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</button></div><SyntaxHighlighter style={oneDark as any} language={match[1]} PreTag="div" customStyle={{ margin: 0, borderRadius: '8px', fontSize: '13px' }}>{String(children).replace(/\n$/, '')}</SyntaxHighlighter></div> }, p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p> }}>{message.content}</ReactMarkdown>
                </div>
                {isLoading && message.role === 'assistant' && message.content === '' && <div className="flex items-center gap-2 mt-3"><div className="flex gap-1"><span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} /><span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} /><span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} /></div></div>}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-space-700/50">
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Message NEXUS..." className="w-full bg-space-800 border border-space-600 rounded-xl px-4 py-3 pr-12 text-white placeholder:text-gray-500 resize-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all" rows={1} style={{ minHeight: '48px', maxHeight: '200px' }} />
              <button onClick={() => { if (input.trim()) handleSend() }} className={clsx('absolute right-3 bottom-3 p-2 rounded-lg transition-all', input.trim() ? 'bg-primary text-space-900 hover:bg-primary/90' : 'bg-space-700 text-gray-400')}><Send className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 text-xs text-gray-500"><span>Press Enter to send</span><span>{currentModel}</span></div>
        </div>
      </div>
    </div>
  )
}