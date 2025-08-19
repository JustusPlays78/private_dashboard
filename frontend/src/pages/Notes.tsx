import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { notesApi } from '../api';
import { Note } from '../types';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import NoteModal from '../components/NoteModal';

const Notes: React.FC = () => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);

    useEffect(() => {
        fetchNotes();
    }, []);

    const fetchNotes = async () => {
        try {
            const data = await notesApi.getAll();
            // Sortiere nach Änderungsdatum (neueste zuerst)
            const sortedNotes = data.sort((a, b) =>
                new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            );
            setNotes(sortedNotes);
        } catch (error) {
            console.error('Error fetching notes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateNote = () => {
        setSelectedNote(null); // null = create mode
        setShowModal(true);
    };

    const handleEditNote = (note: Note) => {
        setSelectedNote(note); // existing note = edit mode
        setShowModal(true);
    };

    const handleNoteCreated = (newNote: Note) => {
        // Füge neue Notiz am Anfang hinzu (neueste zuerst)
        setNotes([newNote, ...notes]);
    };

    const handleNoteUpdated = () => {
        fetchNotes(); // Refresh the list mit neuer Sortierung
    };

    const handleNoteDeleted = () => {
        fetchNotes(); // Refresh the list
    };

    const handleQuickDelete = async (note: Note, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Möchtest du diese Notiz wirklich löschen?')) return;

        try {
            await notesApi.delete(note.id);
            setNotes(notes.filter(n => n.id !== note.id));
        } catch (error) {
            console.error('Error deleting note:', error);
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
                    <h1 className="text-3xl font-bold text-primary">Notizen</h1>
                    <p className="mt-2 text-secondary">Verwalte deine persönlichen Notizen</p>
                </div>
                <button
                    onClick={handleCreateNote}
                    className="btn-primary flex items-center"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Neue Notiz
                </button>
            </div>

            {/* Notes List */}
            <div className="space-y-3">
                {notes.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-muted mb-4">Noch keine Notizen vorhanden</p>
                        <button
                            onClick={handleCreateNote}
                            className="btn-primary flex items-center mx-auto"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Erste Notiz erstellen
                        </button>
                    </div>
                ) : (
                    notes.map((note) => (
                        <div
                            key={note.id}
                            className="card card-hover p-4 cursor-pointer"
                            onClick={() => handleEditNote(note)}
                        >
                            <div className="flex justify-between items-center">
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-medium text-primary truncate">
                                        {note.title}
                                    </h3>
                                    <p className="text-sm text-muted mt-1">
                                        Zuletzt bearbeitet: {format(new Date(note.updated_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                                    </p>
                                </div>
                                <div className="flex space-x-2 ml-4 flex-shrink-0">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditNote(note);
                                        }}
                                        className="p-2 text-muted hover:text-secondary transition-colors rounded-md hover:bg-opacity-10"
                                        style={{ backgroundColor: 'transparent' }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(e) => handleQuickDelete(note, e)}
                                        className="p-2 text-muted transition-colors rounded-md hover:bg-opacity-10"
                                        style={{ color: 'var(--accent-red)', backgroundColor: 'transparent' }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.color = 'var(--accent-red-hover)';
                                            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
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
                    ))
                )}
            </div>

            {/* Single Modal for Create & Edit */}
            <NoteModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                note={selectedNote}
                onNoteCreated={handleNoteCreated}
                onNoteUpdated={handleNoteUpdated}
                onNoteDeleted={handleNoteDeleted}
            />
        </div>
    );
};

export default Notes;