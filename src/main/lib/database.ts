import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'
import * as cryptoLib from './crypto'

export interface GitLabConfig {
  baseUrl: string
  token: string
}

export interface GitLabProject {
  id: number
  projectId: number
  name: string
  pathWithNamespace: string
  httpUrl: string
  defaultBranch: string
  localPath: string
  instanceUrl: string | null
  clonedAt: string
  lastPull: string | null
}

export interface TerraformDeployment {
  id: number
  projectId: number
  projectName: string
  action: string
  stateName: string
  varFile: string | null
  status: string
  output: string | null
  summaryAdd: number
  summaryChange: number
  summaryDestroy: number
  duration: number | null
  error: string | null
  startedAt: string
  completedAt: string | null
}

export interface NoteItem {
  id: string
  parentId: string | null
  name: string
  type: number
  isFolder: boolean
  content: string | null
  position: number
  createdAt: string
  updatedAt: string
}

export interface IFramePage {
  id: string
  name: string
  url: string
  category: string
  icon: string
  position: number
}

export interface Secret {
  id: string
  name: string
  category: string
  username: string | null
  password: string | null  // Encrypted
  apiKey: string | null    // Encrypted
  notes: string | null     // Encrypted
  url: string | null
  createdAt: string
  updatedAt: string
}

class DatabaseManager {
  private db: Database.Database | null = null
  private encryptionKey: Buffer | null = null
  private salt: Buffer | null = null
  private isInitialized = false
  private isUnlocked = false
  private dbPath: string

  constructor() {
    const userDataDir = app.getPath('userData')
    this.dbPath = path.join(userDataDir, 'dashboard.db')
  }

  private getDb(): Database.Database {
    if (!this.db) {
      throw new Error('Database not opened')
    }
    return this.db
  }

  private requireUnlocked(): void {
    if (!this.isUnlocked) {
      throw new Error('Database is locked')
    }
  }

  /**
   * Check if database file exists (initialized)
   */
  checkInitialized(): boolean {
    const fs = require('fs')
    this.isInitialized = fs.existsSync(this.dbPath)
    return this.isInitialized
  }

  /**
   * Get current status
   */
  getStatus(): { initialized: boolean; unlocked: boolean } {
    return {
      initialized: this.checkInitialized(),
      unlocked: this.isUnlocked
    }
  }

  /**
   * Initialize new database with master password
   */
  async initialize(password: string): Promise<void> {
    if (this.isInitialized) {
      throw new Error('Database already initialized')
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters')
    }

    // Derive encryption key
    const { key, salt } = await cryptoLib.deriveKey(password)
    this.encryptionKey = key
    this.salt = salt

    // Open database
    this.db = new Database(this.dbPath)
    
    // Create tables
    this.createTables()

    // Store password hash for verification
    const passwordHash = await cryptoLib.hashPassword(password)
    this.getDb().prepare(`
      INSERT INTO auth (id, password_hash) VALUES (1, ?)
    `).run(passwordHash)

    this.isInitialized = true
    this.isUnlocked = true
  }

  /**
   * Unlock existing database with password
   */
  async unlock(password: string): Promise<void> {
    if (!this.checkInitialized()) {
      throw new Error('Database not initialized')
    }

    if (this.isUnlocked) {
      return // Already unlocked
    }

    // Open database temporarily to verify password
    this.db = new Database(this.dbPath)

    const auth = this.getDb().prepare(`
      SELECT password_hash FROM auth WHERE id = 1
    `).get() as { password_hash: string } | undefined

    if (!auth) {
      this.db.close()
      this.db = null
      throw new Error('Invalid database: no auth record')
    }

    // Verify password
    const isValid = await cryptoLib.verifyPassword(password, auth.password_hash)
    if (!isValid) {
      this.db.close()
      this.db = null
      throw new Error('Invalid password')
    }

    // Derive encryption key with deterministic salt
    const { key, salt } = await cryptoLib.deriveKey(password)
    this.encryptionKey = key
    this.salt = salt

    // Run migrations
    this.runMigrations()

    this.isUnlocked = true
  }

  /**
   * Lock the database
   */
  lock(): void {
    this.encryptionKey = null
    this.isUnlocked = false
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }

