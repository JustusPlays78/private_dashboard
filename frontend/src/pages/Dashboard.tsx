import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, CheckSquare, Plus, Calendar, Edit, Clock } from 'lucide-react';
import { notesApi, tasksApi } from '../api';
import { Note, Task } from '../types';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import TaskModal from '../components/TaskModal';
import NoteModal from '../components/NoteModal';

const Dashboard: React.FC = () => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Modal states
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);

    // Update time every second
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [notesData, tasksData] = await Promise.all([
                notesApi.getAll(),
                tasksApi.getAll(),
            ]);
            setNotes(notesData.slice(0, 5));
            setTasks(tasksData.slice(0, 5));
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTaskClick = (task: Task) => {
        setSelectedTask(task);
        setIsTaskModalOpen(true);
    };

    const handleNoteClick = (note: Note) => {
        setSelectedNote(note);
        setIsNoteModalOpen(true);
    };

    const handleTaskUpdated = () => {
        fetchData();
    };

    const handleNoteUpdated = () => {
        fetchData();
    };

    const handleNoteDeleted = () => {
        fetchData();
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

    const upcomingTasks = tasks.filter(task =>
        !task.completed && task.due_date && new Date(task.due_date) > new Date()
    );

    const overdueTasks = tasks.filter(task =>
        !task.completed && task.due_date && new Date(task.due_date) < new Date()
    );

    const getGreeting = () => {
        const hour = currentTime.getHours();
        if (hour < 12) return 'Guten Morgen';
        if (hour < 18) return 'Guten Tag';
        return 'Guten Abend';
    };

    return (
        <div className="px-4 py-6 sm:px-0">
            {/* Header with Date/Time */}
            <div className="mb-8">
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-primary">{getGreeting()}!</h1>
                        <p className="mt-2 text-secondary">Übersicht über deine Notizen und Tasks</p>
                    </div>

                    {/* Date and Time Display - Minimalistisch */}
                    <div className="mt-4 lg:mt-0">
                        <div className="flex items-center space-x-4 text-primary">
                            <div className="flex items-center space-x-2">
                                <Calendar className="w-5 h-5 text-muted" />
                                <div>
                                    <div className="text-lg font-semibold">
                                        {format(currentTime, 'EEEE, dd. MMMM yyyy', { locale: de })}
                                    </div>
                                </div>
                            </div>
                            <div className="hidden sm:block w-px h-8" style={{ backgroundColor: 'var(--border-accent)' }}></div>
                            <div className="flex items-center space-x-2">
                                <Clock className="w-5 h-5 text-muted" />
                                <div>
                                    <div className="text-xl font-mono font-bold">
                                        {format(currentTime, 'HH:mm:ss')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="card overflow-hidden">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <FileText className="h-6 w-6" style={{ color: 'var(--accent-blue)' }} />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-muted truncate">
                                        Notizen
                                    </dt>
                                    <dd className="text-lg font-medium text-primary">
                                        {notes.length}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card overflow-hidden">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <CheckSquare className="h-6 w-6" style={{ color: 'var(--accent-green)' }} />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-muted truncate">
                                        Offene Tasks
                                    </dt>
                                    <dd className="text-lg font-medium text-primary">
                                        {tasks.filter(task => !task.completed).length}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card overflow-hidden">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <Calendar className="h-6 w-6" style={{ color: 'var(--accent-yellow)' }} />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-muted truncate">
                                        Anstehend
                                    </dt>
                                    <dd className="text-lg font-medium text-primary">
                                        {upcomingTasks.length}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card overflow-hidden">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <Calendar className="h-6 w-6" style={{ color: 'var(--accent-red)' }} />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-muted truncate">
                                        Überfällig
                                    </dt>
                                    <dd className="text-lg font-medium text-primary">
                                        {overdueTasks.length}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Notes */}
                <div className="card">
                    <div className="px-4 py-5 sm:p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg leading-6 font-medium text-primary">
                                Aktuelle Notizen
                            </h3>
                            <Link
                                to="/notes"
                                className="text-sm transition-colors"
                                style={{ color: 'var(--accent-blue)' }}
                                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-blue-light)'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--accent-blue)'}
                            >
                                Alle anzeigen
                            </Link>
                        </div>
                        <div className="space-y-3">
                            {notes.length === 0 ? (
                                <p className="text-muted text-sm">Keine Notizen vorhanden</p>
                            ) : (
                                notes.map((note) => (
                                    <div
                                        key={note.id}
                                        className="border-l-4 pl-4 cursor-pointer card-hover p-2 rounded-r transition-colors"
                                        style={{ borderColor: 'var(--accent-blue)' }}
                                        onClick={() => handleNoteClick(note)}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <h4 className="text-sm font-medium text-primary hover:text-secondary transition-colors">
                                                    {note.title}
                                                </h4>
                                                <p className="text-xs text-muted mt-1">
                                                    {format(new Date(note.updated_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                                                </p>
                                            </div>
                                            <Edit
                                                className="w-4 h-4 text-muted transition-colors"
                                                style={{ color: 'var(--text-muted)' }}
                                                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-blue)'}
                                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                                            />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="mt-4">
                            <Link
                                to="/notes"
                                className="btn-primary inline-flex items-center text-sm leading-4 font-medium"
                            >
                                <Plus className="w-4 h-4 mr-1" />
                                Neue Notiz
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Recent Tasks */}
                <div className="card">
                    <div className="px-4 py-5 sm:p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg leading-6 font-medium text-primary">
                                Aktuelle Tasks
                            </h3>
                            <Link
                                to="/tasks"
                                className="text-sm transition-colors"
                                style={{ color: 'var(--accent-blue)' }}
                                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-blue-light)'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--accent-blue)'}
                            >
                                Alle anzeigen
                            </Link>
                        </div>
                        <div className="space-y-3">
                            {tasks.length === 0 ? (
                                <p className="text-muted text-sm">Keine Tasks vorhanden</p>
                            ) : (
                                tasks.map((task) => (
                                    <div
                                        key={task.id}
                                        className="flex items-start space-x-3 cursor-pointer card-hover p-2 rounded transition-colors"
                                        onClick={() => handleTaskClick(task)}
                                    >
                                        <div
                                            className={`flex-shrink-0 w-4 h-4 rounded border-2 mt-0.5 ${
                                                task.completed ? '' : 'border-opacity-60'
                                            }`}
                                            style={{
                                                backgroundColor: task.completed ? 'var(--accent-green)' : 'transparent',
                                                borderColor: task.completed ? 'var(--accent-green)' : 'var(--border-secondary)'
                                            }}
                                        >
                                            {task.completed && (
                                                <CheckSquare className="w-3 h-3 text-white" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <h4 className={`text-sm font-medium transition-colors ${
                                                        task.completed ? 'text-muted line-through' : 'text-primary hover:text-secondary'
                                                    }`}>
                                                        {task.title}
                                                    </h4>
                                                    {task.due_date && (
                                                        <p className={`text-xs mt-1 ${
                                                            new Date(task.due_date) < new Date() && !task.completed
                                                                ? 'text-red-400'
                                                                : 'text-muted'
                                                        }`}>
                                                            Fällig: {format(new Date(task.due_date), 'dd.MM.yyyy', { locale: de })}
                                                        </p>
                                                    )}
                                                    {task.subtasks && task.subtasks.length > 0 && (
                                                        <p className="text-xs text-muted mt-1">
                                                            {task.subtasks.filter(st => st.completed).length}/{task.subtasks.length} Subtasks
                                                        </p>
                                                    )}
                                                </div>
                                                <Edit
                                                    className="w-4 h-4 text-muted transition-colors"
                                                    style={{ color: 'var(--text-muted)' }}
                                                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-blue)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="mt-4">
                            <Link
                                to="/tasks"
                                className="btn-primary inline-flex items-center text-sm leading-4 font-medium"
                            >
                                <Plus className="w-4 h-4 mr-1" />
                                Neuer Task
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <TaskModal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                task={selectedTask}
                onTaskUpdated={handleTaskUpdated}
            />

            <NoteModal
                isOpen={isNoteModalOpen}
                onClose={() => setIsNoteModalOpen(false)}
                note={selectedNote}
                onNoteUpdated={handleNoteUpdated}
                onNoteDeleted={handleNoteDeleted}
            />
        </div>
    );
};

export default Dashboard;