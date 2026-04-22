import { create } from 'zustand'
import { io, Socket } from 'socket.io-client'

interface SocketState {
  socket: Socket | null
  connected: boolean
  connect: () => void
  disconnect: () => void
}

export const useSocketStore = create<SocketState>((set) => ({
  socket: null,
  connected: false,
  connect: () => {
    const socket = io('/', {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })
    socket.on('connect', () => { set({ connected: true, socket }); console.log('Socket connected') })
    socket.on('disconnect', () => { set({ connected: false }); console.log('Socket disconnected') })
    socket.on('connect_error', (error) => console.error('Socket connection error:', error))
    set({ socket })
  },
  disconnect: () => {
    const { socket } = useSocketStore.getState()
    if (socket) { socket.disconnect(); set({ socket: null, connected: false }) }
  },
}))