import { useState, useEffect } from 'react';
import { Wrench, Download, CheckCircle, XCircle, Loader2, Trash2, FolderOpen, RefreshCw, Package } from 'lucide-react';
import { useToast } from '../../components/ToastProvider';

interface ToolStatus {
  terraform: { installed: boolean; path: string | null; version?: string };
  git: { installed: boolean; path: string | null; version?: string };
}

export default function ToolsSettings() {
  const toast = useToast();
  const [status, setStatus] = useState<ToolStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.tools.getStatus();
      if (result.success && result.tools) {
        setStatus({
          terraform: {
            installed: result.tools.terraform?.installed ?? false,
            path: null,
            version: result.tools.terraform?.version
          },
          git: {
            installed: result.tools.git?.installed ?? false,
            path: null,
            version: result.tools.git?.version
          }
        });
      }
    } catch (err) {
      console.error('Failed to load tools status:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadTool = async (tool: 'terraform' | 'git') => {
    setDownloading(tool);
    const toolName = tool === 'terraform' ? 'Terraform' : 'Git';
    
    toast.showProgress(`${tool}-download`, `Installing ${toolName}`);
    toast.updateProgress(`${tool}-download`, 'downloading', 10, `Downloading ${toolName}...`);
    
    try {
      const result = await window.electronAPI.tools.download(tool);
      if (result.success) {
        toast.updateProgress(`${tool}-download`, 'extracting', 80, 'Extracting files...');
        await new Promise(r => setTimeout(r, 500));
        toast.completeProgress(`${tool}-download`, true, `${toolName} installed successfully!`);
        await loadStatus();
      } else {
        toast.completeProgress(`${tool}-download`, false, result.error || 'Download failed');
      }
    } catch (err: any) {
      toast.completeProgress(`${tool}-download`, false, err.message);
    } finally {
      setDownloading(null);
    }
  };

  const tools = [
    {
      id: 'terraform' as const,
      name: 'Terraform',
      description: 'Infrastructure as Code Tool von HashiCorp',
      icon: '🏗️',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
      version: 'v1.6.6',
    },
    {
      id: 'git' as const,
      name: 'Git',
      description: 'Versionskontrolle für Code-Repositories',
      icon: '📦',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30',
      version: 'v2.43.0 (Portable)',
    },
  ];

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <Wrench className="w-7 h-7 text-green-400" />
          Portable Tools
        </h1>
        <p className="text-muted-foreground mt-1">
          Verwalte portable Versionen von Entwickler-Tools. Diese werden lokal gespeichert und erfordern keine System-Installation.
        </p>
      </div>

      {/* Refresh Button */}
      <button
        onClick={loadStatus}
        className="mb-6 flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Status aktualisieren
      </button>

      {/* Tools List */}
      <div className="space-y-4">
        {tools.map((tool) => {
          const toolStatus = status?.[tool.id];
          const isInstalled = toolStatus?.installed;
          const isDownloading = downloading === tool.id;

          return (
            <div
              key={tool.id}
              className={`bg-card border rounded-xl p-5 ${isInstalled ? 'border-green-500/30' : 'border-border'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${tool.bgColor} text-2xl`}>
                    {tool.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{tool.name}</h3>
                      {isInstalled ? (
                        <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          Installiert
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          <XCircle className="w-3 h-3" />
                          Nicht installiert
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{tool.description}</p>
                    <p className="text-xs text-muted-foreground mt-2">Version: {tool.version}</p>
                    
                    {isInstalled && toolStatus?.path && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <FolderOpen className="w-3 h-3" />
                        <span className="font-mono truncate max-w-xs">{toolStatus.path}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  {isInstalled ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => downloadTool(tool.id)}
                        disabled={isDownloading}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                        title="Neu installieren"
                      >
                        <RefreshCw className={`w-4 h-4 ${isDownloading ? 'animate-spin' : ''}`} />
                        Reinstall
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => downloadTool(tool.id)}
                      disabled={isDownloading}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-50 ${
                        tool.id === 'terraform' 
                          ? 'bg-purple-600 hover:bg-purple-500' 
                          : 'bg-orange-600 hover:bg-orange-500'
                      }`}
                    >
                      {isDownloading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      Installieren
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-muted/50 border border-border rounded-xl">
        <h4 className="font-medium text-foreground flex items-center gap-2 mb-2">
          <Package className="w-4 h-4 text-primary" />
          Über Portable Tools
        </h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Tools werden in <code className="bg-muted px-1 rounded">%APPDATA%/dashboard/portable-tools/</code> gespeichert</li>
          <li>• Keine Administrator-Rechte erforderlich</li>
          <li>• Funktioniert auf jedem Windows-PC ohne System-Installation</li>
          <li>• Die App bevorzugt portable Versionen vor System-Installationen</li>
        </ul>
      </div>

      {/* Tip */}
      <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
        <p className="text-sm text-green-400">
          💡 <strong>Tip:</strong> Du kannst die App auf einen USB-Stick kopieren und überall nutzen - 
          inklusive aller Tools und Einstellungen!
        </p>
      </div>
    </div>
  );
}
