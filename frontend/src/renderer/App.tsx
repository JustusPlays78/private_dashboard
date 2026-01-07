import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { useEffect, useState, useCallback } from 'react'
import Layout from './components/Layout'
import UnlockScreen from './pages/UnlockScreen'
import Dashboard from './pages/Dashboard'
import TerraformDeployer from './pages/TerraformDeployer'
import ProjectDetails from './pages/ProjectDetails'
import GitLabIntegration from './pages/GitLabIntegration'
import Settings from './pages/Settings'
import NotesCanvas from './pages/NotesCanvas'
import IFrameSettings from './pages/IFrameSettings'
import IFrameViewer from './pages/IFrameViewer'
import Secrets from './pages/Secrets'
import AWSResources from './pages/AWSResources'
import { ToastProvider } from './components/ToastProvider'
import CommandPalette from './components/CommandPalette'
import { useSession } from './hooks/useSession'

function AppContent() {
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [isFirstRun, setIsFirstRun] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K to open command palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Handle session timeout - lock the app
  const handleSessionLock = () => {
    setIsUnlocked(false)
  }

  // Session hook - only active when unlocked
  useSession({
    onLock: handleSessionLock,
    heartbeatInterval: 30, // Send heartbeat every 30 seconds
    enabled: isUnlocked, // Only run when unlocked
  })

  const lockManually = async () => {
    try {
      await window.electronAPI.auth.lock()
      setIsUnlocked(false)
    } catch (error) {
      console.error('Manual lock failed:', error)
    }
  }

  useEffect(() => {
    // Check if database is initialized
    checkDatabaseStatus()
    
    // Listen for session lock events from main process
    const cleanup = window.electronAPI.auth.onLocked(() => {
      setIsUnlocked(false)
    })
    
    return cleanup
  }, [])

  const checkDatabaseStatus = async () => {
    try {
      const data = await window.electronAPI.auth.status()
      setIsFirstRun(!data.initialized)
      setIsUnlocked(data.unlocked)
    } catch (error) {
      console.error('Failed to check database status:', error)
      setIsFirstRun(true)
    }
  }

  const handleUnlock = async (password: string) => {
    try {
      const result = isFirstRun 
        ? await window.electronAPI.auth.initialize(password)
        : await window.electronAPI.auth.unlock(password)

      if (result.success) {
        setIsUnlocked(true)
        setIsFirstRun(false)
      } else {
        throw new Error(result.error || 'Authentication failed')
      }
    } catch (error) {
      console.error('Unlock failed:', error)
      throw error
    }
  }

  if (!isUnlocked) {
    return (
      <UnlockScreen 
        isFirstRun={isFirstRun}
        onUnlock={handleUnlock}
      />
    )
  }

  return (
    <Router>
      <CommandPalette 
        isOpen={commandPaletteOpen} 
        onClose={() => setCommandPaletteOpen(false)} 
      />
      <Routes>
        <Route path="/" element={<Layout onLockRequest={lockManually} />}>
          <Route index element={<Dashboard />} />
          <Route path="terraform" element={<TerraformDeployer />} />
          <Route path="terraform/project/:projectId" element={<ProjectDetails />} />
          <Route path="gitlab" element={<GitLabIntegration />} />
          <Route path="notes" element={<NotesCanvas />} />
          <Route path="secrets" element={<Secrets />} />
          <Route path="aws" element={<AWSResources />} />
          <Route path="iframe/:id" element={<IFrameViewer />} />
          <Route path="settings" element={<Settings />} />
          <Route path="settings/iframes" element={<IFrameSettings />} />
        </Route>
      </Routes>
    </Router>
  )
}

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  )
}

export default App
