import { useState, useEffect } from 'react';
import { GitBranch, Plus, Trash2, Edit2, X, Save, Eye, EyeOff, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';

interface GitLabInstance {
  id: string;
  name: string;
  url: string;
  token: string;
}

interface Secret {
  id: string;
  name: string;
  category: string;
  apiKey: string | null;
  password: string | null;
  url: string | null;
}

export default function GitSettings() {
  const [gitlabInstances, setGitlabInstances] = useState<GitLabInstance[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<GitLabInstance | null>(null);
  const [formData, setFormData] = useState({ name: '', url: '', token: '' });
  const [showToken, setShowToken] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadInstances();
  }, []);

  const loadInstances = async () => {
    try {
      const result = await window.electronAPI.secrets.getAll();
      if (result.success && result.secrets) {
        const gitlabSecrets = result.secrets.filter(
          (s: Secret) => s.category === 'GitLab' && s.url
        );
        setGitlabInstances(gitlabSecrets.map((s: Secret) => ({
          id: s.id,
          name: s.name,
          url: s.url || '',
          token: s.apiKey || s.password || ''
        })));
      }
    } catch (err) {
      console.error('Failed to load GitLab instances:', err);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.url.trim() || !formData.token.trim()) {
      setError('Alle Felder sind erforderlich');
      setTimeout(() => setError(''), 5000);
      return;
    }

    try {
      if (editing) {
        await window.electronAPI.secrets.update(editing.id, {
          name: formData.name.trim(),
          category: 'GitLab',
          url: formData.url.trim().replace(/\/$/, ''),
          apiKey: formData.token.trim(),
          notes: `GitLab instance: ${formData.url.trim()}`
        });
        setSuccess(`GitLab instance "${formData.name}" aktualisiert!`);
      } else {
        await window.electronAPI.secrets.create({
          name: formData.name.trim(),
          category: 'GitLab',
          url: formData.url.trim().replace(/\/$/, ''),
          apiKey: formData.token.trim(),
          notes: `GitLab instance: ${formData.url.trim()}`
        });
        setSuccess(`GitLab instance "${formData.name}" hinzugefügt!`);
      }

      await loadInstances();
      resetForm();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Fehler beim Speichern: ' + err.message);
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleDelete = async (instance: GitLabInstance) => {
    if (!confirm(`GitLab instance "${instance.name}" wirklich löschen?`)) return;

    try {
      await window.electronAPI.secrets.delete(instance.id);
      await loadInstances();
      setSuccess(`GitLab instance "${instance.name}" gelöscht`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const startEdit = (instance: GitLabInstance) => {
    setEditing(instance);
    setFormData({
      name: instance.name,
      url: instance.url,
      token: instance.token
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({ name: '', url: '', token: '' });
    setEditing(null);
    setShowModal(false);
    setShowToken(false);
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <GitBranch className="w-7 h-7 text-orange-400" />
          Git Instances
        </h1>
        <p className="text-muted-foreground mt-1">
          Konfiguriere GitLab und GitHub Server mit Access Tokens
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

      {/* Add Button */}
      <button
        onClick={() => {
          resetForm();
          setShowModal(true);
        }}
        className="mb-6 flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add GitLab Instance
      </button>

      {/* Instances List */}
      {gitlabInstances.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <GitBranch className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-medium text-foreground mb-2">Keine GitLab Instances</h3>
          <p className="text-muted-foreground mb-4">
            Füge deine erste GitLab Instance hinzu um loszulegen
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {gitlabInstances.map((instance) => (
            <div
              key={instance.id}
              className="bg-card border border-border rounded-xl p-4 flex items-center justify-between hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-500/10 rounded-xl">
                  <GitBranch className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{instance.name}</h3>
                  <a 
                    href={instance.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
                  >
                    {instance.url}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => startEdit(instance)}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(instance)}
                  className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tip */}
      <div className="mt-6 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
        <p className="text-sm text-orange-400">
          💡 <strong>Tip:</strong> Erstelle einen Personal Access Token in GitLab mit <code className="bg-orange-500/20 px-1 rounded">read_api</code>, <code className="bg-orange-500/20 px-1 rounded">read_repository</code> Berechtigungen.
          Gehe zu GitLab → Settings → Access Tokens.
        </p>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={resetForm} />
          <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">
                {editing ? 'GitLab Instance bearbeiten' : 'Neue GitLab Instance'}
              </h3>
              <button onClick={resetForm} className="p-2 hover:bg-muted rounded-lg transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="z.B. Company GitLab"
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  GitLab URL *
                </label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://gitlab.example.com"
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Personal Access Token *
                </label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={formData.token}
                    onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                    placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-4 py-2 pr-12 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button
                onClick={resetForm}
                className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.name || !formData.url || !formData.token}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {editing ? 'Aktualisieren' : 'Hinzufügen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
