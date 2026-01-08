import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  LayoutDashboard,
  Rocket,
  Key,
  Settings,
  GitBranch,
  StickyNote,
  Cloud,
  Plus,
  Database,
  Shield,
  FileText,
  ExternalLink,
  Clock,
  Star,
  FolderGit
} from 'lucide-react'

interface CommandItem {
  id: string
  title: string
  subtitle?: string
  icon: any
  action: () => void
  category: 'navigation' | 'secrets' | 'actions' | 'recent' | 'projects'
  keywords?: string[]
  usageCount?: number
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [secrets, setSecrets] = useState<any[]>([])
  const [clonedProjects, setClonedProjects] = useState<any[]>([])
  const [recentCommands, setRecentCommands] = useState<string[]>([])

  // Load secrets and projects for quick access
  useEffect(() => {
    if (isOpen) {
      loadSecrets()
      loadClonedProjects()
      loadRecentCommands()
    }
  }, [isOpen])

  const loadSecrets = async () => {
    try {
      const result = await window.electronAPI.secrets.getAll()
      if (result.success && result.secrets) {
        setSecrets(result.secrets)
      }
    } catch (error) {
      console.error('Failed to load secrets:', error)
    }
  }

  const loadClonedProjects = async () => {
    try {
      const result = await window.electronAPI.gitlab.getClonedProjects()
      if (result.success && result.projects) {
        setClonedProjects(result.projects)
      }
    } catch (error) {
      console.error('Failed to load cloned projects:', error)
    }
  }

  const loadRecentCommands = () => {
    try {
      const recent = localStorage.getItem('commandPaletteRecent')
      if (recent) {
        setRecentCommands(JSON.parse(recent))
      }
    } catch (e) {
      console.error('Failed to load recent commands:', e)
    }
  }

  const saveRecentCommand = (commandId: string) => {
    const updated = [commandId, ...recentCommands.filter(id => id !== commandId)].slice(0, 5)
    setRecentCommands(updated)
    localStorage.setItem('commandPaletteRecent', JSON.stringify(updated))
  }

  const executeCommand = (command: CommandItem) => {
    saveRecentCommand(command.id)
    command.action()
    onClose()
  }

