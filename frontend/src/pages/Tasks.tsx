import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, CheckSquare, Calendar } from 'lucide-react';
import { tasksApi } from '../api';
import { Task } from '../types';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import TaskModal from '../components/TaskModal';

const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const data = await tasksApi.getAll();
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = () => {
    setSelectedTask(null); // null = create mode
    setShowModal(true);
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task); // existing task = edit mode
    setShowModal(true);
  };

  const handleTaskCreated = (newTask: Task) => {
    setTasks([newTask, ...tasks]);
  };

  const handleTaskUpdated = () => {
    fetchTasks(); // Refresh the list
  };

  const handleToggleComplete = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await tasksApi.update(task.id, { completed: !task.completed });
      setTasks(
        tasks.map((t) =>
          t.id === task.id ? { ...t, completed: !t.completed } : t
        )
      );
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleQuickDelete = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Möchtest du diesen Task wirklich löschen?')) return;

    try {
      await tasksApi.delete(task.id);
      setTasks(tasks.filter((t) => t.id !== task.id));
    } catch (error) {
      console.error('Error deleting task:', error);
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

  const pendingTasks = tasks.filter((task) => !task.completed);
  const completedTasks = tasks.filter((task) => task.completed);

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">Tasks</h1>
          <p className="mt-2 text-secondary">
            Verwalte deine Aufgaben und To-Dos
          </p>
        </div>
        <button
          onClick={handleCreateTask}
          className="btn-primary flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Neuer Task
        </button>
      </div>

      {/* Tasks Lists */}
      <div className="space-y-8">
        {/* Pending Tasks */}
        <div>
          <h2 className="text-xl font-semibold text-primary mb-4">
            Offene Tasks ({pendingTasks.length})
          </h2>
          <div className="space-y-4">
            {pendingTasks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted mb-4">Keine offenen Tasks</p>
                <button
                  onClick={handleCreateTask}
                  className="btn-primary flex items-center mx-auto"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ersten Task erstellen
                </button>
              </div>
            ) : (
              pendingTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={() => handleEditTask(task)}
                  onToggleComplete={(e) => handleToggleComplete(task, e)}
                  onDelete={(e) => handleQuickDelete(task, e)}
                />
              ))
            )}
          </div>
        </div>

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-primary mb-4">
              Erledigte Tasks ({completedTasks.length})
            </h2>
            <div className="space-y-4">
              {completedTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={() => handleEditTask(task)}
                  onToggleComplete={(e) => handleToggleComplete(task, e)}
                  onDelete={(e) => handleQuickDelete(task, e)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Single Modal for Create & Edit */}
      <TaskModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        task={selectedTask}
        onTaskCreated={handleTaskCreated}
        onTaskUpdated={handleTaskUpdated}
      />
    </div>
  );
};

interface TaskCardProps {
  task: Task;
  onEdit: () => void;
  onToggleComplete: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onEdit,
  onToggleComplete,
  onDelete,
}) => {
  const isOverdue =
    task.due_date && new Date(task.due_date) < new Date() && !task.completed;

  return (
    <div
      className={`card card-hover p-6 cursor-pointer ${isOverdue ? 'border-l-4' : ''}`}
      style={isOverdue ? { borderLeftColor: 'var(--accent-red)' } : {}}
      onClick={onEdit}
    >
      <div className="flex items-start space-x-3">
        <button
          onClick={onToggleComplete}
          className={`flex-shrink-0 w-5 h-5 rounded border-2 mt-0.5 flex items-center justify-center transition-colors ${
            task.completed ? 'text-white' : 'hover:border-opacity-60'
          }`}
          style={{
            backgroundColor: task.completed
              ? 'var(--accent-green)'
              : 'transparent',
            borderColor: task.completed
              ? 'var(--accent-green)'
              : 'var(--border-secondary)',
          }}
        >
          {task.completed && <CheckSquare className="w-3 h-3" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3
                className={`text-lg font-medium ${
                  task.completed ? 'text-muted line-through' : 'text-primary'
                }`}
              >
                {task.title}
              </h3>
              {task.description && (
                <p
                  className={`text-sm mt-1 ${
                    task.completed ? 'text-muted' : 'text-secondary'
                  }`}
                >
                  {task.description}
                </p>
              )}
              {task.due_date && (
                <div
                  className={`flex items-center mt-2 text-sm ${
                    isOverdue
                      ? 'text-red-400'
                      : task.completed
                        ? 'text-muted'
                        : 'text-secondary'
                  }`}
                >
                  <Calendar className="w-4 h-4 mr-1" />
                  Fällig:{' '}
                  {format(new Date(task.due_date), 'dd.MM.yyyy HH:mm', {
                    locale: de,
                  })}
                  {isOverdue && (
                    <span
                      className="ml-2 font-medium"
                      style={{ color: 'var(--accent-red)' }}
                    >
                      (Überfällig)
                    </span>
                  )}
                </div>
              )}
              {task.subtasks && task.subtasks.length > 0 && (
                <p className="text-xs text-muted mt-2">
                  {task.subtasks.filter((st) => st.completed).length}/
                  {task.subtasks.length} Subtasks erledigt
                </p>
              )}
            </div>
            <div className="flex space-x-1 ml-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="p-1 text-muted hover:text-secondary transition-colors"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={onDelete}
                className="p-1 text-muted transition-colors"
                style={{ color: 'var(--accent-red)' }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = 'var(--accent-red-hover)')
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
      </div>
    </div>
  );
};

export default Tasks;
