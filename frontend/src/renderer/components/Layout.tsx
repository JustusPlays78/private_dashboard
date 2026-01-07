import { Outlet, Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Rocket, 
  Key, 
  Settings,
  Menu,
  X,
  Lock,
  GitBranch,
  StickyNote,
  Monitor,
  Server,
  Database,
  Cloud,
  Activity,
  BarChart,
  Terminal,
  Shield,
  Globe,
  Zap,
  Cpu,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Plus
} from 'lucide-react'
import { useState, useEffect } from 'react'

interface IFramePage {
  id: string
  name: string
  url: string
  category: string
  icon: string
  position: number
}

const iconMap: Record<string, any> = {
  Monitor, Server, Database, Cloud, Activity, BarChart,
  Terminal, Shield, Lock, Globe, Zap, Cpu, ExternalLink
}

interface LayoutProps {
  onLockRequest?: () => void
}

export default function Layout({ onLockRequest }: LayoutProps) {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [iframePages, setIframePages] = useState<IFramePage[]>([])
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadIFramePages()

    // Listen for iframe updates from settings page
    const handleIframesUpdated = () => {
      loadIFramePages()
    }
    window.addEventListener('iframesUpdated', handleIframesUpdated)
    
    return () => {
      window.removeEventListener('iframesUpdated', handleIframesUpdated)
    }
  }, [])

  const loadIFramePages = async () => {
    try {
      const result = await window.electronAPI.iframes.getAll()
      console.log('Loaded iframe pages:', result)
      if (result.pages) {
        setIframePages(result.pages)
        // Auto-expand all categories initially
        const categories = new Set(result.pages.map((p: IFramePage) => p.category))
        setExpandedCategories(categories)
      }
    } catch (error) {
      console.error('Failed to load iframe pages:', error)
    }
  }

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  // Group iframe pages by category
  const groupedIFramePages = iframePages.reduce((acc, page) => {
    if (!acc[page.category]) acc[page.category] = []
    acc[page.category].push(page)
    return acc
  }, {} as Record<string, IFramePage[]>)

  console.log('Grouped iframe pages:', groupedIFramePages)
  console.log('Number of categories:', Object.keys(groupedIFramePages).length)

  const navigation: Array<{ name: string; href: string; icon: any; disabled?: boolean }> = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Terraform', href: '/terraform', icon: Rocket },
    { name: 'GitLab', href: '/gitlab', icon: GitBranch },
    { name: 'AWS', href: '/aws', icon: Cloud },
    { name: 'Notes', href: '/notes', icon: StickyNote },
    { name: 'Secrets', href: '/secrets', icon: Key },
    { name: 'Settings', href: '/settings', icon: Settings },
  ]

  return (
    <div className="h-screen flex bg-background text-foreground">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-16'
        } bg-card border-r border-border transition-all duration-300 flex flex-col`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          {sidebarOpen && (
            <h1 className="text-xl font-bold text-foreground">
              Dashboard
            </h1>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-accent transition-all hover-lift"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.href
            const isDisabled = item.disabled

            return (
              <Link
                key={item.name}
                to={isDisabled ? '#' : item.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all
                  ${isActive 
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                    : isDisabled
                    ? 'text-muted-foreground cursor-not-allowed opacity-50'
                    : 'text-foreground hover:bg-accent hover:text-accent-foreground hover-lift'
                  }
                  ${!sidebarOpen && 'justify-center'}
                `}
                onClick={(e) => isDisabled && e.preventDefault()}
              >
                <Icon size={20} />
                {sidebarOpen && <span className="font-medium">{item.name}</span>}
                {sidebarOpen && isDisabled && (
                  <span className="ml-auto text-xs bg-muted px-2 py-0.5 rounded">Soon</span>
                )}
              </Link>
            )
          })}

          {/* IFrame Pages by Category */}
          {sidebarOpen && Object.entries(groupedIFramePages).map(([category, pages]) => (
            <div key={category} className="mt-4">
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors"
              >
                {expandedCategories.has(category) ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
                {category}
              </button>
              {expandedCategories.has(category) && (
                <div className="space-y-1 ml-2">
                  {pages.map((page) => {
                    const Icon = iconMap[page.icon] || ExternalLink
                    const isActive = location.pathname === `/iframe/${page.id}`

                    return (
                      <Link
                        key={page.id}
                        to={`/iframe/${page.id}`}
                        className={`
                          flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm
                          ${isActive
                            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                            : 'text-foreground hover:bg-accent hover:text-accent-foreground hover-lift'
                          }
                        `}
                      >
                        <Icon size={18} />
                        <span>{page.name}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          ))}

          {/* Settings Link for IFrame Management */}
          {sidebarOpen && iframePages.length === 0 && (
            <Link
              to="/settings/iframes"
              className="flex items-center gap-2 px-3 py-2 mt-4 text-sm text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
            >
              <Plus size={16} />
              IFrame-Seiten hinzufügen
            </Link>
          )}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-border space-y-2">
          {onLockRequest && (
            <button
              onClick={onLockRequest}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-yellow-500 hover:bg-yellow-500/10 border border-yellow-500/20 hover-lift ${
                !sidebarOpen && 'justify-center'
              }`}
              title="Lock Database"
            >
              <Lock size={20} />
              {sidebarOpen && <span className="font-medium">Lock</span>}
            </button>
          )}
          <div className={`text-xs text-muted-foreground ${!sidebarOpen && 'text-center'}`}>
            {sidebarOpen ? 'v1.0.0' : 'v1'}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