  // Build command list
  const commands = useMemo((): CommandItem[] => {
    const baseCommands: CommandItem[] = [
      {
        id: 'nav-dashboard',
        title: 'Dashboard',
        subtitle: 'Go to dashboard overview',
        icon: LayoutDashboard,
        action: () => navigate('/'),
        category: 'navigation',
        keywords: ['home', 'main', 'overview']
      },
      {
        id: 'nav-terraform',
        title: 'Terraform',
        subtitle: 'Manage deployments',
        icon: Rocket,
        action: () => navigate('/terraform'),
        category: 'navigation',
        keywords: ['deploy', 'infrastructure', 'aws']
      },
      {
        id: 'nav-gitlab',
        title: 'GitLab',
        subtitle: 'Git integration',
        icon: GitBranch,
        action: () => navigate('/gitlab'),
        category: 'navigation',
        keywords: ['git', 'repository', 'clone']
      },
      {
        id: 'nav-aws',
        title: 'AWS Resources',
        subtitle: 'View cloud resources',
        icon: Cloud,
        action: () => navigate('/aws'),
        category: 'navigation',
        keywords: ['ec2', 's3', 'lambda', 'rds', 'cloud']
      },
      {
        id: 'nav-notes',
        title: 'Notes',
        subtitle: 'Open notes canvas',
        icon: StickyNote,
        action: () => navigate('/notes'),
        category: 'navigation',
        keywords: ['write', 'text', 'markdown']
      },
      {
        id: 'nav-secrets',
        title: 'Secrets Manager',
        subtitle: 'Manage credentials',
        icon: Key,
        action: () => navigate('/secrets'),
        category: 'navigation',
        keywords: ['password', 'api', 'credentials', 'token']
      },
      {
        id: 'nav-settings',
        title: 'Settings',
        subtitle: 'Application settings',
        icon: Settings,
        action: () => navigate('/settings'),
        category: 'navigation',
        keywords: ['config', 'preferences', 'options']
      },
      {
        id: 'action-new-secret',
        title: 'Create New Secret',
        subtitle: 'Add a new credential',
        icon: Plus,
        action: () => {
          navigate('/secrets')
          // Small delay to allow navigation, then trigger create
          setTimeout(() => {
            const event = new CustomEvent('createNewSecret')
            window.dispatchEvent(event)
          }, 100)
        },
        category: 'actions',
        keywords: ['add', 'password', 'new']
      },
    ]

    // Add secrets as searchable items
    const secretCommands: CommandItem[] = secrets.map(secret => ({
      id: `secret-${secret.id}`,
      title: secret.name,
      subtitle: `${secret.category} • Secret`,
      icon: Shield,
      action: () => {
        navigate('/secrets')
        setTimeout(() => {
          const event = new CustomEvent('selectSecret', { detail: secret.id })
          window.dispatchEvent(event)
        }, 100)
      },
      category: 'secrets',
      keywords: [secret.category.toLowerCase(), 'credential', 'password', 'key']
    }))

    // Add cloned projects as searchable items
    const projectCommands: CommandItem[] = clonedProjects.map(project => ({
      id: `project-${project.ProjectID}`,
      title: project.Name,
      subtitle: `Terraform Project • ${project.DefaultBranch || 'main'}`,
      icon: FolderGit,
      action: () => {
        navigate(`/terraform/${project.ProjectID}`)
      },
      category: 'projects',
      keywords: ['terraform', 'project', 'deploy', 'infrastructure', project.Name.toLowerCase()]
    }))

    // Add recent commands to top
    const allCommands = [...baseCommands, ...secretCommands, ...projectCommands]
    
    // Sort by recent usage
    const sortedCommands = allCommands.sort((a, b) => {
      const aRecent = recentCommands.indexOf(a.id)
      const bRecent = recentCommands.indexOf(b.id)
      if (aRecent >= 0 && bRecent >= 0) return aRecent - bRecent
      if (aRecent >= 0) return -1
      if (bRecent >= 0) return 1
      return 0
    })

    return sortedCommands
  }, [secrets, clonedProjects, recentCommands, navigate])

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      // Show recent and navigation when no query
      return commands.filter(c => 
        c.category === 'navigation' || 
        recentCommands.includes(c.id)
      ).slice(0, 10)
    }

    const lowerQuery = query.toLowerCase()
    return commands.filter(cmd => {
      const searchText = [
        cmd.title,
        cmd.subtitle,
        ...(cmd.keywords || [])
      ].join(' ').toLowerCase()
      return searchText.includes(lowerQuery)
    })
  }, [commands, query, recentCommands])

  // Reset selection when filtered results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [filteredCommands.length])

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (filteredCommands[selectedIndex]) {
          executeCommand(filteredCommands[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        onClose()
        break
    }
  }, [isOpen, filteredCommands, selectedIndex, onClose])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Command Palette */}
      <div className="relative w-full max-w-xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 border-b border-border">
          <Search className="w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands, pages, secrets..."
            className="flex-1 py-4 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
            autoFocus
          />
          <kbd className="px-2 py-1 text-xs bg-accent rounded text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No results found for "{query}"
            </div>
          ) : (
            <div className="p-2">
              {filteredCommands.map((command, index) => {
                const Icon = command.icon
                const isRecent = recentCommands.includes(command.id)
                
                return (
                  <button
                    key={command.id}
                    onClick={() => executeCommand(command)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      index === selectedIndex 
                        ? 'bg-primary/10 text-primary' 
                        : 'text-foreground hover:bg-accent'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${
                      index === selectedIndex ? 'bg-primary/20' : 'bg-accent'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{command.title}</span>
                        {isRecent && (
                          <Clock className="w-3 h-3 text-muted-foreground" />
                        )}
                      </div>
                      {command.subtitle && (
                        <p className="text-sm text-muted-foreground truncate">
                          {command.subtitle}
                        </p>
                      )}
                    </div>
                    {index === selectedIndex && (
                      <kbd className="px-2 py-1 text-xs bg-accent rounded text-muted-foreground">
                        ↵
                      </kbd>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border bg-accent/50 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-accent rounded">↑</kbd>
            <kbd className="px-1.5 py-0.5 bg-accent rounded">↓</kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-accent rounded">↵</kbd>
            Select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-accent rounded">Esc</kbd>
            Close
          </span>
        </div>
      </div>
    </div>
  )
}
