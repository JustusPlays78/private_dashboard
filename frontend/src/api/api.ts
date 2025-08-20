import {
  Note,
  Task,
  Subtask,
} from '../types';

// @ts-ignore
const API_URL = !import.meta.env.PROD ? 'http://localhost:3001/api' : '/api';

// Notes API
export const notesApi = {
  getAll: async (): Promise<Note[]> => {
    const response = await fetch(`${API_URL}/notes`);
    return response.json();
  },

  create: async (
    note: Omit<Note, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Note> => {
    const response = await fetch(`${API_URL}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note),
    });
    return response.json();
  },

  update: async (id: string, note: Partial<Note>): Promise<Note> => {
    const response = await fetch(`${API_URL}/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note),
    });
    return response.json();
  },

  delete: async (id: string): Promise<void> => {
    await fetch(`${API_URL}/notes/${id}`, {
      method: 'DELETE',
    });
  },
};

// Tasks API
export const tasksApi = {
  getAll: async (): Promise<Task[]> => {
    const response = await fetch(`${API_URL}/tasks`);
    return response.json();
  },

  create: async (
    task: Omit<
      Task,
      'id' | 'created_at' | 'updated_at' | 'completed' | 'subtasks'
    >
  ): Promise<Task> => {
    const response = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    return response.json();
  },

  update: async (id: string, task: Partial<Task>): Promise<void> => {
    await fetch(`${API_URL}/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
  },

  delete: async (id: string): Promise<void> => {
    await fetch(`${API_URL}/tasks/${id}`, {
      method: 'DELETE',
    });
  },

  addSubtask: async (taskId: string, title: string): Promise<Subtask> => {
    const response = await fetch(`${API_URL}/tasks/${taskId}/subtasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    return response.json();
  },

  updateSubtask: async (
    taskId: string,
    subtaskId: string,
    updates: { completed?: boolean; title?: string }
  ): Promise<Subtask> => {
    console.log('API - Updating subtask:', { taskId, subtaskId, updates }); // Debug

    const response = await fetch(
      `${API_URL}/tasks/${taskId}/subtasks/${subtaskId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('API - Subtask update error:', errorData); // Debug
      throw new Error(errorData.error || 'Failed to update subtask');
    }

    const data = await response.json();
    console.log('API - Updated subtask:', data); // Debug
    return data;
  },

  deleteSubtask: async (taskId: string, subtaskId: string): Promise<void> => {
    await fetch(`${API_URL}/tasks/${taskId}/subtasks/${subtaskId}`, {
      method: 'DELETE',
    });
  },
};

