import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database';
import { Task, Subtask } from '../types';

const router = express.Router();
// Get all tasks
router.get('/', (req, res) => {
    db.all('SELECT * FROM tasks ORDER BY updated_at DESC', (err, tasks: any[]) => {
        if (err) {
            console.error('Error fetching tasks:', err);
            return res.status(500).json({ error: 'Failed to fetch tasks' });
        }

        if (tasks.length === 0) {
            return res.json([]);
        }

        // Get subtasks for each task
        let completed = 0;
        const tasksWithSubtasks: Task[] = [];

        tasks.forEach((task, index) => {
            db.all(
                'SELECT * FROM subtasks WHERE task_id = ? ORDER BY created_at',
                [task.id],
                (err, subtasks: any[]) => {
                    if (err) {
                        console.error('Error fetching subtasks:', err);
                        return res.status(500).json({ error: 'Failed to fetch subtasks' });
                    }

                    // Normalisiere Boolean-Werte
                    const normalizedSubtasks = subtasks.map(subtask => ({
                        id: subtask.id,
                        task_id: subtask.task_id,
                        title: subtask.title,
                        completed: Boolean(subtask.completed), // Boolean-Konvertierung
                        created_at: subtask.created_at
                    }));

                    tasksWithSubtasks[index] = {
                        id: task.id,
                        title: task.title,
                        description: task.description,
                        due_date: task.due_date,
                        completed: Boolean(task.completed), // Boolean-Konvertierung
                        created_at: task.created_at,
                        updated_at: task.updated_at,
                        subtasks: normalizedSubtasks
                    };
                    completed++;

                    if (completed === tasks.length) {
                        res.json(tasksWithSubtasks);
                    }
                }
            );
        });
    });
});

// Get single task
router.get('/:id', (req, res) => {
    db.get('SELECT * FROM tasks WHERE id = ?', [req.params.id], (err, task: any) => {
        if (err) {
            console.error('Error fetching task:', err);
            return res.status(500).json({ error: 'Failed to fetch task' });
        }

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        db.all('SELECT * FROM subtasks WHERE task_id = ? ORDER BY created_at', [task.id], (err, subtasks: any[]) => {
            if (err) {
                console.error('Error fetching subtasks:', err);
                return res.status(500).json({ error: 'Failed to fetch subtasks' });
            }

            const normalizedSubtasks = subtasks.map(subtask => ({
                id: subtask.id,
                task_id: subtask.task_id,
                title: subtask.title,
                completed: Boolean(subtask.completed), // Boolean-Konvertierung
                created_at: subtask.created_at
            }));

            res.json({
                id: task.id,
                title: task.title,
                description: task.description,
                due_date: task.due_date,
                completed: Boolean(task.completed), // Boolean-Konvertierung
                created_at: task.created_at,
                updated_at: task.updated_at,
                subtasks: normalizedSubtasks
            });
        });
    });
});

// Create task
router.post('/', (req, res) => {
    const { title, description, due_date } = req.body;

    if (!title || title.trim() === '') {
        return res.status(400).json({ error: 'Title is required' });
    }

    const taskId = uuidv4();
    const now = new Date().toISOString();

    db.run(
        'INSERT INTO tasks (id, title, description, due_date, completed, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?)',
        [taskId, title.trim(), description?.trim() || null, due_date || null, now, now],
        function(err) {
            if (err) {
                console.error('Error creating task:', err);
                return res.status(500).json({ error: 'Failed to create task' });
            }

            // Return created task with empty subtasks
            db.get('SELECT * FROM tasks WHERE id = ?', [taskId], (err, task: any) => {
                if (err) {
                    console.error('Error fetching created task:', err);
                    return res.status(500).json({ error: 'Failed to fetch created task' });
                }

                res.status(201).json({
                    id: task.id,
                    title: task.title,
                    description: task.description,
                    due_date: task.due_date,
                    completed: Boolean(task.completed), // Boolean-Konvertierung
                    created_at: task.created_at,
                    updated_at: task.updated_at,
                    subtasks: []
                });
            });
        }
    );
});

// Update task
router.put('/:id', (req, res) => {
    const { title, description, due_date, completed } = req.body;

    if (title !== undefined && (!title || title.trim() === '')) {
        return res.status(400).json({ error: 'Title cannot be empty' });
    }

    const now = new Date().toISOString();

    // Build dynamic update query
    const updates = [];
    const values = [];

    if (title !== undefined) {
        updates.push('title = ?');
        values.push(title.trim());
    }
    if (description !== undefined) {
        updates.push('description = ?');
        values.push(description?.trim() || null);
    }
    if (due_date !== undefined) {
        updates.push('due_date = ?');
        values.push(due_date || null);
    }
    if (completed !== undefined) {
        updates.push('completed = ?');
        values.push(completed ? 1 : 0);
    }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(req.params.id);

    db.run(
        `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`,
        values,
        function(err) {
            if (err) {
                console.error('Error updating task:', err);
                return res.status(500).json({ error: 'Failed to update task' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ error: 'Task not found' });
            }

            // Return updated task with subtasks
            db.get('SELECT * FROM tasks WHERE id = ?', [req.params.id], (err, task: any) => {
                if (err) {
                    console.error('Error fetching updated task:', err);
                    return res.status(500).json({ error: 'Failed to fetch updated task' });
                }

                db.all('SELECT * FROM subtasks WHERE task_id = ? ORDER BY created_at', [req.params.id], (err, subtasks: any[]) => {
                    if (err) {
                        console.error('Error fetching subtasks:', err);
                        return res.status(500).json({ error: 'Failed to fetch subtasks' });
                    }

                    const normalizedSubtasks = subtasks.map(subtask => ({
                        id: subtask.id,
                        task_id: subtask.task_id,
                        title: subtask.title,
                        completed: Boolean(subtask.completed), // Boolean-Konvertierung
                        created_at: subtask.created_at
                    }));

                    res.json({
                        id: task.id,
                        title: task.title,
                        description: task.description,
                        due_date: task.due_date,
                        completed: Boolean(task.completed), // Boolean-Konvertierung
                        created_at: task.created_at,
                        updated_at: task.updated_at,
                        subtasks: normalizedSubtasks
                    });
                });
            });
        }
    );
});

