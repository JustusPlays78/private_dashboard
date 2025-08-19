import React, { useState, useEffect, useRef } from 'react';
import { Save, Trash2, Plus } from 'lucide-react';
import Modal from './Modal';
import { NewScriptVariable, Script } from '../types';
import { scriptsApi } from '../api';

interface ScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  script: Script | null;
  onScriptCreated: (script: Script) => void;
  onScriptUpdated: (script: Script) => void;
  onScriptDeleted: (scriptId: string) => void;
}

const ScriptModal: React.FC<ScriptModalProps> = ({
  isOpen,
  onClose,
  script,
  onScriptCreated,
  onScriptUpdated,
  onScriptDeleted,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    content: '',
  });
  const [variables, setVariables] = useState<NewScriptVariable[]>([]);
  const [loading, setLoading] = useState(false);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  const isCreateMode = script === null;

  useEffect(() => {
    if (script) {
      setFormData({
        name: script.name,
        description: script.description || '',
        content: script.content,
      });
      setVariables(
        script.variables.map((v) => ({
          name: v.name,
          placeholder: v.placeholder,
          description: v.description,
          default_value: v.default_value,
          required: v.required,
          type: v.type,
        }))
      );
    } else {
      setFormData({
        name: '',
        description: '',
        content: '',
      });
      setVariables([]);
    }
  }, [script, isOpen]);

  // Auto-resize textarea
  const autoResize = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  };

  useEffect(() => {
    if (contentTextareaRef.current) {
      autoResize(contentTextareaRef.current);
    }
  }, [formData.content]);

  // Handle modal close properly
  const handleModalClose = () => {
    // Check if there are unsaved changes
    if (
      formData.name.trim() !== (script?.name || '') ||
      formData.description?.trim() !== (script?.description || '') ||
      formData.content.trim() !== (script?.content || '') ||
      variables.length !== (script?.variables.length || 0)
    ) {
      // If there are changes, confirm before closing
      if (
        confirm(
          'Es gibt ungespeicherte Änderungen. Möchtest du wirklich schließen?'
        )
      ) {
        onClose();
      }
    } else {
      // No changes, close directly
      onClose();
    }
  };

  const handleSave = async () => {
    // Validation
    if (!formData.name || !formData.name.trim()) {
      alert('Script Name ist erforderlich');
      return;
    }

    if (!formData.content || !formData.content.trim()) {
      alert('Script Inhalt ist erforderlich');
      return;
    }

    // Validate variables
    const validVariables = variables.filter((variable) => {
      const isValid =
        variable.name &&
        variable.name.trim() &&
        variable.placeholder &&
        variable.placeholder.trim();
      return isValid;
    });
    setLoading(true);
    try {
      const scriptData = {
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        content: formData.content.trim(),
        variables: validVariables,
      };

      if (isCreateMode) {
        const newScript = await scriptsApi.create(scriptData as any);
        onScriptCreated(newScript);
      } else if (script) {
        const updatedScript = await scriptsApi.update(
          script.id,
          scriptData as any
        );
        onScriptUpdated(updatedScript);
      }
      onClose();
    } catch (error: any) {
      console.error('Error saving script:', error);
      alert(`Fehler beim Speichern: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (
      !script ||
      !confirm(`Möchtest du das Script "${script.name}" wirklich löschen?`)
    )
      return;

    setLoading(true);
    try {
      await scriptsApi.delete(script.id);
      onScriptDeleted(script.id);
      onClose();
    } catch (error) {
      console.error('Error deleting script:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVariable = () => {
    setVariables([
      ...variables,
      {
        name: '',
        placeholder: '',
        description: '',
        default_value: '',
        required: false,
        type: 'text',
      },
    ]);
  };

  const handleUpdateVariable = (
    index: number,
    field: keyof NewScriptVariable,
    value: any
  ) => {
    const updatedVariables = [...variables];
    updatedVariables[index] = { ...updatedVariables[index], [field]: value };
    setVariables(updatedVariables);
  };

  const handleDeleteVariable = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index));
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, content: e.target.value }));
    autoResize(e.target);
  };

  const getModalTitle = () => {
    return isCreateMode ? 'Neues Script erstellen' : 'Script bearbeiten';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title={getModalTitle()}
      size="2xl"
    >
      <div className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              Script Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              className="input-field w-full"
              placeholder="z.B. Terraform Deploy"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              Beschreibung
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="input-field w-full"
              placeholder="Kurze Beschreibung (optional)"
            />
          </div>
        </div>
        {/* Script Content */}
        <div>
          <label className="block text-sm font-medium text-secondary mb-2">
            Script Inhalt *
          </label>
          <div className="relative">
            <textarea
              ref={contentTextareaRef}
              value={formData.content}
              onChange={handleContentChange}
              className="input-field w-full font-mono text-sm resize-none overflow-hidden"
              placeholder="Dein Script hier... Verwende $J{VARIABLE_NAME} für Variablen"
              rows={10}
              style={{ minHeight: '250px' }}
            />
          </div>
          <p className="text-xs text-muted mt-1">
            Tipp: Verwende{' '}
            <code className="bg-gray-600 px-1 rounded">
              $J{`{VARIABLE_NAME}`}
            </code>{' '}
            für Variablen (GitLab-kompatibel)
          </p>
        </div>
        {/* Variables */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <label className="block text-sm font-medium text-secondary">
              Variablen ({variables.length})
            </label>
            <button
              onClick={handleAddVariable}
              className="text-sm transition-colors flex items-center"
              style={{ color: 'var(--accent-blue)' }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = 'var(--accent-blue-light)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = 'var(--accent-blue)')
              }
            >
              <Plus className="w-4 h-4 mr-1" />
              Variable hinzufügen
            </button>
          </div>

          <div className="space-y-4 max-h-64 overflow-y-auto">
            {variables.map((variable, index) => (
              <div key={index} className="card p-4 border border-accent">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">
                      Variable Name *
                    </label>
                    <input
                      type="text"
                      value={variable.name}
                      onChange={(e) =>
                        handleUpdateVariable(index, 'name', e.target.value)
                      }
                      className="input-field w-full text-sm"
                      placeholder="z.B. PROJECT_ID"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">
                      Platzhalter *
                    </label>
                    <input
                      type="text"
                      value={variable.placeholder}
                      onChange={(e) =>
                        handleUpdateVariable(
                          index,
                          'placeholder',
                          e.target.value
                        )
                      }
                      className="input-field w-full text-sm"
                      placeholder="z.B. Projekt ID eingeben"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">
                      Beschreibung
                    </label>
                    <input
                      type="text"
                      value={variable.description || ''}
                      onChange={(e) =>
                        handleUpdateVariable(
                          index,
                          'description',
                          e.target.value
                        )
                      }
                      className="input-field w-full text-sm"
                      placeholder="Optionale Beschreibung"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">
                      Standardwert
                    </label>
                    <input
                      type="text"
                      value={variable.default_value || ''}
                      onChange={(e) =>
                        handleUpdateVariable(
                          index,
                          'default_value',
                          e.target.value
                        )
                      }
                      className="input-field w-full text-sm"
                      placeholder="Optionaler Standardwert"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">
                      Typ
                    </label>
                    <select
                      value={variable.type}
                      onChange={(e) =>
                        handleUpdateVariable(index, 'type', e.target.value)
                      }
                      className="input-field w-full text-sm"
                    >
                      <option value="text">Text</option>
                      <option value="password">Passwort</option>
                      <option value="number">Nummer</option>
                      <option value="url">URL</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={variable.required}
                        onChange={(e) =>
                          handleUpdateVariable(
                            index,
                            'required',
                            e.target.checked
                          )
                        }
                        className="rounded"
                      />
                      <span className="text-xs text-secondary">
                        Erforderlich
                      </span>
                    </label>
                    <button
                      onClick={() => handleDeleteVariable(index)}
                      className="p-1 text-muted transition-colors"
                      style={{ color: 'var(--accent-red)' }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color =
                          'var(--accent-red-hover)')
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = 'var(--accent-red)')
                      }
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Actions */}
        <div
          className={`flex ${!isCreateMode ? 'justify-between' : 'justify-end'} border-t border-accent pt-4`}
        >
          {!isCreateMode && (
            <button
              onClick={handleDelete}
              disabled={loading}
              className="btn-danger flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Löschen
            </button>
          )}

          <div className="flex space-x-3">
            <button onClick={onClose} className="btn-secondary">
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              disabled={
                loading || !formData.name.trim() || !formData.content.trim()
              }
              className="btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isCreateMode ? 'Erstellen' : 'Speichern'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ScriptModal;
