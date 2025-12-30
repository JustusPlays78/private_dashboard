import { useState, useEffect, useRef } from 'react';
import {
  Plus,
  ChevronDown,
  Trash2,
  Monitor,
  X
} from 'lucide-react';

interface ZabbixServer {
  id: string;
  name: string;
  url: string;
  position: number;
}

export default function ZabbixViewer() {
  const [servers, setServers] = useState<ZabbixServer[]>([]);
  const [selectedServer, setSelectedServer] = useState<ZabbixServer | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [newServerUrl, setNewServerUrl] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [serverToDelete, setServerToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/zabbix-servers');
      const data = await response.json();
      if (data.servers) {
        setServers(data.servers);
        if (data.servers.length > 0 && !selectedServer) {
          setSelectedServer(data.servers[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load Zabbix servers:', error);
    }
  };

  const createServer = async () => {
    if (!newServerName.trim() || !newServerUrl.trim()) return;

    try {
      const response = await fetch('http://localhost:8080/api/zabbix-servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newServerName.trim(),
          url: newServerUrl.trim(),
          position: servers.length,
        }),
      });

      if (response.ok) {
        await loadServers();
        setShowAddModal(false);
        setNewServerName('');
        setNewServerUrl('');
      }
    } catch (error) {
      console.error('Failed to create server:', error);
    }
  };

  const deleteServer = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:8080/api/zabbix-servers/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        if (selectedServer?.id === id) {
          setSelectedServer(null);
        }
        await loadServers();
        setShowDeleteConfirm(false);
        setServerToDelete(null);
      }
    } catch (error) {
      console.error('Failed to delete server:', error);
    }
  };

  return (
    <>
      {/* Header with dropdown */}
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 overflow-hidden">
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-slate-700 transition-colors min-w-[250px]"
            >
              <Monitor className="w-5 h-5 text-blue-400" />
              <span className="flex-1 text-left font-medium text-white">
                {selectedServer ? selectedServer.name : 'Kein Server ausgewählt'}
              </span>
              <ChevronDown
                className={`w-5 h-5 text-slate-400 transition-transform ${
                  showDropdown ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 rounded-xl shadow-xl border border-slate-700 py-2 max-h-[400px] overflow-auto">
                {servers.map((server) => (
                  <div
                    key={server.id}
                    className="group flex items-center gap-2 px-4 py-2.5 hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    <div
                      className="flex-1"
                      onClick={() => {
                        setSelectedServer(server);
                        setShowDropdown(false);
                      }}
                    >
                      <div className="font-medium text-white">{server.name}</div>
                      <div className="text-sm text-slate-400 truncate">{server.url}</div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setServerToDelete(server.id);
                        setShowDeleteConfirm(true);
                        setShowDropdown(false);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-900/50 rounded-lg transition-all"
                      title="Server löschen"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                ))}

                <div className="border-t border-slate-700 mt-2 pt-2 px-2">
                  <button
                    onClick={() => {
                      setShowAddModal(true);
                      setShowDropdown(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-blue-400 hover:bg-slate-700 rounded-lg transition-colors font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Neuer Zabbix Server</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main iFrame */}
      <div className="w-full h-screen bg-slate-900">
        {selectedServer ? (
          <iframe
            src={selectedServer.url}
            className="w-full h-full border-0"
            title={`Zabbix - ${selectedServer.name}`}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Monitor className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Kein Server ausgewählt</h2>
              <p className="text-slate-400 mb-6">
                Wähle einen Zabbix Server aus oder füge einen neuen hinzu
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Plus className="w-5 h-5" />
                <span>Neuer Zabbix Server</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Server Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-md border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Neuer Zabbix Server</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewServerName('');
                  setNewServerUrl('');
                }}
                className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Server Name
                </label>
                <input
                  type="text"
                  value={newServerName}
                  onChange={(e) => setNewServerName(e.target.value)}
                  placeholder="z.B. Production Zabbix"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder-slate-400"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Server URL
                </label>
                <input
                  type="url"
                  value={newServerUrl}
                  onChange={(e) => setNewServerUrl(e.target.value)}
                  placeholder="https://zabbix.example.com"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder-slate-400"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewServerName('');
                    setNewServerUrl('');
                  }}
                  className="flex-1 px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors font-medium"
                >
                  Abbrechen
                </button>
                <button
                  onClick={createServer}
                  disabled={!newServerName.trim() || !newServerUrl.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Hinzufügen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && serverToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-md border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-2">Server löschen?</h3>
            <p className="text-slate-400 mb-6">
              Möchtest du diesen Zabbix Server wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setServerToDelete(null);
                }}
                className="flex-1 px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors font-medium"
              >
                Abbrechen
              </button>
              <button
                onClick={() => deleteServer(serverToDelete)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
