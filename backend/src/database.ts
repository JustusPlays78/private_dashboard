import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const dbPath = process.env.DB_PATH || path.join(__dirname, '../data/database.sqlite');
const dbDir = path.dirname(dbPath);

// Ensure data directory exists
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new sqlite3.Database(dbPath);

const ALG = 'aes-256-gcm';

function getMasterKey(): Buffer {
	const raw = process.env.SECRETS_MASTER_KEY || (process.env.NODE_ENV !== 'production' ? 'dev-only-insecure-key' : '');
	if (!raw) throw new Error('SECRETS_MASTER_KEY is required in production');
	return crypto.createHash('sha256').update(raw, 'utf8').digest(); // 32 bytes
}

function encrypt(plain: string) {
	const key = getMasterKey();
	const iv = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv(ALG, key, iv);
	const enc = Buffer.concat([cipher.update(Buffer.from(plain, 'utf8')), cipher.final()]);
	const tag = cipher.getAuthTag();
	return { enc, iv, tag };
}

function decrypt(enc: Buffer, iv: Buffer, tag: Buffer): string {
	const key = getMasterKey();
	const decipher = crypto.createDecipheriv(ALG, key, iv);
	decipher.setAuthTag(tag);
	const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
	return dec.toString('utf8');
}

function dbGet<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
	return new Promise((resolve, reject) => {
		db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row as T)));
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

export const initDatabase = () => {
    return new Promise<void>((resolve, reject) => {
        db.serialize(() => {
            // Notes table
            db.run(`
                CREATE TABLE IF NOT EXISTS notes (
                  id TEXT PRIMARY KEY,
                  title TEXT NOT NULL,
                  content TEXT NOT NULL,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Tasks table
            db.run(`
                CREATE TABLE IF NOT EXISTS tasks (
                  id TEXT PRIMARY KEY,
                  title TEXT NOT NULL,
                  description TEXT,
                  due_date DATETIME,
                  completed BOOLEAN DEFAULT FALSE,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Subtasks table
            db.run(`
                CREATE TABLE IF NOT EXISTS subtasks (
                  id TEXT PRIMARY KEY,
                  task_id TEXT NOT NULL,
                  title TEXT NOT NULL,
                  completed BOOLEAN DEFAULT FALSE,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                  FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE
                )
            `);

            // Scripts table
            db.run(`
                CREATE TABLE IF NOT EXISTS scripts (
                  id TEXT PRIMARY KEY,
                  name TEXT NOT NULL,
                  description TEXT,
                  content TEXT NOT NULL,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

           			// Script variables table
			db.run(`
				CREATE TABLE IF NOT EXISTS script_variables (
				  id TEXT PRIMARY KEY,
				  script_id TEXT NOT NULL,
				  name TEXT NOT NULL,
				  placeholder TEXT NOT NULL,
				  description TEXT,
				  default_value TEXT,
				  required BOOLEAN DEFAULT 0,
				  type TEXT DEFAULT 'text',
				  FOREIGN KEY (script_id) REFERENCES scripts (id) ON DELETE CASCADE
				)
			`);

			// Secrets table
			db.run(`
				CREATE TABLE IF NOT EXISTS secrets (
					name TEXT PRIMARY KEY,
					value BLOB NOT NULL,
					iv BLOB NOT NULL,
					tag BLOB NOT NULL,
					due_date DATETIME,
					created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
					updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
				)
			`);

			// ensure column due_date exists on older DBs
			db.run('ALTER TABLE secrets ADD COLUMN due_date DATETIME', (err) => {
				if (err && !/duplicate column name/i.test(String(err?.message))) {
					console.warn('ALTER TABLE secrets ADD COLUMN due_date failed:', err);
				}
			});

			// Script executions table (optional - for history)
			db.run(`
				CREATE TABLE IF NOT EXISTS script_executions (
					id TEXT PRIMARY KEY,
					script_id TEXT NOT NULL,
					variables_used TEXT,
					processed_content TEXT NOT NULL,
					executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
					FOREIGN KEY (script_id) REFERENCES scripts (id) ON DELETE CASCADE
					)
			`, (err) => {
                if (err) {
                    console.error('Database initialization error:', err);
                    reject(err);
                } else {
                    console.log('Database tables created successfully');
                    resolve();
                }
            });
        });
    });
};

export async function setSecret(name: string, value: string, dueDate?: string | null): Promise<void> {
	const { enc, iv, tag } = encrypt(value);
	await dbRun(
		`INSERT INTO secrets (name, value, iv, tag, due_date, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM secrets WHERE name = ?), CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)
		 ON CONFLICT(name) DO UPDATE SET value = excluded.value, iv = excluded.iv, tag = excluded.tag, due_date = excluded.due_date, updated_at = excluded.updated_at`,
		[name, enc, iv, tag, dueDate ?? null, name]
	);
}

export async function getSecret(name: string): Promise<string | undefined> {
	const row = await dbGet<{ value: Buffer; iv: Buffer; tag: Buffer }>(
		'SELECT value, iv, tag FROM secrets WHERE name = ?',
		[name]
	);
	if (!row) return undefined;
	return decrypt(row.value, row.iv, row.tag);
}

export async function requireSecret(name: string): Promise<string> {
	const v = await getSecret(name);
	if (!v) throw new Error(`Missing secret: ${name}`);
	return v;
}