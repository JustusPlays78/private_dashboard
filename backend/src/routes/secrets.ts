// backend/src/routes/secrets.ts
import express from 'express';
import { db, getSecret, setSecret } from '../database';

const router = express.Router();

function dbAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows as T[])));
    });
}

function dbRun(sql: string, params: any[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve();
        });
    });
}

// List only names and timestamps (no values)
router.get('/', async (req, res) => {
	try {
		const rows = await dbAll<{ name: string; created_at: string; updated_at: string; due_date?: string }>(
			'SELECT name, created_at, updated_at, due_date FROM secrets ORDER BY name'
		);
		res.json(rows);
	} catch (e) {
		console.error('Error listing secrets:', e);
		res.status(500).json({ error: 'Failed to list secrets' });
	}
});

// Get decrypted secret value
router.get('/:name', async (req, res) => {
	try {
		const meta = await dbAll<{ due_date?: string }>('SELECT due_date FROM secrets WHERE name = ?', [req.params.name]);
		const value = await getSecret(req.params.name);
		if (!value) return res.status(404).json({ error: 'Secret not found' });
		res.json({ name: req.params.name, value, due_date: meta[0]?.due_date ?? null });
	} catch (e) {
		console.error('Error getting secret:', e);
		res.status(500).json({ error: 'Failed to get secret' });
	}
});

// Create/Update secret
router.put('/:name', async (req, res) => {
	try {
		const { value, due_date } = req.body || {};
		if (typeof value !== 'string' || value.length === 0) {
			return res.status(400).json({ error: 'Body must contain non-empty "value"' });
		}
		await setSecret(req.params.name, value, due_date ?? null);
		res.status(204).send();
	} catch (e) {
		console.error('Error setting secret:', e);
		res.status(500).json({ error: 'Failed to set secret' });
	}
});

// Delete secret
router.delete('/:name', async (req, res) => {
    try {
        await dbRun('DELETE FROM secrets WHERE name = ?', [req.params.name]);
        res.status(204).send();
    } catch (e) {
        console.error('Error deleting secret:', e);
        res.status(500).json({ error: 'Failed to delete secret' });
    }
});

export default router;
