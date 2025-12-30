import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Layout from './components/Layout'
import UnlockScreen from './pages/UnlockScreen'
import Dashboard from './pages/Dashboard'
import TerraformDeployer from './pages/TerraformDeployer'
import ProjectDetails from './pages/ProjectDetails'
import GitLabIntegration from './pages/GitLabIntegration'
import Settings from './pages/Settings'
import NotesCanvas from './pages/NotesCanvas'
import ZabbixViewer from './pages/ZabbixViewer'
import IFrameSettings from './pages/IFrameSettings'
import IFrameViewer from './pages/IFrameViewer'
import { useSession } from './hooks/useSession'

function App() {
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [isFirstRun, setIsFirstRun] = useState(false)

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
      await fetch('http://localhost:8080/api/auth/lock', {
        method: 'POST',
      })
      setIsUnlocked(false)
    } catch (error) {
      console.error('Manual lock failed:', error)
    }
  }

  useEffect(() => {
    // Check if database is initialized
    checkDatabaseStatus()
  }, [])

  const checkDatabaseStatus = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/auth/status')
      const data = await response.json()
      
      setIsFirstRun(!data.initialized)
      setIsUnlocked(data.unlocked)
    } catch (error) {
      console.error('Failed to check database status:', error)
      setIsFirstRun(true)
    }
  }

  const handleUnlock = async (password: string) => {
    try {
      const endpoint = isFirstRun ? '/api/auth/initialize' : '/api/auth/unlock'
      
      const response = await fetch(`http://localhost:8080${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      })

      if (response.ok) {
        setIsUnlocked(true)
        setIsFirstRun(false)
      } else {
        const error = await response.json()
        throw new Error(error.message || 'Authentication failed')
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
      <Routes>
        <Route path="/" element={<Layout onLockRequest={lockManually} />}>
          <Route index element={<Dashboard />} />
          <Route path="terraform" element={<TerraformDeployer />} />
          <Route path="terraform/project/:projectId" element={<ProjectDetails />} />
          <Route path="gitlab" element={<GitLabIntegration />} />
          <Route path="notes" element={<NotesCanvas />} />
          <Route path="zabbix" element={<ZabbixViewer />} />
          <Route path="iframe/:id" element={<IFrameViewer />} />
          <Route path="settings" element={<Settings />} />
          <Route path="settings/iframes" element={<IFrameSettings />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
