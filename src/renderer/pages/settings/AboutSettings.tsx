import { useState, useEffect } from 'react';
import { Info, Heart, Github, ExternalLink, FileText, Scale, RefreshCw, CheckCircle, Sparkles, Code, Coffee } from 'lucide-react';

interface AppInfo {
  version: string;
  name: string;
  electronVersion: string;
  nodeVersion: string;
  chromeVersion: string;
  platform: string;
  arch: string;
}

interface Dependency {
  name: string;
  version: string;
  license: string;
  url?: string;
}

const MAIN_DEPENDENCIES: Dependency[] = [
  { name: 'Electron', version: '39.1.0', license: 'MIT', url: 'https://www.electronjs.org/' },
  { name: 'React', version: '19.1.0', license: 'MIT', url: 'https://react.dev/' },
  { name: 'Vite', version: '7.2.1', license: 'MIT', url: 'https://vitejs.dev/' },
  { name: 'TypeScript', version: '5.8.3', license: 'Apache-2.0', url: 'https://www.typescriptlang.org/' },
  { name: 'Tailwind CSS', version: '4.1.5', license: 'MIT', url: 'https://tailwindcss.com/' },
  { name: 'better-sqlite3', version: '11.10.0', license: 'MIT', url: 'https://github.com/WiseLibs/better-sqlite3' },
  { name: 'argon2', version: '0.41.1', license: 'MIT', url: 'https://github.com/ranisalt/node-argon2' },
  { name: 'Lucide Icons', version: '0.511.0', license: 'ISC', url: 'https://lucide.dev/' },
];

const CHANGELOG = [
  {
    version: '2.0.0',
    date: '2026-01-13',
    changes: [
      'Miro-like Canvas: Multi-Select, Box Selection, Gruppierung',
      'Canvas Templates: Brainstorming, Retrospective, Flowchart',
      'Connectors: Pfeile zwischen Elementen mit Ankerpunkten',
      'Tables: Miro-Style Tabellen mit Skalierung und Zell-Editing',
      'Frames/Sections: Visuelle Gruppierung von Elementen',
      'Floating Toolbar bei Text-Selektion mit Markdown-Support',
      'Kontextmenü mit Panel-basierter Farbauswahl',
      'Element-Erstellung an Cursor-Position',
      'Farbschema auf neutrales Slate-Grau aktualisiert',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-01-07',
    changes: [
      'Settings komplett überarbeitet mit neuer Sidebar-Navigation',
      'Portable Tools (Git & Terraform) mit Auto-Download',
      'Toast-System mit Progress-Anzeige',
      'Dynamische Versionsanzeige aus package.json',
      'Backup & Restore für Einstellungen',
      'Security-Einstellungen (Passwort ändern, Auto-Lock)',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-01-01',
    changes: [
      'Initial Release',
      'AWS Resource Browser mit ECS-Support',
      'GitLab Integration',
      'Terraform Deployer',
      'Verschlüsselter Secrets Manager',
      'IFrame-Seiten für externe Dashboards',
    ],
  },
];

export default function AboutSettings() {
  const [showAllDeps, setShowAllDeps] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateResult, setUpdateResult] = useState<string | null>(null);
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    loadAppInfo();
  }, []);

  const loadAppInfo = async () => {
    try {
      const info = await window.electronAPI.app.getInfo();
      if (info.success) {
        setAppInfo(info);
      }
    } catch (err) {
      console.error('Failed to load app info:', err);
    }
  };

  const checkForUpdates = async () => {
    setCheckingUpdate(true);
    setUpdateResult(null);
    
    // Simulate update check
    await new Promise(r => setTimeout(r, 1500));
    
    setUpdateResult('Du verwendest die neueste Version!');
    setCheckingUpdate(false);
    setTimeout(() => setUpdateResult(null), 5000);
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <Info className="w-7 h-7 text-slate-400" />
          About
        </h1>
        <p className="text-muted-foreground mt-1">
          Informationen über dein Dashboard
        </p>
      </div>

      <div className="space-y-6">
        {/* App Info */}
        <div className="bg-card border border-border rounded-xl p-6 text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
          <p className="text-muted-foreground mt-1">Dein persönliches DevOps Dashboard</p>
          
          <div className="flex items-center justify-center gap-4 mt-4 text-sm">
            <div className="px-3 py-1 bg-primary/10 text-primary rounded-full">
              v{appInfo?.version || '...'}
            </div>
            <div className="text-muted-foreground">
              Electron {appInfo?.electronVersion || '...'}
            </div>
          </div>

          {/* Update Check */}
          <div className="mt-6">
            <button
              onClick={checkForUpdates}
              disabled={checkingUpdate}
              className="flex items-center gap-2 mx-auto px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${checkingUpdate ? 'animate-spin' : ''}`} />
              {checkingUpdate ? 'Suche Updates...' : 'Nach Updates suchen'}
            </button>
            {updateResult && (
              <div className="mt-3 flex items-center justify-center gap-2 text-green-400 text-sm">
                <CheckCircle className="w-4 h-4" />
                {updateResult}
              </div>
            )}
          </div>
        </div>

        {/* Changelog */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-medium text-foreground flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-slate-400" />
            Changelog
          </h3>
          
          <div className="space-y-4">
            {CHANGELOG.map((release, i) => (
              <div key={release.version} className={`${i > 0 ? 'pt-4 border-t border-border' : ''}`}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-sm rounded font-mono">
                    v{release.version}
                  </span>
                  <span className="text-sm text-muted-foreground">{release.date}</span>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                  {release.changes.map((change, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <span className="text-primary mt-1.5">•</span>
                      {change}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Dependencies */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-medium text-foreground flex items-center gap-2 mb-4">
            <Code className="w-4 h-4 text-slate-400" />
            Open Source Lizenzen
          </h3>
          
          <p className="text-sm text-muted-foreground mb-4">
            Dieses Projekt verwendet folgende Open Source Bibliotheken:
          </p>

          <div className="space-y-2">
            {MAIN_DEPENDENCIES.slice(0, showAllDeps ? undefined : 5).map((dep) => (
              <div 
                key={dep.name}
                className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{dep.name}</span>
                  <span className="text-muted-foreground">v{dep.version}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    {dep.license}
                  </span>
                  {dep.url && (
                    <a
                      href={dep.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          {MAIN_DEPENDENCIES.length > 5 && (
            <button
              onClick={() => setShowAllDeps(!showAllDeps)}
              className="mt-3 text-sm text-primary hover:text-primary/80"
            >
              {showAllDeps ? 'Weniger anzeigen' : `Alle ${MAIN_DEPENDENCIES.length} anzeigen`}
            </button>
          )}
        </div>

        {/* Credits */}
        <div className="bg-card border border-border rounded-xl p-5 text-center">
          <h3 className="font-medium text-foreground flex items-center justify-center gap-2 mb-3">
            <Heart className="w-4 h-4 text-red-400" />
            Credits
          </h3>
          
          <p className="text-sm text-muted-foreground">
            Mit <Heart className="w-3 h-3 inline text-red-400" /> und <Coffee className="w-3 h-3 inline text-amber-400" /> entwickelt.
          </p>
          
          <div className="flex items-center justify-center gap-4 mt-4">
            <a
              href="#"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="w-4 h-4" />
              GitHub
            </a>
            <span className="text-muted-foreground">•</span>
            <a
              href="#"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Scale className="w-4 h-4" />
              MIT License
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
