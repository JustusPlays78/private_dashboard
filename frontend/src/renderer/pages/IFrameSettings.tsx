import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, ExternalLink, Folder, Save, X } from 'lucide-react';

interface IFramePage {
  id: string;
  name: string;
  url: string;
  category: string;
  icon: string;
  position: number;
}

export default function IFrameSettings() {
  const [pages, setPages] = useState<IFramePage[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPage, setEditingPage] = useState<IFramePage | null>(null);
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
      const response = await fetch('http://localhost:8080/api/iframe-pages');
      const data = await response.json();
      if (data.pages) {
        setPages(data.pages);
      }
    } catch (error) {
      console.error('Failed to load pages:', error);
    }
  };

  const createPage = async () => {
    if (!formData.name.trim() || !formData.url.trim() || !formData.category.trim()) return;

    try {
      const response = await fetch('http://localhost:8080/api/iframe-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          url: formData.url.trim(),
          category: formData.category.trim(),
          icon: formData.icon,
          position: pages.filter(p => p.category === formData.category).length,
        }),
      });

      if (response.ok) {
        await loadPages();
        resetForm();
      }
    } catch (error) {
      console.error('Failed to create page:', error);
    }
  };

  const updatePage = async () => {
    if (!editingPage || !formData.name.trim() || !formData.url.trim() || !formData.category.trim()) return;

    try {
      const response = await fetch(`http://localhost:8080/api/iframe-pages/${editingPage.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          url: formData.url.trim(),
          category: formData.category.trim(),
          icon: formData.icon,
          position: editingPage.position,
        }),
      });

      if (response.ok) {
        await loadPages();
        resetForm();
      }
    } catch (error) {
      console.error('Failed to update page:', error);
    }
  };

  const deletePage = async (id: string) => {
    if (!confirm('Diese IFrame-Seite wirklich löschen?')) return;

    try {
      const response = await fetch(`http://localhost:8080/api/iframe-pages/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadPages();
      }
    } catch (error) {
      console.error('Failed to delete page:', error);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', url: '', category: '', icon: 'Monitor' });
    setShowAddModal(false);
    setEditingPage(null);
  };

  const startEdit = (page: IFramePage) => {
    setEditingPage(page);
    setFormData({
      name: page.name,
      url: page.url,
      category: page.category,
      icon: page.icon,
    });
    setShowAddModal(true);
  };

  // Group pages by category
  const groupedPages = pages.reduce((acc, page) => {
    if (!acc[page.category]) acc[page.category] = [];
    acc[page.category].push(page);
    return acc;
  }, {} as Record<string, IFramePage[]>);

  const availableIcons = [
    'Monitor', 'Server', 'Database', 'Cloud', 'Activity', 'BarChart', 
    'Terminal', 'Shield', 'Lock', 'Globe', 'Zap', 'Cpu'
  ];

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <ExternalLink className="w-7 h-7 text-blue-400" />
            IFrame Seiten
          </h2>
          <p className="text-slate-400">Verwalte deine eigenen IFrame-Seiten in der Navigation</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Neue Seite
        </button>
      </div>

      {/* Pages by Category */}
      {Object.keys(groupedPages).length === 0 ? (
        <div className="text-center py-12 bg-slate-800 rounded-lg border border-slate-700">
          <ExternalLink className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Keine IFrame-Seiten</h3>
          <p className="text-slate-400 mb-4">Erstelle deine erste IFrame-Seite</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Neue Seite
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedPages).map(([category, categoryPages]) => (
            <div key={category} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
              <div className="bg-slate-750 px-4 py-3 border-b border-slate-700 flex items-center gap-2">
                <Folder className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold text-white">{category}</h3>
                <span className="text-slate-400 text-sm ml-auto">{categoryPages.length} Seiten</span>
              </div>
              <div className="divide-y divide-slate-700">
                {categoryPages.map((page) => (
                  <div key={page.id} className="px-4 py-3 flex items-center gap-4 hover:bg-slate-750 transition-colors">
                    <div className="flex-1">
                      <div className="font-medium text-white mb-1">{page.name}</div>
                      <div className="text-sm text-slate-400 truncate">{page.url}</div>
                    </div>
                    <div className="text-sm text-slate-500">Icon: {page.icon}</div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(page)}
                        className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                        title="Bearbeiten"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deletePage(page.id)}
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
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

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-md border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">
                {editingPage ? 'Seite bearbeiten' : 'Neue IFrame-Seite'}
              </h3>
              <button
                onClick={resetForm}
                className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="z.B. Production Zabbix"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none placeholder-slate-400"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">URL</label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Kategorie</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="z.B. Monitoring, Tools, etc."
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Icon</label>
                <select
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {availableIcons.map(icon => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors font-medium"
                >
                  Abbrechen
                </button>
                <button
                  onClick={editingPage ? updatePage : createPage}
                  disabled={!formData.name.trim() || !formData.url.trim() || !formData.category.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingPage ? 'Speichern' : 'Erstellen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