  /**
   * Change master password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    this.requireUnlocked()

    if (newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters')
    }

    // Verify current password
    const auth = this.getDb().prepare(`
      SELECT password_hash FROM auth WHERE id = 1
    `).get() as { password_hash: string } | undefined

    if (!auth) {
      throw new Error('Invalid database: no auth record')
    }

    const isValid = await cryptoLib.verifyPassword(currentPassword, auth.password_hash)
    if (!isValid) {
      throw new Error('Current password is incorrect')
    }

    // Hash new password and update
    const newPasswordHash = await cryptoLib.hashPassword(newPassword)
    this.getDb().prepare(`
      UPDATE auth SET password_hash = ? WHERE id = 1
    `).run(newPasswordHash)

    // Derive new encryption key
    const { key, salt } = await cryptoLib.deriveKey(newPassword)
    this.encryptionKey = key
    this.salt = salt
  }

  /**
   * Close database connection
   */
  close(): void {
    this.lock()
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(plaintext: string): string {
    this.requireUnlocked()
    return cryptoLib.encrypt(plaintext, this.encryptionKey!)
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(ciphertext: string): string {
    this.requireUnlocked()
    return cryptoLib.decrypt(ciphertext, this.encryptionKey!)
  }

  private createTables(): void {
    const db = this.getDb()
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS auth (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS gitlab_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        base_url TEXT NOT NULL,
        token TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS gitlab_projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL UNIQUE,
        name TEXT NOT NULL,
        path_with_namespace TEXT NOT NULL,
        http_url TEXT NOT NULL,
        default_branch TEXT,
        local_path TEXT NOT NULL,
        instance_url TEXT,
        cloned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_pull DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS terraform_deployments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        project_name TEXT NOT NULL,
        action TEXT NOT NULL,
        state_name TEXT NOT NULL,
        var_file TEXT,
        status TEXT NOT NULL,
        output TEXT,
        summary_add INTEGER DEFAULT 0,
        summary_change INTEGER DEFAULT 0,
        summary_destroy INTEGER DEFAULT 0,
        duration REAL,
        error TEXT,
        started_at DATETIME NOT NULL,
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS note_items (
        id TEXT PRIMARY KEY,
        parent_id TEXT,
        name TEXT NOT NULL,
        type INTEGER NOT NULL,
        is_folder INTEGER DEFAULT 0,
        content TEXT,
        position INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS iframe_pages (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'Other',
        icon TEXT NOT NULL DEFAULT 'Globe',
        position INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS secrets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'General',
        username TEXT,
        password TEXT,
        api_key TEXT,
        notes TEXT,
        url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `)
  }

  private runMigrations(): void {
    // Check for missing columns/tables and add them
    const db = this.getDb()
    
    // Ensure all tables exist
    this.createTables()

    // Migration: Add instance_url column to gitlab_projects if missing
    try {
      const tableInfo = db.prepare(`PRAGMA table_info(gitlab_projects)`).all() as any[]
      const hasInstanceUrl = tableInfo.some(col => col.name === 'instance_url')
      if (!hasInstanceUrl) {
        db.exec(`ALTER TABLE gitlab_projects ADD COLUMN instance_url TEXT`)
      }
    } catch (e) {
      // Column might already exist or table doesn't exist yet
    }
  }

  // ===== GitLab Config =====

  saveGitLabConfig(baseUrl: string, token: string): void {
    this.requireUnlocked()
    const encryptedToken = this.encrypt(token)
    
    this.getDb().prepare(`
      INSERT OR REPLACE INTO gitlab_config (id, base_url, token, updated_at)
      VALUES (1, ?, ?, CURRENT_TIMESTAMP)
    `).run(baseUrl, encryptedToken)
  }

  getGitLabConfig(): GitLabConfig | null {
    this.requireUnlocked()
    
    const row = this.getDb().prepare(`
      SELECT base_url, token FROM gitlab_config WHERE id = 1
    `).get() as { base_url: string; token: string } | undefined

    if (!row) return null

    return {
      baseUrl: row.base_url,
      token: this.decrypt(row.token)
    }
  }

  deleteGitLabConfig(): void {
    this.requireUnlocked()
    this.getDb().prepare(`DELETE FROM gitlab_config WHERE id = 1`).run()
  }

  // ===== GitLab Projects =====

  saveGitLabProject(project: Omit<GitLabProject, 'id' | 'clonedAt' | 'lastPull'>): void {
    this.requireUnlocked()
    
    this.getDb().prepare(`
      INSERT OR REPLACE INTO gitlab_projects 
      (project_id, name, path_with_namespace, http_url, default_branch, local_path, instance_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      project.projectId,
      project.name,
      project.pathWithNamespace,
      project.httpUrl,
      project.defaultBranch,
      project.localPath,
      project.instanceUrl
    )
  }

  getGitLabProjects(): GitLabProject[] {
    this.requireUnlocked()
    
    const rows = this.getDb().prepare(`
      SELECT * FROM gitlab_projects ORDER BY name
    `).all() as any[]

    return rows.map(row => ({
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      pathWithNamespace: row.path_with_namespace,
      httpUrl: row.http_url,
      defaultBranch: row.default_branch,
      localPath: row.local_path,
      instanceUrl: row.instance_url || null,
      clonedAt: row.cloned_at,
      lastPull: row.last_pull
    }))
  }

  deleteGitLabProject(projectId: number): void {
    this.requireUnlocked()
    this.getDb().prepare(`DELETE FROM gitlab_projects WHERE project_id = ?`).run(projectId)
  }

  updateGitLabProjectPullTime(projectId: number): void {
    this.requireUnlocked()
    this.getDb().prepare(`
      UPDATE gitlab_projects SET last_pull = CURRENT_TIMESTAMP WHERE project_id = ?
    `).run(projectId)
  }

  updateGitLabProjectInstance(projectId: number, instanceUrl: string): void {
    this.requireUnlocked()
    this.getDb().prepare(`
      UPDATE gitlab_projects SET instance_url = ? WHERE project_id = ?
    `).run(instanceUrl, projectId)
  }

  getGitLabProjectsByInstance(instanceUrl: string): GitLabProject[] {
    this.requireUnlocked()
    
    const rows = this.getDb().prepare(`
      SELECT * FROM gitlab_projects WHERE instance_url = ? ORDER BY name
    `).all(instanceUrl) as any[]

    return rows.map(row => ({
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      pathWithNamespace: row.path_with_namespace,
      httpUrl: row.http_url,
      defaultBranch: row.default_branch,
      localPath: row.local_path,
      instanceUrl: row.instance_url || null,
      clonedAt: row.cloned_at,
      lastPull: row.last_pull
    }))
  }

  // ===== Terraform Deployments =====

  createDeployment(deployment: Omit<TerraformDeployment, 'id'>): number {
    this.requireUnlocked()
    
    const result = this.getDb().prepare(`
      INSERT INTO terraform_deployments 
      (project_id, project_name, action, state_name, var_file, status, output, 
       summary_add, summary_change, summary_destroy, duration, error, started_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      deployment.projectId,
      deployment.projectName,
      deployment.action,
      deployment.stateName,
      deployment.varFile,
      deployment.status,
      deployment.output,
      deployment.summaryAdd,
      deployment.summaryChange,
      deployment.summaryDestroy,
      deployment.duration,
      deployment.error,
      deployment.startedAt,
      deployment.completedAt
    )

    return result.lastInsertRowid as number
  }

  updateDeployment(id: number, updates: Partial<TerraformDeployment>): void {
    this.requireUnlocked()
    
    const fields: string[] = []
    const values: any[] = []

    if (updates.status !== undefined) {
      fields.push('status = ?')
      values.push(updates.status)
    }
    if (updates.output !== undefined) {
      fields.push('output = ?')
      values.push(updates.output)
    }
    if (updates.error !== undefined) {
      fields.push('error = ?')
      values.push(updates.error)
    }
    if (updates.completedAt !== undefined) {
      fields.push('completed_at = ?')
      values.push(updates.completedAt)
    }
    if (updates.duration !== undefined) {
      fields.push('duration = ?')
      values.push(updates.duration)
    }
    if (updates.summaryAdd !== undefined) {
      fields.push('summary_add = ?')
      values.push(updates.summaryAdd)
    }
    if (updates.summaryChange !== undefined) {
      fields.push('summary_change = ?')
      values.push(updates.summaryChange)
    }
    if (updates.summaryDestroy !== undefined) {
      fields.push('summary_destroy = ?')
      values.push(updates.summaryDestroy)
    }

    if (fields.length === 0) return

    values.push(id)
    this.getDb().prepare(`
      UPDATE terraform_deployments SET ${fields.join(', ')} WHERE id = ?
    `).run(...values)
  }

  getAllDeployments(): TerraformDeployment[] {
    this.requireUnlocked()
    
    const rows = this.getDb().prepare(`
      SELECT * FROM terraform_deployments ORDER BY started_at DESC
    `).all() as any[]

    return rows.map(this.mapDeploymentRow)
  }

  getDeployment(id: number): TerraformDeployment | null {
    this.requireUnlocked()
    
    const row = this.getDb().prepare(`
      SELECT * FROM terraform_deployments WHERE id = ?
    `).get(id) as any

    return row ? this.mapDeploymentRow(row) : null
  }

  getProjectDeployments(projectId: number): TerraformDeployment[] {
    this.requireUnlocked()
    
    const rows = this.getDb().prepare(`
      SELECT * FROM terraform_deployments WHERE project_id = ? ORDER BY started_at DESC
    `).all(projectId) as any[]

    return rows.map(this.mapDeploymentRow)
  }

  private mapDeploymentRow(row: any): TerraformDeployment {
    return {
      id: row.id,
      projectId: row.project_id,
      projectName: row.project_name,
      action: row.action,
      stateName: row.state_name,
      varFile: row.var_file,
      status: row.status,
      output: row.output,
      summaryAdd: row.summary_add,
      summaryChange: row.summary_change,
      summaryDestroy: row.summary_destroy,
      duration: row.duration,
      error: row.error,
      startedAt: row.started_at,
      completedAt: row.completed_at
    }
  }

  // ===== Note Items =====

  getAllNoteItems(): NoteItem[] {
    this.requireUnlocked()
    
    const rows = this.getDb().prepare(`
      SELECT * FROM note_items ORDER BY position
    `).all() as any[]

    return rows.map(row => ({
      id: row.id,
      parentId: row.parent_id,
      name: row.name,
      type: row.type,
      isFolder: Boolean(row.is_folder),
      content: row.content,
      position: row.position,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }

  getNoteItem(id: string): NoteItem | null {
    this.requireUnlocked()
    
    const row = this.getDb().prepare(`
      SELECT * FROM note_items WHERE id = ?
    `).get(id) as any

    if (!row) return null

    return {
      id: row.id,
      parentId: row.parent_id,
      name: row.name,
      type: row.type,
      isFolder: Boolean(row.is_folder),
      content: row.content,
      position: row.position,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  createNoteItem(item: Omit<NoteItem, 'createdAt' | 'updatedAt'>): void {
    this.requireUnlocked()
    
    this.getDb().prepare(`
      INSERT INTO note_items (id, parent_id, name, type, is_folder, content, position)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      item.id,
      item.parentId,
      item.name,
      item.type,
      item.isFolder ? 1 : 0,
      item.content,
      item.position
    )
  }

  updateNoteItem(id: string, updates: Partial<NoteItem>): void {
    this.requireUnlocked()
    
    const fields: string[] = ['updated_at = CURRENT_TIMESTAMP']
    const values: any[] = []

    if (updates.parentId !== undefined) {
      fields.push('parent_id = ?')
      values.push(updates.parentId)
    }
    if (updates.name !== undefined) {
      fields.push('name = ?')
      values.push(updates.name)
    }
    if (updates.content !== undefined) {
      fields.push('content = ?')
      values.push(updates.content)
    }
    if (updates.position !== undefined) {
      fields.push('position = ?')
      values.push(updates.position)
    }

    values.push(id)
    this.getDb().prepare(`
      UPDATE note_items SET ${fields.join(', ')} WHERE id = ?
    `).run(...values)
  }

  deleteNoteItem(id: string): void {
    this.requireUnlocked()
    // Delete item and all children
    this.getDb().prepare(`DELETE FROM note_items WHERE id = ? OR parent_id = ?`).run(id, id)
  }

  // ===== Legacy Notes (for canvas) =====

  getNotes(): string {
    this.requireUnlocked()
    
    const row = this.getDb().prepare(`
      SELECT data FROM notes ORDER BY id DESC LIMIT 1
    `).get() as { data: string } | undefined

    return row?.data || '[]'
  }

  saveNotes(data: string): void {
    this.requireUnlocked()
    
    this.getDb().prepare(`DELETE FROM notes`).run()
    this.getDb().prepare(`
      INSERT INTO notes (data, updated_at) VALUES (?, CURRENT_TIMESTAMP)
    `).run(data)
  }

  // ===== IFrame Pages =====

  getAllIFramePages(): IFramePage[] {
    this.requireUnlocked()
    
    const rows = this.getDb().prepare(`
      SELECT * FROM iframe_pages ORDER BY position
    `).all() as any[]

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      url: row.url,
      category: row.category,
      icon: row.icon,
      position: row.position
    }))
  }

  getIFramePage(id: string): IFramePage | null {
    this.requireUnlocked()
    
    const row = this.getDb().prepare(`
      SELECT * FROM iframe_pages WHERE id = ?
    `).get(id) as any

    if (!row) return null

    return {
      id: row.id,
      name: row.name,
      url: row.url,
      category: row.category,
      icon: row.icon,
      position: row.position
    }
  }

  createIFramePage(page: IFramePage): void {
    this.requireUnlocked()
    
    this.getDb().prepare(`
      INSERT INTO iframe_pages (id, name, url, category, icon, position)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(page.id, page.name, page.url, page.category, page.icon, page.position)
  }

  updateIFramePage(id: string, updates: Partial<IFramePage>): void {
    this.requireUnlocked()
    
    const fields: string[] = ['updated_at = CURRENT_TIMESTAMP']
    const values: any[] = []

    if (updates.name !== undefined) {
      fields.push('name = ?')
      values.push(updates.name)
    }
    if (updates.url !== undefined) {
      fields.push('url = ?')
      values.push(updates.url)
    }
    if (updates.category !== undefined) {
      fields.push('category = ?')
      values.push(updates.category)
    }
    if (updates.icon !== undefined) {
      fields.push('icon = ?')
      values.push(updates.icon)
    }
    if (updates.position !== undefined) {
      fields.push('position = ?')
      values.push(updates.position)
    }

    values.push(id)
    this.getDb().prepare(`
      UPDATE iframe_pages SET ${fields.join(', ')} WHERE id = ?
    `).run(...values)
  }

  deleteIFramePage(id: string): void {
    this.requireUnlocked()
    this.getDb().prepare(`DELETE FROM iframe_pages WHERE id = ?`).run(id)
  }

  // ===== Secrets =====

  getAllSecrets(): Secret[] {
    this.requireUnlocked()
    
    const rows = this.getDb().prepare(`
      SELECT * FROM secrets ORDER BY category, name
    `).all() as any[]

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      category: row.category,
      username: row.username,
      password: row.password ? this.decrypt(row.password) : null,
      apiKey: row.api_key ? this.decrypt(row.api_key) : null,
      notes: row.notes ? this.decrypt(row.notes) : null,
      url: row.url,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }

  getSecret(id: string): Secret | null {
    this.requireUnlocked()
    
    const row = this.getDb().prepare(`
      SELECT * FROM secrets WHERE id = ?
    `).get(id) as any

    if (!row) return null

    return {
      id: row.id,
      name: row.name,
      category: row.category,
      username: row.username,
      password: row.password ? this.decrypt(row.password) : null,
      apiKey: row.api_key ? this.decrypt(row.api_key) : null,
      notes: row.notes ? this.decrypt(row.notes) : null,
      url: row.url,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  createSecret(secret: Omit<Secret, 'createdAt' | 'updatedAt'>): void {
    this.requireUnlocked()
    
    const encryptedPassword = secret.password ? this.encrypt(secret.password) : null
    const encryptedApiKey = secret.apiKey ? this.encrypt(secret.apiKey) : null
    const encryptedNotes = secret.notes ? this.encrypt(secret.notes) : null

    this.getDb().prepare(`
      INSERT INTO secrets (id, name, category, username, password, api_key, notes, url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      secret.id,
      secret.name,
      secret.category,
      secret.username,
      encryptedPassword,
      encryptedApiKey,
      encryptedNotes,
      secret.url
    )
  }

  updateSecret(id: string, updates: Partial<Omit<Secret, 'id' | 'createdAt' | 'updatedAt'>>): void {
    this.requireUnlocked()
    
    const fields: string[] = ['updated_at = CURRENT_TIMESTAMP']
    const values: any[] = []

    if (updates.name !== undefined) {
      fields.push('name = ?')
      values.push(updates.name)
    }
    if (updates.category !== undefined) {
      fields.push('category = ?')
      values.push(updates.category)
    }
    if (updates.username !== undefined) {
      fields.push('username = ?')
      values.push(updates.username)
    }
    if (updates.password !== undefined) {
      fields.push('password = ?')
      values.push(updates.password ? this.encrypt(updates.password) : null)
    }
    if (updates.apiKey !== undefined) {
      fields.push('api_key = ?')
      values.push(updates.apiKey ? this.encrypt(updates.apiKey) : null)
    }
    if (updates.notes !== undefined) {
      fields.push('notes = ?')
      values.push(updates.notes ? this.encrypt(updates.notes) : null)
    }
    if (updates.url !== undefined) {
      fields.push('url = ?')
      values.push(updates.url)
    }

    values.push(id)
    this.getDb().prepare(`
      UPDATE secrets SET ${fields.join(', ')} WHERE id = ?
    `).run(...values)
  }

  deleteSecret(id: string): void {
    this.requireUnlocked()
    this.getDb().prepare(`DELETE FROM secrets WHERE id = ?`).run(id)
  }

  getSecretCategories(): string[] {
    this.requireUnlocked()
    
    const rows = this.getDb().prepare(`
      SELECT DISTINCT category FROM secrets ORDER BY category
    `).all() as { category: string }[]

    return rows.map(r => r.category)
  }
}

// Singleton instance
let dbInstance: DatabaseManager | null = null

export function getDatabase(): DatabaseManager {
  if (!dbInstance) {
    dbInstance = new DatabaseManager()
  }
  return dbInstance
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}
