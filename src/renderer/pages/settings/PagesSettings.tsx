import { useState, useEffect } from 'react';
import { Layout, Plus, Trash2, Edit2, X, Save, ExternalLink, Folder, Monitor, Server, Database, Cloud, Activity, BarChart, Terminal, Shield, Lock, Globe, Zap, Cpu, GripVertical } from 'lucide-react';

interface IFramePage {
  id: string;
  name: string;
  url: string;
  category: string;
  icon: string;
  position: number;
}

const AVAILABLE_ICONS: Record<string, any> = {
  Monitor, Server, Database, Cloud, Activity, BarChart, 
  Terminal, Shield, Lock, Globe, Zap, Cpu, Layout
};

export default function PagesSettings() {
  const [pages, setPages] = useState<IFramePage[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<IFramePage | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    category: '',
    icon: 'Monitor',
  });

  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = async () => {
    try {
      const result = await window.electronAPI.iframes.getAll();
      if (result.pages) {
        setPages(result.pages);
      }
    } catch (error) {
      console.error('Failed to load pages:', error);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.url.trim() || !formData.category.trim()) return;

    try {
      if (editing) {
        await window.electronAPI.iframes.update(editing.id, {
          name: formData.name.trim(),
          url: formData.url.trim(),
          category: formData.category.trim(),
          icon: formData.icon,
          position: editing.position,
        });
      } else {
        await window.electronAPI.iframes.create({
          name: formData.name.trim(),
          url: formData.url.trim(),
          category: formData.category.trim(),
          icon: formData.icon,
          position: pages.filter(p => p.category === formData.category).length,
        });
      }

      await loadPages();
      window.dispatchEvent(new Event('iframesUpdated'));
      resetForm();
    } catch (error) {
      console.error('Failed to save page:', error);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Seite "${name}" wirklich löschen?`)) return;

    try {
      await window.electronAPI.iframes.delete(id);
      await loadPages();
      window.dispatchEvent(new Event('iframesUpdated'));
    } catch (error) {
      console.error('Failed to delete page:', error);
    }
  };

  const startEdit = (page: IFramePage) => {
    setEditing(page);
    setFormData({
      name: page.name,
      url: page.url,
      category: page.category,
      icon: page.icon,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({ name: '', url: '', category: '', icon: 'Monitor' });
    setShowModal(false);
    setEditing(null);
  };

  // Group pages by category
  const groupedPages = pages.reduce((acc, page) => {
    if (!acc[page.category]) acc[page.category] = [];
    acc[page.category].push(page);
    return acc;
  }, {} as Record<string, IFramePage[]>);

  const getIcon = (iconName: string) => {
    const IconComponent = AVAILABLE_ICONS[iconName] || Monitor;
    return <IconComponent className="w-5 h-5" />;
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <Layout className="w-7 h-7 text-blue-400" />
          Custom Pages
        </h1>
        <p className="text-muted-foreground mt-1">
          Füge eigene IFrame-Seiten zur Navigation hinzu (z.B. Monitoring, Dashboards)
        </p>
      </div>

      {/* Add Button */}
      <button
        onClick={() => {
          resetForm();
          setShowModal(true);
        }}
        className="mb-6 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" />
        Neue Seite
      </button>

      {/* Pages List */}
      {Object.keys(groupedPages).length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Layout className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-medium text-foreground mb-2">Keine Custom Pages</h3>
          <p className="text-muted-foreground mb-4">
            Erstelle deine erste IFrame-Seite um externe Dienste einzubetten
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedPages).map(([category, categoryPages]) => (
            <div key={category} className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="bg-muted/50 px-4 py-3 border-b border-border flex items-center gap-2">
                <Folder className="w-4 h-4 text-blue-400" />
                <h3 className="font-medium text-foreground">{category}</h3>
                <span className="text-muted-foreground text-sm ml-auto">{categoryPages.length} Seiten</span>
              </div>
              <div className="divide-y divide-border">
                {categoryPages.map((page) => (
                  <div key={page.id} className="px-4 py-3 flex items-center gap-4 hover:bg-muted/30 transition-colors">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                      {getIcon(page.icon)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground">{page.name}</div>
                      <div className="text-sm text-muted-foreground truncate">{page.url}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(page)}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                        title="Bearbeiten"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(page.id, page.name)}
                        className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Löschen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tip */}
      <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <p className="text-sm text-blue-400">
          💡 <strong>Tip:</strong> IFrame-Seiten erscheinen in der Sidebar unter ihrer Kategorie.
          Perfekt für Zabbix, Grafana, Kibana oder andere Web-Dashboards.
        </p>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={resetForm} />
          <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">
                {editing ? 'Seite bearbeiten' : 'Neue IFrame-Seite'}
              </h3>
              <button onClick={resetForm} className="p-2 hover:bg-muted rounded-lg transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="z.B. Production Zabbix"
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">URL *</label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://example.com/dashboard"
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Kategorie *</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="z.B. Monitoring, Tools, Dashboards"
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Icon</label>
                <div className="grid grid-cols-6 gap-2">
                  {Object.keys(AVAILABLE_ICONS).map((iconName) => {
                    const IconComp = AVAILABLE_ICONS[iconName];
                    return (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon: iconName })}
                        className={`p-3 rounded-lg border transition-colors ${
                          formData.icon === iconName
                            ? 'bg-primary/20 border-primary text-primary'
                            : 'bg-muted border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
                        }`}
                        title={iconName}
                      >
                        <IconComp className="w-5 h-5 mx-auto" />
                      </button>
                    );
                  })}
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
                disabled={!formData.name.trim() || !formData.url.trim() || !formData.category.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {editing ? 'Speichern' : 'Erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
