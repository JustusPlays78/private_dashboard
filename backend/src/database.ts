import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DB_PATH || path.join(__dirname, '../data/database.sqlite');
const dbDir = path.dirname(dbPath);

// Ensure data directory exists
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new sqlite3.Database(dbPath);

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