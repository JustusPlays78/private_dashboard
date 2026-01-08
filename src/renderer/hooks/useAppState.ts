import { useState, useEffect, createContext, useContext } from 'react'

interface ToolStatus {
  checked: boolean
  installed: boolean
  version?: string
  error?: string
}

interface AppState {
  git: ToolStatus
  terraform: ToolStatus
  awsCredentials: {
    checked: boolean
    configured: boolean
    accessKeyId?: string
    secretAccessKey?: string
    sessionToken?: string
    region?: string
  }
  gitlabConfig: {
    checked: boolean
    configured: boolean
    baseUrl?: string
  }
}

const initialState: AppState = {
  git: { checked: false, installed: false },
  terraform: { checked: false, installed: false },
  awsCredentials: { checked: false, configured: false },
  gitlabConfig: { checked: false, configured: false },
}

// Global state singleton
let globalAppState: AppState = { ...initialState }
let listeners: Set<() => void> = new Set()
let initialized = false

function notifyListeners() {
  listeners.forEach(listener => listener())
}

export async function initializeAppState() {
  if (initialized) return globalAppState
  initialized = true

  // Run all checks in parallel for faster startup
  const checks = await Promise.allSettled([
    // Git check
    window.electronAPI.gitlab.checkGit().then(result => {
      globalAppState.git = {
        checked: true,
        installed: result.installed,
      }
    }),

    // Terraform check
    window.electronAPI.terraform.check().then(result => {
      globalAppState.terraform = {
        checked: true,
        installed: result.installed,
        version: result.version,
      }
    }),

    // AWS Credentials check
    window.electronAPI.secrets.getAll().then(result => {
      if (result.success && result.secrets) {
        const awsCreds = result.secrets.find((s: any) =>
          s.id === 'aws-default-credentials' ||
          (s.category === 'AWS' && s.username && s.password)
        )

        if (awsCreds && awsCreds.username && awsCreds.password) {
          globalAppState.awsCredentials = {
            checked: true,
            configured: true,
            accessKeyId: awsCreds.username,
            secretAccessKey: awsCreds.password,
            sessionToken: awsCreds.apiKey || undefined,
            region: awsCreds.url || 'eu-central-1',
          }
        } else {
          globalAppState.awsCredentials = { checked: true, configured: false }
        }
      } else {
        globalAppState.awsCredentials = { checked: true, configured: false }
      }
    }),

    // GitLab config check
    window.electronAPI.gitlab.getConfig().then(result => {
      if (result && result.configured) {
        globalAppState.gitlabConfig = {
          checked: true,
          configured: true,
          baseUrl: result.base_url,
        }
      } else {
        globalAppState.gitlabConfig = { checked: true, configured: false }
      }
    }),
  ])

  // Log any errors
  checks.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(`App state check ${index} failed:`, result.reason)
    }
  })

  notifyListeners()
  return globalAppState
}

export function getAppState(): AppState {
  return globalAppState
}

export function useAppState(): AppState {
  const [, forceUpdate] = useState({})

  useEffect(() => {
    const listener = () => forceUpdate({})
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  return globalAppState
}

// Reset state (for testing or re-initialization)
export function resetAppState() {
  globalAppState = { ...initialState }
  initialized = false
  notifyListeners()
}
