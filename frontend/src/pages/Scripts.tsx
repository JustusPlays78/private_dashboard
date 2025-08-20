import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Play, Terminal, FileText } from 'lucide-react';
import { scriptsApi } from '../api/scriptsApi';
import { Script } from '../types';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import ScriptModal from '../components/ScriptModal';
import ExecuteScriptModal from '../components/ExecuteScriptModal';

const Scripts: React.FC = () => {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);

  useEffect(() => {
    fetchScripts();
  }, []);

  const fetchScripts = async () => {
    try {
      const data = await scriptsApi.getAll();
      setScripts(data);
    } catch (error) {
      console.error('Error fetching scripts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateScript = () => {
    setSelectedScript(null);
    setShowCreateModal(true);
  };

  const handleEditScript = (script: Script) => {
    setSelectedScript(script);
    setShowEditModal(true);
  };

  const handleExecuteScript = (script: Script) => {
    setSelectedScript(script);
    setShowExecuteModal(true);
  };

  const handleScriptCreated = (newScript: Script) => {
    setScripts([newScript, ...scripts]);
  };

  const handleScriptUpdated = (updatedScript: Script) => {
    setScripts(
      scripts.map((script) =>
        script.id === updatedScript.id ? updatedScript : script
      )
    );
  };

  const handleScriptDeleted = (scriptId: string) => {
    setScripts(scripts.filter((script) => script.id !== scriptId));
  };

  const handleQuickDelete = async (script: Script, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Möchtest du das Script "${script.name}" wirklich löschen?`))
      return;

    try {
      await scriptsApi.delete(script.id);
      handleScriptDeleted(script.id);
    } catch (error) {
      console.error('Error deleting script:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div
          className="animate-spin rounded-full h-32 w-32 border-b-2"
          style={{ borderColor: 'var(--accent-blue)' }}
        ></div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">Scripts</h1>
          <p className="mt-2 text-secondary">
            Verwalte deine Deployment-Scripts und Automatisierungen
          </p>
        </div>
        <button
          onClick={handleCreateScript}
          className="btn-primary flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Neues Script
        </button>
      </div>

      {/* Scripts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {scripts.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Terminal className="w-16 h-16 text-muted mx-auto mb-4" />
            <p className="text-muted mb-4">Noch keine Scripts vorhanden</p>
            <button
              onClick={handleCreateScript}
              className="btn-primary flex items-center mx-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Erstes Script erstellen
            </button>
          </div>
        ) : (
          scripts.map((script) => (
            <div key={script.id} className="card card-hover p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-2">
                  <Terminal className="w-5 h-5 text-muted" />
                  <h3 className="text-lg font-medium text-primary truncate">
                    {script.name}
                  </h3>
                </div>
                <div className="flex space-x-1 flex-shrink-0">
                  <button
                    onClick={() => handleExecuteScript(script)}
                    className="p-1 text-muted transition-colors rounded"
                    style={{ color: 'var(--accent-green)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--accent-green)';
                      e.currentTarget.style.backgroundColor =
                        'var(--bg-tertiary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--accent-green)';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    title="Script ausführen"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEditScript(script)}
                    className="p-1 text-muted hover:text-secondary transition-colors rounded"
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor =
                        'var(--bg-tertiary)')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = 'transparent')
                    }
                    title="Script bearbeiten"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleQuickDelete(script, e)}
                    className="p-1 text-muted transition-colors rounded"
                    style={{ color: 'var(--accent-red)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--accent-red-hover)';
                      e.currentTarget.style.backgroundColor =
                        'var(--bg-tertiary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--accent-red)';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    title="Script löschen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {script.description && (
                <p className="text-secondary text-sm mb-4 line-clamp-2">
                  {script.description}
                </p>
              )}

              <div className="flex items-center justify-between text-xs text-muted">
                <div className="flex items-center space-x-4">
                  <span className="flex items-center">
                    <FileText className="w-3 h-3 mr-1" />
                    {script.variables?.length || 0} Variable
                    {(script.variables?.length || 0) !== 1 ? 'n' : ''}
                  </span>
                </div>
                <span>
                  {format(new Date(script.updated_at), 'dd.MM.yyyy', {
                    locale: de,
                  })}
                </span>
              </div>

              {/* Execute Button */}
              <div className="mt-4 pt-4 border-t border-accent">
                <button
                  onClick={() => handleExecuteScript(script)}
                  className="w-full btn-primary flex items-center justify-center"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Script ausführen
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      <ScriptModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        script={null}
        onScriptCreated={handleScriptCreated}
        onScriptUpdated={handleScriptUpdated}
        onScriptDeleted={handleScriptDeleted}
      />

      <ScriptModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        script={selectedScript}
        onScriptCreated={handleScriptCreated}
        onScriptUpdated={handleScriptUpdated}
        onScriptDeleted={handleScriptDeleted}
      />

      <ExecuteScriptModal
        isOpen={showExecuteModal}
        onClose={() => setShowExecuteModal(false)}
        script={selectedScript}
      />
    </div>
  );
};

export default Scripts;
