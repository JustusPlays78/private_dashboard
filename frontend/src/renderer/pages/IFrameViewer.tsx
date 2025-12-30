import { useParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { ExternalLink, Loader, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import '../electron.d';

interface IFramePage {
  id: string;
  name: string;
  url: string;
  category: string;
  icon: string;
  position: number;
}

const TOPBAR_HEIGHT = 56; // Height of the top bar

export default function IFrameViewer() {
  const { id } = useParams<{ id: string }>();
  const [page, setPage] = useState<IFramePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [healthStatus, setHealthStatus] = useState<'checking' | 'healthy' | 'unreachable' | 'blocked'>('checking');
  const [browserViewError, setBrowserViewError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isElectron = typeof window.electronAPI !== 'undefined';

  useEffect(() => {
    if (id) {
      loadPage(id);
    }
  }, [id]);

  useEffect(() => {
    if (page && isElectron) {
      loadBrowserView();
    } else if (page) {
      checkHealth();
    }

    return () => {
      // Cleanup BrowserView when component unmounts
      if (isElectron && window.electronAPI?.browserView) {
        window.electronAPI.browserView.destroy().catch(console.error);
      }
    };
  }, [page]);

  useEffect(() => {
    // Update BrowserView bounds when window resizes
    const handleResize = () => {
      if (isElectron && page && containerRef.current) {
        updateBrowserViewBounds();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [page, isElectron]);

  const updateBrowserViewBounds = () => {
    if (!containerRef.current || !isElectron) return;

    const rect = containerRef.current.getBoundingClientRect();
    window.electronAPI.browserView.resize({
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    }).catch(console.error);
  };

  const loadBrowserView = async () => {
    if (!page || !containerRef.current || !isElectron) return;

    setBrowserViewError(null);
    setHealthStatus('checking');

    try {
      const rect = containerRef.current.getBoundingClientRect();
      const result = await window.electronAPI.browserView.load(page.id, page.url, {
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      });

      if (result.success) {
        setHealthStatus('healthy');
      } else {
        setBrowserViewError(result.error || 'Failed to load');
        setHealthStatus('blocked');
      }
    } catch (error) {
      console.error('BrowserView load error:', error);
      setBrowserViewError(String(error));
      setHealthStatus('unreachable');
    }
  };

  useEffect(() => {
    if (id) {
      loadPage(id);
    }
  }, [id]);

  useEffect(() => {
    if (page) {
      checkHealth();
    }
  }, [page]);

  const loadPage = async (pageId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8080/api/iframe-pages/${pageId}`);
      if (response.ok) {
        const data = await response.json();
        setPage(data);
      }
    } catch (error) {
      console.error('Failed to load page:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkHealth = async () => {
    if (!page) return;
    
    setHealthStatus('checking');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(page.url, {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      setHealthStatus('healthy');
    } catch (error) {
      console.error('Health check failed:', error);
      setHealthStatus('unreachable');
    }
  };

  const handleReload = () => {
    if (isElectron && window.electronAPI?.browserView) {
      window.electronAPI.browserView.reload().catch(console.error);
    }
    checkHealth();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <Loader className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="text-center">
          <ExternalLink className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Seite nicht gefunden</h2>
          <p className="text-slate-400">Die angeforderte IFrame-Seite existiert nicht</p>
        </div>
      </div>
    );
  }

  const getStatusColor = () => {
    switch (healthStatus) {
      case 'healthy': return 'text-green-400';
      case 'unreachable': return 'text-red-400';
      case 'blocked': return 'text-yellow-400';
      default: return 'text-slate-400';
    }
  };

  const getStatusIcon = () => {
    switch (healthStatus) {
      case 'healthy': return <CheckCircle className="w-4 h-4" />;
      case 'unreachable': return <XCircle className="w-4 h-4" />;
      case 'blocked': return <AlertCircle className="w-4 h-4" />;
      default: return <Loader className="w-4 h-4 animate-spin" />;
    }
  };

  const getStatusText = () => {
    switch (healthStatus) {
      case 'healthy': return 'Erreichbar';
      case 'unreachable': return 'Nicht erreichbar';
      case 'blocked': return 'Einbettung blockiert';
      case 'checking': return 'Prüfe...';
    }
  };

  return (
    <div className="w-full h-screen bg-slate-900 flex flex-col">
      {/* Top Bar */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <ExternalLink className="w-5 h-5 text-blue-400" />
          <div>
            <div className="font-semibold text-white">{page.name}</div>
            <div className="text-xs text-slate-400">{page.category}</div>
          </div>
        </div>

        <div className="flex-1" />

        {/* Status Indicator */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/50 ${getStatusColor()}`}>
          {getStatusIcon()}
          <span className="text-sm font-medium">{getStatusText()}</span>
        </div>

        {/* Actions */}
        <button
          onClick={handleReload}
          className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
          title="Neu laden"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <a
          href={page.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
        >
          <ExternalLink className="w-4 h-4" />
          Extern öffnen
        </a>
      </div>

      {/* BrowserView Container or Error Message */}
      {browserViewError && isElectron ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Fehler beim Laden</h2>
            <p className="text-slate-400 mb-4">{browserViewError}</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={handleReload}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Erneut versuchen
              </button>
              <a
                href={page.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                <ExternalLink className="w-5 h-5" />
                Extern öffnen
              </a>
            </div>
          </div>
        </div>
      ) : isElectron ? (
        <div 
          ref={containerRef}
          className="flex-1 w-full bg-slate-900"
          style={{ minHeight: '200px' }}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Nur in Electron verfügbar</h2>
            <p className="text-slate-400 mb-4">
              Diese Funktion ist nur in der Electron-App verfügbar.
            </p>
            <a
              href={page.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ExternalLink className="w-5 h-5" />
              Extern öffnen
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
