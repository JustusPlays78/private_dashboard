import { Link } from 'react-router-dom';
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
  ChevronRight,
  Cloud,
  Monitor,
  Lock,
  FileArchive,
  Sparkles
} from 'lucide-react';

const settingsCards = [
  {
    path: '/settings/credentials',
    title: 'Cloud Credentials',
    description: 'AWS, Azure und andere Cloud-Zugangsdaten verwalten',
    icon: Key,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
  },
  {
    path: '/settings/git',
    title: 'Git Instances',
    description: 'GitLab und GitHub Server konfigurieren',
    icon: GitBranch,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
  },
  {
    path: '/settings/pages',
    title: 'Custom Pages',
    description: 'IFrame-Seiten für externe Dienste hinzufügen',
    icon: Layout,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
  },
  {
    path: '/settings/tools',
    title: 'Tools',
    description: 'Portable Tools wie Git und Terraform verwalten',
    icon: Wrench,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
  },
  {
    path: '/settings/appearance',
    title: 'Appearance',
    description: 'Theme, Sprache und UI-Einstellungen',
    icon: Palette,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
  },
  {
    path: '/settings/security',
    title: 'Security',
    description: 'Master-Passwort und Session-Einstellungen',
    icon: Shield,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
  },
  {
    path: '/settings/backup',
    title: 'Backup',
    description: 'Einstellungen exportieren und importieren',
    icon: Download,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
  },
  {
    path: '/settings/about',
    title: 'About',
    description: 'Version, Changelog und Lizenzinformationen',
    icon: Info,
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/10',
  },
];

export default function SettingsOverview() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <Settings className="w-7 h-7 text-primary" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Konfiguriere dein Dashboard nach deinen Wünschen
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {settingsCards.map((card) => (
          <Link
            key={card.path}
            to={card.path}
            className="group bg-card border border-border rounded-xl p-5 hover:border-primary/50 hover:shadow-lg transition-all"
          >
            <div className="flex items-start justify-between">
              <div className={`p-3 rounded-xl ${card.bgColor}`}>
                <card.icon className={`w-6 h-6 ${card.color}`} />
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="font-semibold text-foreground mt-4">{card.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{card.description}</p>
          </Link>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="mt-8 p-4 bg-card border border-border rounded-xl">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Quick Info</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-amber-400" />
            <span className="text-muted-foreground">Cloud Credentials:</span>
            <span className="text-foreground font-medium">Configured</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-green-400" />
            <span className="text-muted-foreground">Encryption:</span>
            <span className="text-foreground font-medium">Active</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-muted-foreground">Theme:</span>
            <span className="text-foreground font-medium">Dark</span>
          </div>
        </div>
      </div>
    </div>
  );
}
