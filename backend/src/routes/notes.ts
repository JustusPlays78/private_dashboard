import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database';
import { Note } from '../types';

const router = express.Router();

// Get all notes
router.get('/', (req, res) => {
    db.all('SELECT * FROM notes ORDER BY updated_at DESC', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Create note
router.post('/', (req, res) => {
    const { title, content } = req.body;
    const id = uuidv4();
    const now = new Date().toISOString();

    db.run(
        'INSERT INTO notes (id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [id, title, content, now, now],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ id, title, content, created_at: now, updated_at: now });
        }
    );
});

// Update note
router.put('/:id', (req, res) => {
    const { title, content } = req.body;
    const now = new Date().toISOString();

    db.run(
        'UPDATE notes SET title = ?, content = ?, updated_at = ? WHERE id = ?',
        [title, content, now, req.params.id],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            if (this.changes === 0) {
                res.status(404).json({ error: 'Note not found' });
                return;
            }
            res.json({ id: req.params.id, title, content, updated_at: now });
        }
    );
});

// Delete note
router.delete('/:id', (req, res) => {
    db.run('DELETE FROM notes WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Note not found' });
            return;
        }
        res.json({ message: 'Note deleted' });
    });
});

export default router;