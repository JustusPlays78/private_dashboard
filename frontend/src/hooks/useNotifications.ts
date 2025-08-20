// frontend/src/hooks/useNotifications.ts
import { useEffect, useMemo, useState } from 'react';
import { tasksApi } from '../api/api';
import { secretsApi } from '../api/secretsApi';
import { Task, SecretMeta } from '../types';

export interface NotificationItem {
  id: string;
  type: 'task' | 'secret';
  title: string;
  due: string;
}

export function useNotifications() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [secrets, setSecrets] = useState<SecretMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [t, s] = await Promise.all([
          tasksApi.getAll(),
          secretsApi.getAll(),
        ]);
        if (!mounted) return;
        setTasks(t);
        setSecrets(s);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const notifications = useMemo<NotificationItem[]>(() => {
    const now = new Date();
    const n: NotificationItem[] = [];

    for (const t of tasks) {
      if (!t.completed && t.due_date && new Date(t.due_date) < now) {
        n.push({
          id: `task:${t.id}`,
          type: 'task',
          title: `Task: ${t.title}`,
          due: t.due_date,
        });
      }
    }
    for (const s of secrets) {
      if (s.due_date && new Date(s.due_date) < now) {
        n.push({
          id: `secret:${s.name}`,
          type: 'secret',
          title: `Secret: ${s.name}`,
          due: s.due_date,
        });
      }
    }
    // newest overdue first
    return n.sort(
      (a, b) => new Date(b.due).getTime() - new Date(a.due).getTime()
    );
  }, [tasks, secrets]);

  return {
    loading,
    notifications,
    unreadCount: notifications.length,
  };
}
