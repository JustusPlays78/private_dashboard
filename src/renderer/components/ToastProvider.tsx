import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { CheckCircle, XCircle, AlertCircle, Info, X, Loader2, ChevronDown, ChevronUp, Download } from 'lucide-react'

interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
}

interface ProgressToast {
  id: string
  title: string
  status: 'downloading' | 'extracting' | 'complete' | 'error'
  progress?: number
  details?: string
  error?: string
}

interface ToastContextType {
  showToast: (type: Toast['type'], title: string, message?: string) => void
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
  // Progress toast methods
  showProgress: (id: string, title: string) => void
  updateProgress: (id: string, status: ProgressToast['status'], progress?: number, details?: string) => void
  completeProgress: (id: string, success: boolean, message?: string) => void
  removeProgress: (id: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [progressToasts, setProgressToasts] = useState<ProgressToast[]>([])
  const [expandedProgress, setExpandedProgress] = useState<Set<string>>(new Set())

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const showToast = useCallback((type: Toast['type'], title: string, message?: string) => {
    const id = Math.random().toString(36).substring(2, 9)
    const toast: Toast = { id, type, title, message }
    
    setToasts(prev => [...prev, toast])
    
    // Auto-remove after 4 seconds
    setTimeout(() => removeToast(id), 4000)
  }, [removeToast])

  // Progress toast methods
  const showProgress = useCallback((id: string, title: string) => {
    setProgressToasts(prev => {
      // Remove existing with same id
      const filtered = prev.filter(p => p.id !== id)
      return [...filtered, { id, title, status: 'downloading', progress: 0 }]
    })
  }, [])

  const updateProgress = useCallback((id: string, status: ProgressToast['status'], progress?: number, details?: string) => {
    setProgressToasts(prev => prev.map(p => 
      p.id === id ? { ...p, status, progress: progress ?? p.progress, details: details ?? p.details } : p
    ))
  }, [])

  const completeProgress = useCallback((id: string, success: boolean, message?: string) => {
    setProgressToasts(prev => prev.map(p => 
      p.id === id ? { ...p, status: success ? 'complete' : 'error', error: success ? undefined : message, details: success ? message : p.details } : p
    ))
    // Auto-remove successful ones after 3 seconds
    if (success) {
      setTimeout(() => {
        setProgressToasts(prev => prev.filter(p => p.id !== id))
        setExpandedProgress(prev => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }, 3000)
    }
  }, [])

  const removeProgress = useCallback((id: string) => {
    setProgressToasts(prev => prev.filter(p => p.id !== id))
    setExpandedProgress(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const toggleExpanded = (id: string) => {
    setExpandedProgress(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const success = useCallback((title: string, message?: string) => showToast('success', title, message), [showToast])
  const error = useCallback((title: string, message?: string) => showToast('error', title, message), [showToast])
  const warning = useCallback((title: string, message?: string) => showToast('warning', title, message), [showToast])
  const info = useCallback((title: string, message?: string) => showToast('info', title, message), [showToast])

  const getIcon = (type: Toast['type']) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-400" />
      case 'error': return <XCircle className="w-5 h-5 text-red-400" />
      case 'warning': return <AlertCircle className="w-5 h-5 text-yellow-400" />
      case 'info': return <Info className="w-5 h-5 text-blue-400" />
    }
  }

  const getBorderColor = (type: Toast['type']) => {
    switch (type) {
      case 'success': return 'border-green-500/30'
      case 'error': return 'border-red-500/30'
      case 'warning': return 'border-yellow-500/30'
      case 'info': return 'border-blue-500/30'
    }
  }

  const getProgressIcon = (status: ProgressToast['status']) => {
    switch (status) {
      case 'downloading': return <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
      case 'extracting': return <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
      case 'complete': return <CheckCircle className="w-5 h-5 text-green-400" />
      case 'error': return <XCircle className="w-5 h-5 text-red-400" />
    }
  }

  const getProgressBorderColor = (status: ProgressToast['status']) => {
    switch (status) {
      case 'downloading': return 'border-blue-500/30'
      case 'extracting': return 'border-amber-500/30'
      case 'complete': return 'border-green-500/30'
      case 'error': return 'border-red-500/30'
    }
  }

  const getStatusText = (status: ProgressToast['status']) => {
    switch (status) {
      case 'downloading': return 'Downloading...'
      case 'extracting': return 'Extracting...'
      case 'complete': return 'Complete!'
      case 'error': return 'Failed'
    }
  }

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info, showProgress, updateProgress, completeProgress, removeProgress }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {/* Progress Toasts */}
        {progressToasts.map(pToast => {
          const isExpanded = expandedProgress.has(pToast.id)
          return (
            <div
              key={pToast.id}
              className={`pointer-events-auto bg-card border ${getProgressBorderColor(pToast.status)} rounded-lg shadow-lg min-w-[320px] max-w-md animate-in slide-in-from-right-5 fade-in duration-200 overflow-hidden`}
            >
              {/* Header - always visible */}
              <div 
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => toggleExpanded(pToast.id)}
              >
                {getProgressIcon(pToast.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-muted-foreground" />
                    <p className="font-medium text-foreground">{pToast.title}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{getStatusText(pToast.status)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {pToast.status !== 'complete' && pToast.status !== 'error' && (
                    <span className="text-sm text-muted-foreground">{pToast.progress || 0}%</span>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Progress bar */}
              {(pToast.status === 'downloading' || pToast.status === 'extracting') && (
                <div className="h-1 bg-muted">
                  <div 
                    className={`h-full transition-all duration-300 ${pToast.status === 'downloading' ? 'bg-blue-500' : 'bg-amber-500'}`}
                    style={{ width: `${pToast.progress || 0}%` }}
                  />
                </div>
              )}

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-border/50">
                  {pToast.details && (
                    <p className="text-sm text-muted-foreground font-mono bg-muted/50 rounded p-2 mb-2">
                      {pToast.details}
                    </p>
                  )}
                  {pToast.error && (
                    <p className="text-sm text-red-400 bg-red-500/10 rounded p-2 mb-2">
                      {pToast.error}
                    </p>
                  )}
                  {(pToast.status === 'error') && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeProgress(pToast.id); }}
                      className="text-sm text-muted-foreground hover:text-foreground underline"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* Regular Toasts */}
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto bg-card border ${getBorderColor(toast.type)} rounded-lg shadow-lg p-4 min-w-[300px] max-w-md animate-in slide-in-from-right-5 fade-in duration-200`}
          >
            <div className="flex items-start gap-3">
              {getIcon(toast.type)}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">{toast.title}</p>
                {toast.message && (
                  <p className="text-sm text-muted-foreground mt-0.5">{toast.message}</p>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
