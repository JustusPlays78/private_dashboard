import { useEffect, useCallback, useRef } from 'react'

interface UseSessionOptions {
  onLock?: () => void
  heartbeatInterval?: number // in seconds
  enabled?: boolean // Whether the session tracking is enabled
}

export function useSession(options: UseSessionOptions = {}) {
  const { onLock, heartbeatInterval = 30, enabled = true } = options
  const heartbeatTimerRef = useRef<number | null>(null)
  const lastActivityRef = useRef<number>(Date.now())

  const sendHeartbeat = useCallback(async () => {
    try {
      const result = await window.electronAPI.auth.heartbeat()

      if (!result.success) {
        // Session expired or database locked
        if (onLock) {
          onLock()
        }
      } else if (result.time_until_lock !== undefined) {
        console.log(`Time until lock: ${Math.floor(result.time_until_lock / 60)} minutes`)
      }
    } catch (error) {
      console.error('Heartbeat failed:', error)
    }
  }, [onLock])

  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
  }, [])

  useEffect(() => {
    // Only run if enabled
    if (!enabled) {
      return
    }

    // Track user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    
    events.forEach(event => {
      window.addEventListener(event, updateActivity)
    })

    // Start heartbeat
    heartbeatTimerRef.current = window.setInterval(() => {
      sendHeartbeat()
    }, heartbeatInterval * 1000)

    // Send initial heartbeat
    sendHeartbeat()

    return () => {
      // Cleanup
      events.forEach(event => {
        window.removeEventListener(event, updateActivity)
      })
      
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current)
      }
    }
  }, [sendHeartbeat, updateActivity, heartbeatInterval, enabled])

  const lockManually = useCallback(async () => {
    try {
      await window.electronAPI.auth.lock()
      
      if (onLock) {
        onLock()
      }
    } catch (error) {
      console.error('Manual lock failed:', error)
    }
  }, [onLock])

  return {
    lockManually,
  }
}