// Delete task
router.delete('/:id', (req, res) => {
    db.run('DELETE FROM tasks WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Task not found' });
            return;
        }
        res.json({ message: 'Task deleted' });
    });
});

// Add subtask
router.post('/:id/subtasks', (req, res) => {
    const { title } = req.body;
    const subtaskId = uuidv4();
    const now = new Date().toISOString();

    db.run(
        'INSERT INTO subtasks (id, task_id, title, created_at) VALUES (?, ?, ?, ?)',
        [subtaskId, req.params.id, title, now],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({
                id: subtaskId,
                task_id: req.params.id,
                title,
                completed: false,
                created_at: now
            });
        }
    );
});

// Update subtask
router.put('/:taskId/subtasks/:subtaskId', (req, res) => {
    const { title, completed } = req.body;

    console.log('Update subtask route hit:', {
        taskId: req.params.taskId,
        subtaskId: req.params.subtaskId,
        body: req.body
    }); // Debug

    // Build dynamic update query
    const updates = [];
    const values = [];

    if (title !== undefined) {
        updates.push('title = ?');
        values.push(title);
    }
    if (completed !== undefined) {
        updates.push('completed = ?');
        values.push(completed ? 1 : 0);
    }

    if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(req.params.subtaskId);
    values.push(req.params.taskId); // WICHTIG: taskId, nicht id

    db.run(
        `UPDATE subtasks SET ${updates.join(', ')} WHERE id = ? AND task_id = ?`,
        values,
        function(err) {
            if (err) {
                console.error('Error updating subtask:', err);
                return res.status(500).json({ error: 'Failed to update subtask' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ error: 'Subtask not found' });
            }

            // Return updated subtask
            db.get('SELECT * FROM subtasks WHERE id = ?', [req.params.subtaskId], (err, subtask: any) => {
                if (err) {
                    console.error('Error fetching updated subtask:', err);
                    return res.status(500).json({ error: 'Failed to fetch updated subtask' });
                }

                res.json({
                    id: subtask.id,
                    task_id: subtask.task_id,
                    title: subtask.title,
                    completed: subtask.completed,
                    created_at: subtask.created_at
                });
            });
        }
    );
});

// Delete subtask - KORRIGIERTE ROUTE PARAMETER
router.delete('/:taskId/subtasks/:subtaskId', (req, res) => {
    console.log('Delete subtask route hit:', {
        taskId: req.params.taskId,
        subtaskId: req.params.subtaskId
    }); // Debug

    db.run(
        'DELETE FROM subtasks WHERE id = ? AND task_id = ?',
        [req.params.subtaskId, req.params.taskId], // WICHTIG: taskId, nicht id
        function(err) {
            if (err) {
                console.error('Error deleting subtask:', err);
                return res.status(500).json({ error: 'Failed to delete subtask' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ error: 'Subtask not found' });
            }

            res.status(204).send();
        }
    );
});

// Add subtask - KORRIGIERTE ROUTE PARAMETER
router.post('/:taskId/subtasks', (req, res) => {
    const { title } = req.body;

    console.log('Add subtask route hit:', {
        taskId: req.params.taskId,
        title: title
    }); // Debug

    if (!title || title.trim() === '') {
        return res.status(400).json({ error: 'Subtask title is required' });
    }

    const subtaskId = uuidv4();
    const now = new Date().toISOString();

    // First check if task exists
    db.get('SELECT id FROM tasks WHERE id = ?', [req.params.taskId], (err, task: any) => {
        if (err) {
            console.error('Error checking task:', err);
            return res.status(500).json({ error: 'Failed to check task' });
        }

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        db.run(
            'INSERT INTO subtasks (id, task_id, title, completed, created_at) VALUES (?, ?, ?, 0, ?)',
            [subtaskId, req.params.taskId, title.trim(), now], // WICHTIG: taskId, nicht id
            function(err) {
                if (err) {
                    console.error('Error creating subtask:', err);
                    return res.status(500).json({ error: 'Failed to create subtask' });
                }

                db.get('SELECT * FROM subtasks WHERE id = ?', [subtaskId], (err, subtask: any) => {
                    if (err) {
                        console.error('Error fetching created subtask:', err);
                        return res.status(500).json({ error: 'Failed to fetch created subtask' });
                    }

                    res.status(201).json({
                        id: subtask.id,
                        task_id: subtask.task_id,
                        title: subtask.title,
                        completed: subtask.completed,
                        created_at: subtask.created_at
                    });
                });
            }
        );
    });
});
export default router;