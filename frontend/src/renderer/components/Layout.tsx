import { Outlet, Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Rocket, 
  Key, 
  Settings,
  Menu,
  X,
  Lock,
  GitBranch
} from 'lucide-react'
import { useState } from 'react'

interface LayoutProps {
  onLockRequest?: () => void
}

export default function Layout({ onLockRequest }: LayoutProps) {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Terraform', href: '/terraform', icon: Rocket },
    { name: 'GitLab', href: '/gitlab', icon: GitBranch },
    { name: 'Secrets', href: '/secrets', icon: Key, disabled: true },
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
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
              TerraForm
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
        <nav className="flex-1 p-3 space-y-1">
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
