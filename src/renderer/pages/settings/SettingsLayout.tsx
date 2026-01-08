import { NavLink, Outlet } from 'react-router-dom';
import { 
  Settings, 
  Key, 
  GitBranch, 
  Layout, 
  Wrench, 
  Palette, 
  Shield, 
  Download,
  Info,
  ChevronLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';

const settingsNavItems = [
  { path: '/settings', label: 'Overview', icon: Settings, end: true },
  { path: '/settings/credentials', label: 'Cloud Credentials', icon: Key },
  { path: '/settings/git', label: 'Git Instances', icon: GitBranch },
  { path: '/settings/pages', label: 'Custom Pages', icon: Layout },
  { path: '/settings/tools', label: 'Tools', icon: Wrench },
  { path: '/settings/appearance', label: 'Appearance', icon: Palette },
  { path: '/settings/security', label: 'Security', icon: Shield },
  { path: '/settings/backup', label: 'Backup', icon: Download },
  { path: '/settings/about', label: 'About', icon: Info },
];

export default function SettingsLayout() {
  return (
    <div className="flex h-full">
      {/* Settings Sidebar */}
      <div className="w-56 border-r border-border bg-card/50 flex flex-col">
        <div className="p-4 border-b border-border">
          <Link 
            to="/" 
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
        
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {settingsNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
