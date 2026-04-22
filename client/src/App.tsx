import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useSocketStore } from './store/socketStore'
import Layout from './components/Layout'
import Chat from './pages/Chat'
import Dashboard from './pages/Dashboard'
import Docker from './pages/Docker'
import Terminal from './pages/Terminal'
import Files from './pages/Files'
import Settings from './pages/Settings'

function App() {
  const connect = useSocketStore(state => state.connect)
  useEffect(() => { connect() }, [connect])

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/chat" replace />} />
        <Route path="chat" element={<Chat />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="docker" element={<Docker />} />
        <Route path="terminal" element={<Terminal />} />
        <Route path="files" element={<Files />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
export default App