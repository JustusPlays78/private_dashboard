import { useState } from 'react';
import { Download, Upload, FileArchive, CheckCircle, AlertCircle, Database, Calendar, HardDrive } from 'lucide-react';

interface Secret {
  id: string;
  name: string;
  category: string;
  username: string | null;
  password: string | null;
  apiKey: string | null;
  url: string | null;
}

export default function BackupSettings() {
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    setError('');
    setSuccess('');

    try {
      const secretsResult = await window.electronAPI.secrets.getAll();
      const iframesResult = await window.electronAPI.iframes.getAll();
      
      // Get appearance and security settings from localStorage
      const appearanceSettings = localStorage.getItem('appearance-settings');
      const securitySettings = localStorage.getItem('security-settings');

      const exportData = {
        version: 2,
        exportedAt: new Date().toISOString(),
        application: 'Dashboard',
        settings: {
          appearance: appearanceSettings ? JSON.parse(appearanceSettings) : null,
          security: securitySettings ? JSON.parse(securitySettings) : null,
        },
        gitlabInstances: (secretsResult.secrets || [])
          .filter((s: Secret) => s.category === 'GitLab')
          .map((s: Secret) => ({
            name: s.name,
            url: s.url,
            // Tokens werden nicht exportiert!
          })),
        iframePages: iframesResult.pages || [],
        secrets: (secretsResult.secrets || []).map((s: Secret) => ({
          name: s.name,
          category: s.category,
          url: s.url,
          hasUsername: !!s.username,
          hasPassword: !!s.password,
          hasApiKey: !!s.apiKey,
          // Passwörter werden nicht exportiert!
        })),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dashboard-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess('Backup erfolgreich erstellt!');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError('Export fehlgeschlagen: ' + err.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsImporting(true);
      setError('');
      setSuccess('');

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!data.version) {
          throw new Error('Ungültiges Backup-Format');
        }

        let imported = 0;

        // Import iframe pages
        if (data.iframePages && Array.isArray(data.iframePages)) {
          for (const page of data.iframePages) {
            if (!page.name || !page.url) continue;
            try {
              await window.electronAPI.iframes.create({
                name: page.name,
                url: page.url,
                category: page.category || 'General',
                icon: page.icon || 'Monitor',
                position: page.position || 0,
              });
              imported++;
            } catch {
              // Page may already exist, ignore
            }
          }
        }

        // Import settings
        if (data.settings?.appearance) {
          localStorage.setItem('appearance-settings', JSON.stringify(data.settings.appearance));
        }
        if (data.settings?.security) {
          localStorage.setItem('security-settings', JSON.stringify(data.settings.security));
        }

        setSuccess(`Backup importiert! ${imported} IFrame-Seiten wiederhergestellt.`);
        setTimeout(() => setSuccess(''), 5000);

        // Reload sidebar
        window.dispatchEvent(new Event('iframesUpdated'));
      } catch (err: any) {
        setError('Import fehlgeschlagen: ' + err.message);
        setTimeout(() => setError(''), 5000);
      } finally {
        setIsImporting(false);
      }
    };
    input.click();
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <Download className="w-7 h-7 text-cyan-400" />
          Backup
        </h1>
        <p className="text-muted-foreground mt-1">
          Exportiere und importiere deine Einstellungen und Konfigurationen
        </p>
      </div>

      {/* Messages */}
      {success && (
        <div className="mb-4 bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-green-400 text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Export Section */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-medium text-foreground flex items-center gap-2 mb-4">
            <Upload className="w-4 h-4 text-cyan-400" />
            Einstellungen exportieren
          </h3>
          
          <p className="text-sm text-muted-foreground mb-4">
            Erstelle ein Backup deiner Einstellungen, IFrame-Seiten und Konfigurationen.
          </p>

          <div className="bg-muted/50 border border-border rounded-lg p-4 mb-4">
            <h4 className="text-sm font-medium text-foreground mb-2">Enthalten im Export:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-green-400" />
                IFrame-Seiten (Namen, URLs, Kategorien)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-green-400" />
                GitLab-Instanzen (ohne Tokens)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-green-400" />
                Appearance-Einstellungen
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-green-400" />
                Security-Einstellungen
              </li>
            </ul>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4">
            <p className="text-sm text-amber-400">
              ⚠️ <strong>Sicherheitshinweis:</strong> Passwörter, API-Tokens und Secrets werden aus Sicherheitsgründen 
              <strong> nicht</strong> exportiert.
            </p>
          </div>

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            <Download className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
            {isExporting ? 'Exportiere...' : 'Backup erstellen'}
          </button>
        </div>

        {/* Import Section */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-medium text-foreground flex items-center gap-2 mb-4">
            <Download className="w-4 h-4 text-cyan-400" />
            Einstellungen importieren
          </h3>
          
          <p className="text-sm text-muted-foreground mb-4">
            Stelle ein vorheriges Backup wieder her. Bestehende Einstellungen werden überschrieben.
          </p>

          <button
            onClick={handleImport}
            disabled={isImporting}
            className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 border border-border text-foreground rounded-lg transition-colors"
          >
            <Upload className={`w-4 h-4 ${isImporting ? 'animate-spin' : ''}`} />
            {isImporting ? 'Importiere...' : 'Backup importieren'}
          </button>
        </div>

        {/* Database Info */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-medium text-foreground flex items-center gap-2 mb-4">
            <Database className="w-4 h-4 text-cyan-400" />
            Datenbank-Information
          </h3>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <HardDrive className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-muted-foreground">Speicherort</div>
                <div className="text-foreground font-mono text-xs">%APPDATA%/dashboard/</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <FileArchive className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-muted-foreground">Datenbank</div>
                <div className="text-foreground font-mono text-xs">dashboard.db (SQLite)</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tip */}
      <div className="mt-6 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
        <p className="text-sm text-cyan-400">
          💡 <strong>Tip:</strong> Erstelle regelmäßig Backups, besonders vor größeren Änderungen oder Updates.
          Die Backup-Datei kann auf einem USB-Stick oder Cloud-Speicher aufbewahrt werden.
        </p>
      </div>
    </div>
  );
}
