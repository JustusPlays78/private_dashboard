import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, CheckSquare, Calendar, X } from 'lucide-react';
import Modal from './Modal';
import { Task, Subtask } from '../types';
import { tasksApi } from '../api';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface TaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: Task | null; // null = Create Mode, Task = Edit Mode
    onTaskUpdated: () => void;
    onTaskCreated?: (task: Task) => void; // Optional für Create Mode
}

const TaskModal: React.FC<TaskModalProps> = ({
                                                 isOpen,
                                                 onClose,
                                                 task,
                                                 onTaskUpdated,
                                                 onTaskCreated
                                             }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        due_date: '',
        completed: false
    });
    const [subtasks, setSubtasks] = useState<Subtask[]>([]);
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
    const [showSubtaskForm, setShowSubtaskForm] = useState(false);
    const [loading, setLoading] = useState(false);

    // Determine if we're in create mode
    const isCreateMode = task === null;

    useEffect(() => {
        if (task) {
            setFormData({
                title: task.title,
                description: task.description || '',
                due_date: task.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : '',
                completed: Boolean(task.completed)
            });
            setSubtasks(task.subtasks || []);
        } else {
            setFormData({
                title: '',
                description: '',
                due_date: '',
                completed: false
            });
            setSubtasks([]);
        }
        setShowSubtaskForm(false);
        setNewSubtaskTitle('');
    }, [task, isOpen]);

    const handleSave = async () => {
        if (!formData.title.trim()) return;

        setLoading(true);
        try {
            if (isCreateMode) {
                // Create new task
                const newTask = await tasksApi.create({
                    title: formData.title,
                    description: formData.description || undefined,
                    due_date: formData.due_date || undefined,
                });
                if (onTaskCreated) {
                    onTaskCreated(newTask);
                }
                onTaskUpdated(); // Refresh the list
                setFormData({ title: '', description: '', due_date: '', completed: false });
                onClose();
            } else if (task) {
                // Update existing task
                const updatedTask = await tasksApi.update(task.id, {
                    title: formData.title,
                    description: formData.description || undefined,
                    due_date: formData.due_date || undefined,
                    completed: formData.completed
                });
                onTaskUpdated();
                onClose();
            }
        } catch (error) {
            console.error('Error saving task:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!task || !confirm('Möchtest du diesen Task wirklich löschen?')) return;

        setLoading(true);
        try {
            await tasksApi.delete(task.id);
            onTaskUpdated();
            onClose();
        } catch (error) {
            console.error('Error deleting task:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleComplete = async () => {
        if (!task) return;

        const newCompleted = !formData.completed;
        setFormData(prev => ({ ...prev, completed: newCompleted }));

        try {
            await tasksApi.update(task.id, { completed: newCompleted });
            onTaskUpdated();
        } catch (error) {
            console.error('Error updating task:', error);
        }
    };

    const handleAddSubtask = async () => {
        if (!task || !newSubtaskTitle.trim()) return;

        try {
            const newSubtask = await tasksApi.addSubtask(task.id, newSubtaskTitle);
            console.log('TaskModal - Added subtask:', newSubtask); // Debug
            setSubtasks(prev => [...prev, newSubtask]);
            setNewSubtaskTitle('');
            setShowSubtaskForm(false);
            onTaskUpdated();
        } catch (error) {
            console.error('Error adding subtask:', error);
        }
    };

    const handleToggleSubtask = async (subtask: Subtask) => {
        if (!task) return;

        console.log('TaskModal - Toggling subtask:', subtask); // Debug

        try {
            const updatedSubtask = await tasksApi.updateSubtask(task.id, subtask.id, {
                completed: !subtask.completed
            });

            setSubtasks(prev =>
                prev.map(st =>
                    st.id === subtask.id ? { ...st, completed: !st.completed } : st
                )
            );
            onTaskUpdated();
        } catch (error) {
            console.error('Error updating subtask:', error);
        }
    };

    const handleDeleteSubtask = async (subtaskId: string) => {
        if (!task) return;

        try {
            await tasksApi.deleteSubtask(task.id, subtaskId);
            setSubtasks(prev => prev.filter(st => st.id !== subtaskId));
            onTaskUpdated();
        } catch (error) {
            console.error('Error deleting subtask:', error);
        }
    };

    const handleCancel = () => {
        if (isCreateMode) {
            setFormData({ title: '', description: '', due_date: '', completed: false });
        } else if (task) {
            setFormData({
                title: task.title,
                description: task.description || '',
                due_date: task.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : '',
                completed: task.completed
            });
            setSubtasks(task.subtasks || []);
        }
        setShowSubtaskForm(false);
        setNewSubtaskTitle('');
        onClose();
    };

    const getModalTitle = () => {
        return isCreateMode ? "Neuen Task erstellen" : "Task bearbeiten";
    };

    const isOverdue = task?.due_date && new Date(task.due_date) < new Date() && !task.completed;

    return (
        <Modal isOpen={isOpen} onClose={handleCancel} title={getModalTitle()} size="lg">
            <div className="space-y-6">
                {/* Task Status - only for existing tasks */}
                {!isCreateMode && task && (
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={handleToggleComplete}
                            className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                                formData.completed ? 'text-white' : 'hover:border-opacity-60'
                            }`}
                            style={{
                                backgroundColor: formData.completed ? 'var(--accent-green)' : 'transparent',
                                borderColor: formData.completed ? 'var(--accent-green)' : 'var(--border-secondary)'
                            }}
                        >
                            {formData.completed && <CheckSquare className="w-4 h-4" />}
                        </button>
                        <span className={`text-lg font-medium transition-colors ${
                            formData.completed ? 'text-muted line-through' : 'text-primary'
                        }`}>
                            {formData.completed ? 'Erledigt' : 'Offen'}
                        </span>
                    </div>
                )}

                {/* Title */}
                <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                        Titel
                    </label>
                    <input
                        id="task-title-input"
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        className="input-field w-full"
                        placeholder="Task Titel"
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                        Beschreibung
                    </label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                        className="input-field w-full"
                        placeholder="Beschreibung (optional)"
                    />
                </div>

                {/* Due Date */}
                <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                        Fälligkeitsdatum
                    </label>
                    <div className="flex items-center space-x-2">
                        <Calendar className="w-5 h-5 text-muted" />
                        <input
                            type="datetime-local"
                            value={formData.due_date}
                            onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                            className="input-field flex-1"
                        />
                    </div>
                    {isOverdue && (
                        <p className="mt-1 text-sm" style={{ color: 'var(--accent-red)' }}>
                            Dieser Task ist überfällig!
                        </p>
                    )}
                </div>

                {/* Subtasks - für alle Tasks anzeigen, aber nur bearbeitbar für bestehende */}
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <label className="block text-sm font-medium text-secondary">
                            Subtasks ({subtasks.length})
                            {isCreateMode && <span className="text-xs text-muted ml-2">(nach Erstellung verfügbar)</span>}
                        </label>
                        {!isCreateMode && task && (
                            <button
                                onClick={() => setShowSubtaskForm(true)}
                                className="text-sm transition-colors flex items-center"
                                style={{ color: 'var(--accent-blue)' }}
                                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-blue-light)'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--accent-blue)'}
                            >
                                <Plus className="w-4 h-4 mr-1" />
                                Hinzufügen
                            </button>
                        )}
                    </div>

                    {/* Subtask Form - nur für bestehende Tasks */}
                    {!isCreateMode && showSubtaskForm && (
                        <div className="mb-3 flex space-x-2">
                            <input
                                type="text"
                                value={newSubtaskTitle}
                                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                placeholder="Subtask Titel"
                                className="input-field flex-1"
                                onKeyPress={(e) => e.key === 'Enter' && handleAddSubtask()}
                            />
                            <button
                                onClick={handleAddSubtask}
                                className="btn-primary px-3 py-2"
                            >
                                <Save className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => {
                                    setShowSubtaskForm(false);
                                    setNewSubtaskTitle('');
                                }}
                                className="btn-secondary px-3 py-2"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* Subtasks List */}
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                        {subtasks.length === 0 ? (
                            <div className="text-center py-4 text-muted text-sm">
                                {isCreateMode
                                    ? "Subtasks können nach der Erstellung hinzugefügt werden"
                                    : "Noch keine Subtasks vorhanden"
                                }
                            </div>
                        ) : (
                            subtasks.map((subtask) => (
                                <div
                                    key={subtask.id}
                                    className="flex items-center space-x-2 p-2 rounded border border-accent"
                                    style={{ backgroundColor: 'var(--bg-tertiary)' }}
                                >
                                    <button
                                        onClick={() => handleToggleSubtask(subtask)}
                                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                            subtask.completed ? 'text-white' : ''
                                        }`}
                                        style={{
                                            backgroundColor: subtask.completed ? 'var(--accent-green)' : 'transparent',
                                            borderColor: subtask.completed ? 'var(--accent-green)' : 'var(--border-secondary)'
                                        }}
                                    >
                                        {subtask.completed && <CheckSquare className="w-2 h-2" />}
                                    </button>
                                    <span className={`flex-1 text-sm transition-colors ${
                                        subtask.completed ? 'text-muted line-through' : 'text-secondary'
                                    }`}>
                                        {subtask.title}
                                    </span>
                                    <button
                                        onClick={() => handleDeleteSubtask(subtask.id)}
                                        className="p-1 text-muted transition-colors"
                                        style={{ color: 'var(--accent-red)' }}
                                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-red-hover)'}
                                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--accent-red)'}
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Task Info - only for existing tasks */}
                {!isCreateMode && task && (
                    <div className="text-xs text-muted border-t border-accent pt-4">
                        <p>Erstellt: {format(new Date(task.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}</p>
                        <p>Zuletzt bearbeitet: {format(new Date(task.updated_at), 'dd.MM.yyyy HH:mm', { locale: de })}</p>
                    </div>
                )}

                {/* Actions */}
                <div className={`flex ${!isCreateMode ? 'justify-between' : 'justify-end'} border-t border-accent pt-4`}>
                    {/* Löschen-Button nur für bestehende Tasks */}
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
                        <button
                            onClick={handleCancel}
                            className="btn-secondary"
                        >
                            Abbrechen
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading || !formData.title.trim()}
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

export default TaskModal;