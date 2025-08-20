import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { secretsApi } from '../api/secretsApi';
import { SecretMeta } from '../types';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import SecretModal from '../components/SecretModal';

const Secrets: React.FC = () => {
  const [items, setItems] = useState<SecretMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await secretsApi.getAll();
      setItems(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onCreate = () => {
    setEditingName(null);
    setModalOpen(true);
  };

  const onEdit = (name: string) => {
    setEditingName(name);
    setModalOpen(true);
  };

  const onSaved = () => load();

  const onDelete = async (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Secret "${name}" wirklich löschen?`)) return;
    try {
      await secretsApi.delete(name);
      setItems(items.filter((i) => i.name !== name));
    } catch (err) {
      console.error(err);
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
          <h1 className="text-3xl font-bold text-primary">Secrets</h1>
          <p className="mt-2 text-secondary">
            Verwalte verschlüsselte Schlüssel/Werte
          </p>
        </div>
        <button onClick={onCreate} className="btn-primary flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          Neues Secret
        </button>
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted mb-4">Noch keine Secrets</p>
            <button
              onClick={onCreate}
              className="btn-primary flex items-center mx-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Erstes Secret erstellen
            </button>
          </div>
        ) : (
          items.map((s) => {
            const isOverdue = s.due_date
              ? new Date(s.due_date) < new Date()
              : false;
            return (
              <div
                key={s.name}
                className="card card-hover p-4 cursor-pointer"
                onClick={() => onEdit(s.name)}
              >
                <div className="flex justify-between items-center">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-primary truncate">
                      {s.name}
                    </h3>
                    <p className="text-sm text-muted mt-1">
                      Aktualisiert:{' '}
                      {format(new Date(s.updated_at), 'dd.MM.yyyy HH:mm', {
                        locale: de,
                      })}
                    </p>
                    {s.due_date && (
                      <p
                        className={`text-xs mt-1 ${isOverdue ? 'text-red-400' : 'text-muted'}`}
                      >
                        Fällig:{' '}
                        {format(new Date(s.due_date), 'dd.MM.yyyy HH:mm', {
                          locale: de,
                        })}
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-2 ml-4 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(s.name);
                      }}
                      className="p-2 text-muted hover:text-secondary transition-colors rounded-md hover:bg-opacity-10"
                      style={{ backgroundColor: 'transparent' }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor =
                          'var(--bg-tertiary)')
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = 'transparent')
                      }
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => onDelete(s.name, e)}
                      className="p-2 text-muted transition-colors rounded-md hover:bg-opacity-10"
                      style={{
                        color: 'var(--accent-red)',
                        backgroundColor: 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--accent-red-hover)';
                        e.currentTarget.style.backgroundColor =
                          'var(--bg-tertiary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--accent-red)';
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <SecretModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        secretName={editingName}
        onSaved={onSaved}
      />
    </div>
  );
};

export default Secrets;
