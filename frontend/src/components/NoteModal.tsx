import React, { useState, useEffect, useRef } from 'react';
import { Save, Trash2, Edit, X } from 'lucide-react';
import Modal from './Modal';
import { Note } from '../types';
import { notesApi } from '../api';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note | null; // null = Create Mode, Note = Edit Mode
  onNoteUpdated: () => void;
  onNoteDeleted: () => void;
  onNoteCreated?: (note: Note) => void; // Optional für Create Mode
}

const NoteModal: React.FC<NoteModalProps> = ({
  isOpen,
  onClose,
  note,
  onNoteUpdated,
  onNoteDeleted,
  onNoteCreated,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
  });
  const [loading, setLoading] = useState(false);
  const titleTextareaRef = useRef<HTMLTextAreaElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Determine if we're in create mode
  const isCreateMode = note === null;

  useEffect(() => {
    if (note) {
      // Edit mode - load existing note
      setFormData({
        title: note.title,
        content: note.content,
      });
      setIsEditing(false); // Start in view mode for existing notes
    } else {
      // Create mode - empty form
      setFormData({
        title: '',
        content: '',
      });
      setIsEditing(true); // Start in edit mode for new notes
    }
  }, [note, isOpen]);

  // Auto-resize textarea function
  const autoResize = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  };

  // Auto-resize on content change
  useEffect(() => {
    if (isEditing && titleTextareaRef.current) {
      autoResize(titleTextareaRef.current);
    }
  }, [formData.title, isEditing]);

  useEffect(() => {
    if (isEditing && contentTextareaRef.current) {
      autoResize(contentTextareaRef.current);
    }
  }, [formData.content, isEditing]);

  // Focus on title when modal opens in edit mode
  useEffect(() => {
    if (isOpen && isEditing && titleTextareaRef.current) {
      setTimeout(() => {
        titleTextareaRef.current?.focus();
        if (titleTextareaRef.current && contentTextareaRef.current) {
          autoResize(titleTextareaRef.current);
          autoResize(contentTextareaRef.current);
        }
      }, 100);
    }
  }, [isOpen, isEditing]);

  const handleEdit = () => {
    setIsEditing(true);
    setTimeout(() => {
      if (titleTextareaRef.current) {
        titleTextareaRef.current.focus();
        autoResize(titleTextareaRef.current);
      }
      if (contentTextareaRef.current) {
        autoResize(contentTextareaRef.current);
      }
    }, 0);
  };

  const handleCancelEdit = () => {
    if (isCreateMode) {
      // In create mode, cancel means close modal
      setFormData({ title: '', content: '' });
      onClose();
    } else if (note) {
      // In edit mode, reset to original data
      setFormData({
        title: note.title,
        content: note.content,
      });
      setIsEditing(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) return;

    setLoading(true);
    try {
      if (isCreateMode) {
        // Create new note
        const newNote = await notesApi.create(formData);
        if (onNoteCreated) {
          onNoteCreated(newNote);
        }
        onNoteUpdated(); // Refresh the list
        setFormData({ title: '', content: '' });
        onClose();
      } else if (note) {
        // Update existing note
        await notesApi.update(note.id, formData);
        onNoteUpdated();
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!note || !confirm('Möchtest du diese Notiz wirklich löschen?')) return;

    setLoading(true);
    try {
      await notesApi.delete(note.id);
      onNoteDeleted();
      onClose();
    } catch (error) {
      console.error('Error deleting note:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, title: e.target.value }));
    autoResize(e.target);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, content: e.target.value }));
    autoResize(e.target);
  };

  const getModalTitle = () => {
    if (isCreateMode) return 'Neue Notiz erstellen';
    return isEditing ? 'Notiz bearbeiten' : 'Notiz';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancelEdit}
      title={getModalTitle()}
      size="3xl"
    >
      <div className="space-y-6">
        {/* Title */}
        <div>
          {isEditing ? (
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Titel
              </label>
              <textarea
                ref={titleTextareaRef}
                value={formData.title}
                onChange={handleTitleChange}
                className="input-field w-full resize-none overflow-hidden"
                placeholder="Notiz Titel"
                rows={1}
                style={{ minHeight: '42px' }}
              />
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-semibold text-primary mb-2 leading-relaxed break-words">
                {note?.title}
              </h2>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1">
          {isEditing ? (
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Inhalt
              </label>
              <textarea
                ref={contentTextareaRef}
                value={formData.content}
                onChange={handleContentChange}
                className="input-field w-full resize-none overflow-hidden"
                placeholder="Notiz Inhalt"
                rows={8}
                style={{ minHeight: '200px' }}
              />
            </div>
          ) : (
            <div
              className="rounded-lg p-4 border border-accent max-h-96 overflow-y-auto"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              <div className="text-primary leading-relaxed break-words whitespace-pre-wrap">
                {note?.content}
              </div>
            </div>
          )}
        </div>

        {/* Note Info - only show in edit mode for existing notes */}
        {!isCreateMode && note && (
          <div className="text-xs text-muted border-t border-accent pt-4">
            <div className="flex justify-between">
              <div>
                <p>
                  Erstellt:{' '}
                  {format(new Date(note.created_at), 'dd.MM.yyyy HH:mm', {
                    locale: de,
                  })}
                </p>
                <p>
                  Zuletzt bearbeitet:{' '}
                  {format(new Date(note.updated_at), 'dd.MM.yyyy HH:mm', {
                    locale: de,
                  })}
                </p>
              </div>
              <div
                className="text-right"
                style={{ color: 'var(--text-placeholder)' }}
              >
                <p>{formData.content.length} Zeichen</p>
                <p>{formData.content.split('\n').length} Zeilen</p>
              </div>
            </div>
          </div>
        )}

        {/* Character count for create mode */}
        {isCreateMode && (
          <div className="text-xs text-muted text-right">
            <p>{formData.content.length} Zeichen</p>
            <p>{formData.content.split('\n').length} Zeilen</p>
          </div>
        )}

        {/* Actions */}
        <div
          className={`flex ${isEditing && !isCreateMode ? 'justify-between' : 'justify-end'} border-t border-accent pt-4`}
        >
          {/* Löschen-Button nur im Edit-Modus für bestehende Notizen */}
          {isEditing && !isCreateMode && (
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
            {isEditing ? (
              <>
                <button
                  onClick={handleCancelEdit}
                  disabled={loading}
                  className="btn-secondary flex items-center"
                >
                  <X className="w-4 h-4 mr-2" />
                  Abbrechen
                </button>
                <button
                  onClick={handleSave}
                  disabled={
                    loading ||
                    !formData.title.trim() ||
                    !formData.content.trim()
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
              </>
            ) : (
              <>
                <button onClick={onClose} className="btn-secondary">
                  Schließen
                </button>
                <button
                  onClick={handleEdit}
                  className="btn-primary flex items-center"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Bearbeiten
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default NoteModal;
