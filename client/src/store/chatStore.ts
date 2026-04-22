import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  model: string
  createdAt: number
  updatedAt: number
}

interface ChatState {
  conversations: Conversation[]
  activeConversationId: string | null
  currentModel: string
  isStreaming: boolean
  systemPrompt: string
  createConversation: (model?: string) => Conversation
  deleteConversation: (id: string) => void
  setActiveConversation: (id: string) => void
  addMessage: (conversationId: string, message: Message) => void
  updateMessage: (conversationId: string, messageId: string, content: string) => void
  setCurrentModel: (model: string) => void
  setSystemPrompt: (prompt: string) => void
  setStreaming: (streaming: boolean) => void
  getActiveConversation: () => Conversation | null
  updateConversationTitle: (id: string, title: string) => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeConversationId: null,
      currentModel: 'llama3',
      isStreaming: false,
      systemPrompt: 'You are NEXUS, an advanced AI assistant. You are helpful, concise, and technically accurate. Format code properly and provide detailed explanations when needed.',
      createConversation: (model?: string) => {
        const id = crypto.randomUUID()
        const now = Date.now()
        const conversation: Conversation = { id, title: 'New Chat', messages: [], model: model || get().currentModel, createdAt: now, updatedAt: now }
        set((state) => ({ conversations: [conversation, ...state.conversations], activeConversationId: id }))
        return conversation
      },
      deleteConversation: (id: string) => {
        set((state) => {
          const newConversations = state.conversations.filter(c => c.id !== id)
          const newActiveId = state.activeConversationId === id ? (newConversations[0]?.id || null) : state.activeConversationId
          return { conversations: newConversations, activeConversationId: newActiveId }
        })
      },
      setActiveConversation: (id: string) => set({ activeConversationId: id }),
      addMessage: (conversationId: string, message: Message) => {
        set((state) => ({ conversations: state.conversations.map(c => c.id === conversationId ? { ...c, messages: [...c.messages, message], updatedAt: Date.now() } : c) }))
      },
      updateMessage: (conversationId: string, messageId: string, content: string) => {
        set((state) => ({ conversations: state.conversations.map(c => c.id === conversationId ? { ...c, messages: c.messages.map(m => m.id === messageId ? { ...m, content } : m), updatedAt: Date.now() } : c) }))
      },
      setCurrentModel: (model: string) => set({ currentModel: model }),
      setSystemPrompt: (prompt: string) => set({ systemPrompt: prompt }),
      setStreaming: (streaming: boolean) => set({ isStreaming: streaming }),
      getActiveConversation: () => {
        const state = get()
        return state.conversations.find(c => c.id === state.activeConversationId) || null
      },
      updateConversationTitle: (id: string, title: string) => {
        set((state) => ({ conversations: state.conversations.map(c => c.id === id ? { ...c, title } : c) }))
      },
    }),
    { name: 'nexus-chat-storage', partialize: (state) => ({ conversations: state.conversations.slice(0, 50), currentModel: state.currentModel, systemPrompt: state.systemPrompt }) }
  )
)