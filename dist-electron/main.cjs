"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/main/main.ts
var import_electron5 = require("electron");
var import_path5 = __toESM(require("path"), 1);

// src/main/lib/ipc-handlers.ts
var import_electron4 = require("electron");

// node_modules/uuid/dist/esm/stringify.js
var byteToHex = [];
for (let i = 0; i < 256; ++i) {
  byteToHex.push((i + 256).toString(16).slice(1));
}
function unsafeStringify(arr, offset = 0) {
  return (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
}

// node_modules/uuid/dist/esm/rng.js
var import_crypto = require("crypto");
var rnds8Pool = new Uint8Array(256);
var poolPtr = rnds8Pool.length;
function rng() {
  if (poolPtr > rnds8Pool.length - 16) {
    (0, import_crypto.randomFillSync)(rnds8Pool);
    poolPtr = 0;
  }
  return rnds8Pool.slice(poolPtr, poolPtr += 16);
}

// node_modules/uuid/dist/esm/native.js
var import_crypto2 = require("crypto");
var native_default = { randomUUID: import_crypto2.randomUUID };

// node_modules/uuid/dist/esm/v4.js
function v4(options, buf, offset) {
  if (native_default.randomUUID && !buf && !options) {
    return native_default.randomUUID();
  }
  options = options || {};
  const rnds = options.random ?? options.rng?.() ?? rng();
  if (rnds.length < 16) {
    throw new Error("Random bytes length must be >= 16");
  }
  rnds[6] = rnds[6] & 15 | 64;
  rnds[8] = rnds[8] & 63 | 128;
  if (buf) {
    offset = offset || 0;
    if (offset < 0 || offset + 16 > buf.length) {
      throw new RangeError(`UUID byte range ${offset}:${offset + 15} is out of buffer bounds`);
    }
    for (let i = 0; i < 16; ++i) {
      buf[offset + i] = rnds[i];
    }
    return buf;
  }
  return unsafeStringify(rnds);
}
var v4_default = v4;

// src/main/lib/database.ts
var import_better_sqlite3 = __toESM(require("better-sqlite3"), 1);
var import_path = __toESM(require("path"), 1);
var import_electron = require("electron");

// src/main/lib/crypto.ts
var import_crypto3 = __toESM(require("crypto"), 1);
var ALGORITHM = "aes-256-gcm";
var IV_LENGTH = 12;
var AUTH_TAG_LENGTH = 16;
var SALT_LENGTH = 16;
var KEY_LENGTH = 32;
var ARGON2_TIME = 2;
var ARGON2_MEMORY = 64 * 1024;
var ARGON2_PARALLELISM = 4;
var argon2 = null;
async function getArgon2() {
  if (!argon2) {
    argon2 = await import("argon2");
  }
  return argon2;
}
function deriveDeterministicSalt(password) {
  const hash = import_crypto3.default.createHash("sha256").update(password).digest();
  return hash.subarray(0, SALT_LENGTH);
}
async function deriveKey(password, salt) {
  const arg2 = await getArgon2();
  if (!salt) {
    salt = deriveDeterministicSalt(password);
  }
  const key = await arg2.hash(password, {
    type: arg2.argon2id,
    timeCost: ARGON2_TIME,
    memoryCost: ARGON2_MEMORY,
    parallelism: ARGON2_PARALLELISM,
    hashLength: KEY_LENGTH,
    salt,
    raw: true
  });
  return { key, salt };
}
async function hashPassword(password) {
  const { key } = await deriveKey(password);
  return key.toString("base64");
}
async function verifyPassword(password, storedHash) {
  try {
    const { key } = await deriveKey(password);
    const computedHash = key.toString("base64");
    return computedHash === storedHash;
  } catch {
    return false;
  }
}
function encrypt(plaintext, key) {
  const iv = import_crypto3.default.randomBytes(IV_LENGTH);
  const cipher = import_crypto3.default.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();
  const result = Buffer.concat([iv, authTag, encrypted]);
  return result.toString("base64");
}
function decrypt(ciphertext, key) {
  const data = Buffer.from(ciphertext, "base64");
  if (data.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error("Invalid ciphertext: too short");
  }
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = import_crypto3.default.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString("utf8");
}

// src/main/lib/database.ts
var DatabaseManager = class {
  db = null;
  encryptionKey = null;
  salt = null;
  isInitialized = false;
  isUnlocked = false;
  dbPath;
  constructor() {
    const userDataDir = import_electron.app.getPath("userData");
    this.dbPath = import_path.default.join(userDataDir, "dashboard.db");
  }
  getDb() {
    if (!this.db) {
      throw new Error("Database not opened");
    }
    return this.db;
  }
  requireUnlocked() {
    if (!this.isUnlocked) {
      throw new Error("Database is locked");
    }
  }
  /**
   * Check if database file exists (initialized)
   */
  checkInitialized() {
    const fs4 = require("fs");
    this.isInitialized = fs4.existsSync(this.dbPath);
    return this.isInitialized;
  }
  /**
   * Get current status
   */
  getStatus() {
    return {
      initialized: this.checkInitialized(),
      unlocked: this.isUnlocked
    };
  }
  /**
   * Initialize new database with master password
   */
  async initialize(password) {
    if (this.isInitialized) {
      throw new Error("Database already initialized");
    }
    if (password.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }
    const { key, salt } = await deriveKey(password);
    this.encryptionKey = key;
    this.salt = salt;
    this.db = new import_better_sqlite3.default(this.dbPath);
    this.createTables();
    const passwordHash = await hashPassword(password);
    this.getDb().prepare(`
      INSERT INTO auth (id, password_hash) VALUES (1, ?)
    `).run(passwordHash);
    this.isInitialized = true;
    this.isUnlocked = true;
  }
  /**
   * Unlock existing database with password
   */
  async unlock(password) {
    if (!this.checkInitialized()) {
      throw new Error("Database not initialized");
    }
    if (this.isUnlocked) {
      return;
    }
    this.db = new import_better_sqlite3.default(this.dbPath);
    const auth = this.getDb().prepare(`
      SELECT password_hash FROM auth WHERE id = 1
    `).get();
    if (!auth) {
      this.db.close();
      this.db = null;
      throw new Error("Invalid database: no auth record");
    }
    const isValid = await verifyPassword(password, auth.password_hash);
    if (!isValid) {
      this.db.close();
      this.db = null;
      throw new Error("Invalid password");
    }
    const { key, salt } = await deriveKey(password);
    this.encryptionKey = key;
    this.salt = salt;
    this.runMigrations();
    this.isUnlocked = true;
  }
  /**
   * Lock the database
   */
  lock() {
    this.encryptionKey = null;
    this.isUnlocked = false;
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
  /**
   * Change master password
   */
  async changePassword(currentPassword, newPassword) {
    this.requireUnlocked();
    if (newPassword.length < 8) {
      throw new Error("New password must be at least 8 characters");
    }
    const auth = this.getDb().prepare(`
      SELECT password_hash FROM auth WHERE id = 1
    `).get();
    if (!auth) {
      throw new Error("Invalid database: no auth record");
    }
    const isValid = await verifyPassword(currentPassword, auth.password_hash);
    if (!isValid) {
      throw new Error("Current password is incorrect");
    }
    const newPasswordHash = await hashPassword(newPassword);
    this.getDb().prepare(`
      UPDATE auth SET password_hash = ? WHERE id = 1
    `).run(newPasswordHash);
    const { key, salt } = await deriveKey(newPassword);
    this.encryptionKey = key;
    this.salt = salt;
  }
  /**
   * Close database connection
   */
  close() {
    this.lock();
  }
  /**
   * Encrypt sensitive data
   */
  encrypt(plaintext) {
    this.requireUnlocked();
    return encrypt(plaintext, this.encryptionKey);
  }
  /**
   * Decrypt sensitive data
   */
  decrypt(ciphertext) {
    this.requireUnlocked();
    return decrypt(ciphertext, this.encryptionKey);
  }
  createTables() {
    const db = this.getDb();
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
    `);
  }
  runMigrations() {
    const db = this.getDb();
    this.createTables();
    try {
      const tableInfo = db.prepare(`PRAGMA table_info(gitlab_projects)`).all();
      const hasInstanceUrl = tableInfo.some((col) => col.name === "instance_url");
      if (!hasInstanceUrl) {
        db.exec(`ALTER TABLE gitlab_projects ADD COLUMN instance_url TEXT`);
      }
    } catch (e) {
    }
  }
  // ===== GitLab Config =====
  saveGitLabConfig(baseUrl, token) {
    this.requireUnlocked();
    const encryptedToken = this.encrypt(token);
    this.getDb().prepare(`
      INSERT OR REPLACE INTO gitlab_config (id, base_url, token, updated_at)
      VALUES (1, ?, ?, CURRENT_TIMESTAMP)
    `).run(baseUrl, encryptedToken);
  }
  getGitLabConfig() {
    this.requireUnlocked();
    const row = this.getDb().prepare(`
      SELECT base_url, token FROM gitlab_config WHERE id = 1
    `).get();
    if (!row) return null;
    return {
      baseUrl: row.base_url,
      token: this.decrypt(row.token)
    };
  }
  deleteGitLabConfig() {
    this.requireUnlocked();
    this.getDb().prepare(`DELETE FROM gitlab_config WHERE id = 1`).run();
  }
  // ===== GitLab Projects =====
  saveGitLabProject(project) {
    this.requireUnlocked();
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
    );
  }
  getGitLabProjects() {
    this.requireUnlocked();
    const rows = this.getDb().prepare(`
      SELECT * FROM gitlab_projects ORDER BY name
    `).all();
    return rows.map((row) => ({
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
    }));
  }
  deleteGitLabProject(projectId) {
    this.requireUnlocked();
    this.getDb().prepare(`DELETE FROM gitlab_projects WHERE project_id = ?`).run(projectId);
  }
  updateGitLabProjectPullTime(projectId) {
    this.requireUnlocked();
    this.getDb().prepare(`
      UPDATE gitlab_projects SET last_pull = CURRENT_TIMESTAMP WHERE project_id = ?
    `).run(projectId);
  }
  updateGitLabProjectInstance(projectId, instanceUrl) {
    this.requireUnlocked();
    this.getDb().prepare(`
      UPDATE gitlab_projects SET instance_url = ? WHERE project_id = ?
    `).run(instanceUrl, projectId);
  }
  getGitLabProjectsByInstance(instanceUrl) {
    this.requireUnlocked();
    const rows = this.getDb().prepare(`
      SELECT * FROM gitlab_projects WHERE instance_url = ? ORDER BY name
    `).all(instanceUrl);
    return rows.map((row) => ({
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
    }));
  }
  // ===== Terraform Deployments =====
  createDeployment(deployment) {
    this.requireUnlocked();
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
    );
    return result.lastInsertRowid;
  }
  updateDeployment(id, updates) {
    this.requireUnlocked();
    const fields = [];
    const values = [];
    if (updates.status !== void 0) {
      fields.push("status = ?");
      values.push(updates.status);
    }
    if (updates.output !== void 0) {
      fields.push("output = ?");
      values.push(updates.output);
    }
    if (updates.error !== void 0) {
      fields.push("error = ?");
      values.push(updates.error);
    }
    if (updates.completedAt !== void 0) {
      fields.push("completed_at = ?");
      values.push(updates.completedAt);
    }
    if (updates.duration !== void 0) {
      fields.push("duration = ?");
      values.push(updates.duration);
    }
    if (updates.summaryAdd !== void 0) {
      fields.push("summary_add = ?");
      values.push(updates.summaryAdd);
    }
    if (updates.summaryChange !== void 0) {
      fields.push("summary_change = ?");
      values.push(updates.summaryChange);
    }
    if (updates.summaryDestroy !== void 0) {
      fields.push("summary_destroy = ?");
      values.push(updates.summaryDestroy);
    }
    if (fields.length === 0) return;
    values.push(id);
    this.getDb().prepare(`
      UPDATE terraform_deployments SET ${fields.join(", ")} WHERE id = ?
    `).run(...values);
  }
  getAllDeployments() {
    this.requireUnlocked();
    const rows = this.getDb().prepare(`
      SELECT * FROM terraform_deployments ORDER BY started_at DESC
    `).all();
    return rows.map(this.mapDeploymentRow);
  }
  getDeployment(id) {
    this.requireUnlocked();
    const row = this.getDb().prepare(`
      SELECT * FROM terraform_deployments WHERE id = ?
    `).get(id);
    return row ? this.mapDeploymentRow(row) : null;
  }
  getProjectDeployments(projectId) {
    this.requireUnlocked();
    const rows = this.getDb().prepare(`
      SELECT * FROM terraform_deployments WHERE project_id = ? ORDER BY started_at DESC
    `).all(projectId);
    return rows.map(this.mapDeploymentRow);
  }
  mapDeploymentRow(row) {
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
    };
  }
  // ===== Note Items =====
  getAllNoteItems() {
    this.requireUnlocked();
    const rows = this.getDb().prepare(`
      SELECT * FROM note_items ORDER BY position
    `).all();
    return rows.map((row) => ({
      id: row.id,
      parentId: row.parent_id,
      name: row.name,
      type: row.type,
      isFolder: Boolean(row.is_folder),
      content: row.content,
      position: row.position,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }
  getNoteItem(id) {
    this.requireUnlocked();
    const row = this.getDb().prepare(`
      SELECT * FROM note_items WHERE id = ?
    `).get(id);
    if (!row) return null;
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
    };
  }
  createNoteItem(item) {
    this.requireUnlocked();
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
    );
  }
  updateNoteItem(id, updates) {
    this.requireUnlocked();
    const fields = ["updated_at = CURRENT_TIMESTAMP"];
    const values = [];
    if (updates.parentId !== void 0) {
      fields.push("parent_id = ?");
      values.push(updates.parentId);
    }
    if (updates.name !== void 0) {
      fields.push("name = ?");
      values.push(updates.name);
    }
    if (updates.content !== void 0) {
      fields.push("content = ?");
      values.push(updates.content);
    }
    if (updates.position !== void 0) {
      fields.push("position = ?");
      values.push(updates.position);
    }
    values.push(id);
    this.getDb().prepare(`
      UPDATE note_items SET ${fields.join(", ")} WHERE id = ?
    `).run(...values);
  }
  deleteNoteItem(id) {
    this.requireUnlocked();
    this.getDb().prepare(`DELETE FROM note_items WHERE id = ? OR parent_id = ?`).run(id, id);
  }
  // ===== Legacy Notes (for canvas) =====
  getNotes() {
    this.requireUnlocked();
    const row = this.getDb().prepare(`
      SELECT data FROM notes ORDER BY id DESC LIMIT 1
    `).get();
    return row?.data || "[]";
  }
  saveNotes(data) {
    this.requireUnlocked();
    this.getDb().prepare(`DELETE FROM notes`).run();
    this.getDb().prepare(`
      INSERT INTO notes (data, updated_at) VALUES (?, CURRENT_TIMESTAMP)
    `).run(data);
  }
  // ===== IFrame Pages =====
  getAllIFramePages() {
    this.requireUnlocked();
    const rows = this.getDb().prepare(`
      SELECT * FROM iframe_pages ORDER BY position
    `).all();
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      url: row.url,
      category: row.category,
      icon: row.icon,
      position: row.position
    }));
  }
  getIFramePage(id) {
    this.requireUnlocked();
    const row = this.getDb().prepare(`
      SELECT * FROM iframe_pages WHERE id = ?
    `).get(id);
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      url: row.url,
      category: row.category,
      icon: row.icon,
      position: row.position
    };
  }
  createIFramePage(page) {
    this.requireUnlocked();
    this.getDb().prepare(`
      INSERT INTO iframe_pages (id, name, url, category, icon, position)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(page.id, page.name, page.url, page.category, page.icon, page.position);
  }
  updateIFramePage(id, updates) {
    this.requireUnlocked();
    const fields = ["updated_at = CURRENT_TIMESTAMP"];
    const values = [];
    if (updates.name !== void 0) {
      fields.push("name = ?");
      values.push(updates.name);
    }
    if (updates.url !== void 0) {
      fields.push("url = ?");
      values.push(updates.url);
    }
    if (updates.category !== void 0) {
      fields.push("category = ?");
      values.push(updates.category);
    }
    if (updates.icon !== void 0) {
      fields.push("icon = ?");
      values.push(updates.icon);
    }
    if (updates.position !== void 0) {
      fields.push("position = ?");
      values.push(updates.position);
    }
    values.push(id);
    this.getDb().prepare(`
      UPDATE iframe_pages SET ${fields.join(", ")} WHERE id = ?
    `).run(...values);
  }
  deleteIFramePage(id) {
    this.requireUnlocked();
    this.getDb().prepare(`DELETE FROM iframe_pages WHERE id = ?`).run(id);
  }
  // ===== Secrets =====
  getAllSecrets() {
    this.requireUnlocked();
    const rows = this.getDb().prepare(`
      SELECT * FROM secrets ORDER BY category, name
    `).all();
    return rows.map((row) => ({
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
    }));
  }
  getSecret(id) {
    this.requireUnlocked();
    const row = this.getDb().prepare(`
      SELECT * FROM secrets WHERE id = ?
    `).get(id);
    if (!row) return null;
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
    };
  }
  createSecret(secret) {
    this.requireUnlocked();
    const encryptedPassword = secret.password ? this.encrypt(secret.password) : null;
    const encryptedApiKey = secret.apiKey ? this.encrypt(secret.apiKey) : null;
    const encryptedNotes = secret.notes ? this.encrypt(secret.notes) : null;
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
    );
  }
  updateSecret(id, updates) {
    this.requireUnlocked();
    const fields = ["updated_at = CURRENT_TIMESTAMP"];
    const values = [];
    if (updates.name !== void 0) {
      fields.push("name = ?");
      values.push(updates.name);
    }
    if (updates.category !== void 0) {
      fields.push("category = ?");
      values.push(updates.category);
    }
    if (updates.username !== void 0) {
      fields.push("username = ?");
      values.push(updates.username);
    }
    if (updates.password !== void 0) {
      fields.push("password = ?");
      values.push(updates.password ? this.encrypt(updates.password) : null);
    }
    if (updates.apiKey !== void 0) {
      fields.push("api_key = ?");
      values.push(updates.apiKey ? this.encrypt(updates.apiKey) : null);
    }
    if (updates.notes !== void 0) {
      fields.push("notes = ?");
      values.push(updates.notes ? this.encrypt(updates.notes) : null);
    }
    if (updates.url !== void 0) {
      fields.push("url = ?");
      values.push(updates.url);
    }
    values.push(id);
    this.getDb().prepare(`
      UPDATE secrets SET ${fields.join(", ")} WHERE id = ?
    `).run(...values);
  }
  deleteSecret(id) {
    this.requireUnlocked();
    this.getDb().prepare(`DELETE FROM secrets WHERE id = ?`).run(id);
  }
  getSecretCategories() {
    this.requireUnlocked();
    const rows = this.getDb().prepare(`
      SELECT DISTINCT category FROM secrets ORDER BY category
    `).all();
    return rows.map((r) => r.category);
  }
};
var dbInstance = null;
function getDatabase() {
  if (!dbInstance) {
    dbInstance = new DatabaseManager();
  }
  return dbInstance;
}
function closeDatabase() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

// src/main/lib/gitlab.ts
var import_path3 = __toESM(require("path"), 1);
var import_fs3 = __toESM(require("fs"), 1);
var import_electron3 = require("electron");

// src/main/lib/portable-tools.ts
var import_child_process = require("child_process");
var import_path2 = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_electron2 = require("electron");
var import_https = __toESM(require("https"), 1);
var import_http = __toESM(require("http"), 1);
var import_fs2 = require("fs");
var TOOLS = {
  terraform: {
    name: "Terraform",
    version: "1.6.6",
    downloadUrl: "https://releases.hashicorp.com/terraform/1.6.6/terraform_1.6.6_windows_amd64.zip",
    executable: "terraform.exe",
    checkArgs: ["version"],
    extractType: "zip"
  },
  git: {
    name: "Git",
    version: "2.43.0",
    downloadUrl: "https://github.com/git-for-windows/git/releases/download/v2.43.0.windows.1/PortableGit-2.43.0-64-bit.7z.exe",
    executable: "cmd/git.exe",
    checkArgs: ["--version"],
    extractType: "exe"
  }
};
function getToolsDir() {
  const userDataPath = import_electron2.app.getPath("userData");
  return import_path2.default.join(userDataPath, "portable-tools");
}
function getToolPath(toolName) {
  const tool = TOOLS[toolName];
  if (!tool) return null;
  const toolsDir = getToolsDir();
  const toolPath = import_path2.default.join(toolsDir, toolName, tool.executable);
  if ((0, import_fs2.existsSync)(toolPath)) {
    return toolPath;
  }
  return null;
}
async function isToolInstalled(toolName) {
  const tool = TOOLS[toolName];
  if (!tool) {
    return { installed: false, portable: false };
  }
  const portablePath = getToolPath(toolName);
  if (portablePath) {
    try {
      const version = await getToolVersion(portablePath, tool.checkArgs);
      return { installed: true, portable: true, version, path: portablePath };
    } catch {
    }
  }
  try {
    const version = await getToolVersion(toolName, tool.checkArgs);
    return { installed: true, portable: false, version };
  } catch {
    return { installed: false, portable: false };
  }
}
async function getToolVersion(execPath, args) {
  return new Promise((resolve, reject) => {
    const proc = (0, import_child_process.spawn)(execPath, args);
    let output = "";
    proc.stdout.on("data", (data) => {
      output += data.toString();
    });
    proc.stderr.on("data", (data) => {
      output += data.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) {
        const match = output.match(/(\d+\.\d+\.\d+)/);
        resolve(match ? match[1] : "unknown");
      } else {
        reject(new Error(`Exit code ${code}`));
      }
    });
  });
}
function spawnTool(toolName, args, options) {
  const portablePath = getToolPath(toolName);
  const execPath = portablePath || toolName;
  if (toolName === "git" && portablePath) {
    const gitDir = import_path2.default.dirname(import_path2.default.dirname(portablePath));
    options = {
      ...options,
      env: {
        ...process.env,
        ...options?.env,
        GIT_EXEC_PATH: import_path2.default.join(gitDir, "mingw64", "libexec", "git-core")
      }
    };
  }
  return (0, import_child_process.spawn)(execPath, args, options || {});
}
async function downloadFile(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const file = (0, import_fs2.createWriteStream)(destPath);
    const protocol = url.startsWith("https") ? import_https.default : import_http.default;
    const request = protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          file.close();
          import_fs.default.unlinkSync(destPath);
          downloadFile(redirectUrl, destPath, onProgress).then(resolve).catch(reject);
          return;
        }
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      const totalSize = parseInt(response.headers["content-length"] || "0", 10);
      let downloadedSize = 0;
      response.on("data", (chunk) => {
        downloadedSize += chunk.length;
        if (totalSize > 0 && onProgress) {
          onProgress(Math.round(downloadedSize / totalSize * 100));
        }
      });
      response.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve();
      });
    });
    request.on("error", (err) => {
      import_fs.default.unlink(destPath, () => {
      });
      reject(err);
    });
  });
}
async function extractZip(zipPath, destDir) {
  return new Promise((resolve, reject) => {
    const ps = (0, import_child_process.spawn)("powershell", [
      "-NoProfile",
      "-Command",
      `Expand-Archive -Path "${zipPath}" -DestinationPath "${destDir}" -Force`
    ]);
    ps.on("error", reject);
    ps.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Extraction failed with code ${code}`));
      }
    });
  });
}
async function downloadTool(toolName, onProgress) {
  const tool = TOOLS[toolName];
  if (!tool) {
    return { success: false, error: `Unknown tool: ${toolName}` };
  }
  const toolsDir = getToolsDir();
  const toolDir = import_path2.default.join(toolsDir, toolName);
  const tempDir = import_path2.default.join(toolsDir, "temp");
  try {
    if (!(0, import_fs2.existsSync)(toolsDir)) {
      (0, import_fs2.mkdirSync)(toolsDir, { recursive: true });
    }
    if (!(0, import_fs2.existsSync)(tempDir)) {
      (0, import_fs2.mkdirSync)(tempDir, { recursive: true });
    }
    const fileName = import_path2.default.basename(tool.downloadUrl);
    const downloadPath = import_path2.default.join(tempDir, fileName);
    onProgress?.("Downloading...", 0);
    await downloadFile(tool.downloadUrl, downloadPath, (percent) => {
      onProgress?.("Downloading...", percent);
    });
    onProgress?.("Extracting...", 100);
    if (tool.extractType === "zip") {
      if (!(0, import_fs2.existsSync)(toolDir)) {
        (0, import_fs2.mkdirSync)(toolDir, { recursive: true });
      }
      await extractZip(downloadPath, toolDir);
    } else if (tool.extractType === "exe") {
      if (toolName === "git") {
        if (!(0, import_fs2.existsSync)(toolDir)) {
          (0, import_fs2.mkdirSync)(toolDir, { recursive: true });
        }
        await new Promise((resolve, reject) => {
          const proc = (0, import_child_process.spawn)(downloadPath, ["-o", toolDir, "-y"], {
            windowsHide: true
          });
          proc.on("error", reject);
          proc.on("close", (code) => {
            if (code === 0) {
              resolve();
            } else {
              reject(new Error(`Extraction failed with code ${code}`));
            }
          });
        });
      }
    }
    try {
      import_fs.default.unlinkSync(downloadPath);
    } catch {
    }
    const toolPath = getToolPath(toolName);
    if (toolPath && (0, import_fs2.existsSync)(toolPath)) {
      return { success: true, path: toolPath };
    } else {
      return { success: false, error: "Tool installed but executable not found" };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
}
async function getToolsStatus() {
  const status = {};
  for (const toolName of Object.keys(TOOLS)) {
    status[toolName] = await isToolInstalled(toolName);
  }
  return status;
}

// src/main/lib/gitlab.ts
var GitLabClient = class {
  baseUrl;
  token;
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    if (!this.baseUrl.startsWith("http://") && !this.baseUrl.startsWith("https://")) {
      this.baseUrl = "https://" + this.baseUrl;
    }
    this.token = token;
  }
  async request(path6, options = {}) {
    const url = `${this.baseUrl}${path6}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "PRIVATE-TOKEN": this.token,
        "Content-Type": "application/json",
        ...options.headers
      }
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitLab API error (${response.status}): ${error}`);
    }
    return response.json();
  }
  async testConnection() {
    try {
      await this.request("/api/v4/user");
      return true;
    } catch {
      return false;
    }
  }
  async listProjects() {
    return this.request("/api/v4/projects?membership=true&per_page=100");
  }
  async searchProjects(query) {
    return this.request(`/api/v4/projects?search=${encodeURIComponent(query)}&membership=true&per_page=50`);
  }
  async getProject(projectId) {
    return this.request(`/api/v4/projects/${encodeURIComponent(projectId)}`);
  }
  async getRepositoryTree(projectId, path6 = "", ref = "main") {
    return this.request(
      `/api/v4/projects/${projectId}/repository/tree?path=${encodeURIComponent(path6)}&ref=${encodeURIComponent(ref)}&recursive=false`
    );
  }
  async listGroups() {
    return this.request("/api/v4/groups?per_page=100");
  }
  async searchGroups(query) {
    return this.request(`/api/v4/groups?search=${encodeURIComponent(query)}&per_page=50`);
  }
  async getGroupProjects(groupId) {
    return this.request(`/api/v4/groups/${groupId}/projects?per_page=100&include_subgroups=true`);
  }
  async getTerraformStates(projectId) {
    try {
      return await this.request(`/api/v4/projects/${projectId}/terraform/state`);
    } catch {
      return [];
    }
  }
  async getFileContent(projectId, filePath, ref = "main") {
    const response = await this.request(
      `/api/v4/projects/${projectId}/repository/files/${encodeURIComponent(filePath)}?ref=${encodeURIComponent(ref)}`
    );
    return Buffer.from(response.content, "base64").toString("utf-8");
  }
};
var GitCloner = class {
  workDir;
  constructor() {
    const appDataDir = import_electron3.app.getPath("userData");
    this.workDir = import_path3.default.join(appDataDir, "gitlab-projects");
    if (!import_fs3.default.existsSync(this.workDir)) {
      import_fs3.default.mkdirSync(this.workDir, { recursive: true });
    }
  }
  async checkGitInstalled() {
    const status = await isToolInstalled("git");
    return status.installed;
  }
  async cloneRepository(httpUrl, pathWithNamespace, token) {
    const projectPath = import_path3.default.join(this.workDir, pathWithNamespace.replace(/\//g, import_path3.default.sep));
    if (import_fs3.default.existsSync(projectPath)) {
      import_fs3.default.rmSync(projectPath, { recursive: true, force: true });
    }
    import_fs3.default.mkdirSync(import_path3.default.dirname(projectPath), { recursive: true });
    const encodedToken = encodeURIComponent(token);
    const urlWithAuth = httpUrl.replace("https://", `https://oauth2:${encodedToken}@`);
    return new Promise((resolve, reject) => {
      const git = spawnTool("git", ["clone", urlWithAuth, projectPath], {
        cwd: this.workDir,
        stdio: "pipe"
      });
      let stderr = "";
      git.stderr.on("data", (data) => {
        stderr += data.toString();
      });
      git.on("close", (code) => {
        if (code === 0) {
          resolve(projectPath);
        } else {
          reject(new Error(`Git clone failed: ${stderr}`));
        }
      });
      git.on("error", (err) => {
        reject(err);
      });
    });
  }
  async pullRepository(projectPath) {
    return new Promise((resolve, reject) => {
      const git = spawnTool("git", ["pull"], { cwd: projectPath, stdio: "pipe" });
      let stderr = "";
      git.stderr.on("data", (data) => {
        stderr += data.toString();
      });
      git.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Git pull failed: ${stderr}`));
        }
      });
      git.on("error", reject);
    });
  }
  async getCurrentBranch(projectPath) {
    return new Promise((resolve, reject) => {
      const git = spawnTool("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: projectPath, stdio: "pipe" });
      let stdout = "";
      git.stdout.on("data", (data) => {
        stdout += data.toString();
      });
      git.on("close", (code) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error("Failed to get branch"));
        }
      });
      git.on("error", reject);
    });
  }
  async getLastCommit(projectPath) {
    return new Promise((resolve, reject) => {
      const git = spawnTool("git", ["log", "-1", "--format=%H|%s"], { cwd: projectPath, stdio: "pipe" });
      let stdout = "";
      git.stdout.on("data", (data) => {
        stdout += data.toString();
      });
      git.on("close", (code) => {
        if (code === 0) {
          const [hash, message] = stdout.trim().split("|");
          resolve({ hash, message });
        } else {
          reject(new Error("Failed to get last commit"));
        }
      });
      git.on("error", reject);
    });
  }
  async listBranches(projectPath) {
    return new Promise((resolve, reject) => {
      const git = spawnTool("git", ["branch", "-a"], { cwd: projectPath, stdio: "pipe" });
      let stdout = "";
      git.stdout.on("data", (data) => {
        stdout += data.toString();
      });
      git.on("close", (code) => {
        if (code === 0) {
          const branches = stdout.split("\n").map((b) => b.trim().replace("* ", "")).filter((b) => b && !b.includes("->"));
          resolve(branches);
        } else {
          reject(new Error("Failed to list branches"));
        }
      });
      git.on("error", reject);
    });
  }
  async switchBranch(projectPath, branch) {
    const localBranch = branch.replace("remotes/origin/", "");
    return new Promise((resolve, reject) => {
      const git = spawnTool("git", ["checkout", localBranch], { cwd: projectPath, stdio: "pipe" });
      let stderr = "";
      git.stderr.on("data", (data) => {
        stderr += data.toString();
      });
      git.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Failed to switch branch: ${stderr}`));
        }
      });
      git.on("error", reject);
    });
  }
  listTerraformFiles(projectPath) {
    const tfFiles = [];
    function scanDir(dir) {
      try {
        const entries = import_fs3.default.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = import_path3.default.join(dir, entry.name);
          if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
            scanDir(fullPath);
          } else if (entry.isFile() && entry.name.endsWith(".tf")) {
            tfFiles.push(import_path3.default.relative(projectPath, fullPath));
          }
        }
      } catch {
      }
    }
    scanDir(projectPath);
    return tfFiles;
  }
};

// src/main/lib/terraform.ts
var import_path4 = __toESM(require("path"), 1);
var import_fs4 = __toESM(require("fs"), 1);
async function checkTerraformInstalled() {
  const status = await isToolInstalled("terraform");
  return status.installed;
}
async function getTerraformVersion() {
  const status = await isToolInstalled("terraform");
  if (status.installed && status.version) {
    return status.version;
  }
  throw new Error("Terraform not installed");
}
async function terraformInit(config, logCallback) {
  const startTime = /* @__PURE__ */ new Date();
  const args = ["init", "-input=false"];
  if (config.gitLabBaseUrl && config.repositoryId && config.stateName) {
    let baseUrl = config.gitLabBaseUrl.replace(/\/$/, "");
    if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
      baseUrl = "https://" + baseUrl;
    }
    const stateAddress = `${baseUrl}/api/v4/projects/${config.repositoryId}/terraform/state/${config.stateName}`;
    const lockAddress = `${stateAddress}/lock`;
    args.push(
      `-backend-config=address=${stateAddress}`,
      `-backend-config=lock_address=${lockAddress}`,
      `-backend-config=unlock_address=${lockAddress}`,
      `-backend-config=username=${config.gitLabUser || "oauth2"}`,
      `-backend-config=password=${config.gitLabToken}`,
      `-backend-config=lock_method=POST`,
      `-backend-config=unlock_method=DELETE`,
      `-backend-config=retry_wait_min=5`,
      "-reconfigure"
    );
  }
  return runTerraform(config.projectPath, args, "terraform init", startTime, logCallback);
}
async function terraformPlan(config, logCallback) {
  const startTime = /* @__PURE__ */ new Date();
  const args = ["plan", "-input=false", "-no-color"];
  if (config.varFile) {
    args.push(`-var-file=${config.varFile}`);
  }
  return runTerraform(config.projectPath, args, "terraform plan", startTime, logCallback);
}
async function terraformApply(config, autoApprove = false, logCallback) {
  const startTime = /* @__PURE__ */ new Date();
  const args = ["apply", "-input=false", "-no-color"];
  if (autoApprove) {
    args.push("-auto-approve");
  }
  if (config.varFile) {
    args.push(`-var-file=${config.varFile}`);
  }
  return runTerraform(config.projectPath, args, "terraform apply", startTime, logCallback);
}
async function terraformDestroy(config, autoApprove = false, logCallback) {
  const startTime = /* @__PURE__ */ new Date();
  const args = ["destroy", "-input=false", "-no-color"];
  if (autoApprove) {
    args.push("-auto-approve");
  }
  if (config.varFile) {
    args.push(`-var-file=${config.varFile}`);
  }
  return runTerraform(config.projectPath, args, "terraform destroy", startTime, logCallback);
}
async function terraformShow(projectPath, logCallback) {
  const startTime = /* @__PURE__ */ new Date();
  return runTerraform(projectPath, ["show", "-no-color"], "terraform show", startTime, logCallback);
}
function runTerraform(cwd, args, command, startTime, logCallback) {
  return new Promise((resolve) => {
    let output = "";
    let error = "";
    const tf = spawnTool("terraform", args, {
      cwd,
      stdio: "pipe",
      env: {
        ...process.env,
        TF_IN_AUTOMATION: "true"
      }
    });
    tf.stdout.on("data", (data) => {
      const text = data.toString();
      output += text;
      if (logCallback) {
        text.split("\n").filter(Boolean).forEach(logCallback);
      }
    });
    tf.stderr.on("data", (data) => {
      const text = data.toString();
      error += text;
      if (logCallback) {
        text.split("\n").filter(Boolean).forEach((line) => logCallback(`[ERROR] ${line}`));
      }
    });
    tf.on("close", (code) => {
      const duration = ((/* @__PURE__ */ new Date()).getTime() - startTime.getTime()) / 1e3;
      resolve({
        command,
        output,
        error,
        exitCode: code || 0,
        startedAt: startTime,
        duration
      });
    });
    tf.on("error", (err) => {
      const duration = ((/* @__PURE__ */ new Date()).getTime() - startTime.getTime()) / 1e3;
      resolve({
        command,
        output,
        error: err.message,
        exitCode: 1,
        startedAt: startTime,
        duration
      });
    });
  });
}
function findVarFiles(projectPath, maxDepth = 3) {
  const varFiles = [];
  const searchDir = (dir, currentDepth, prefix = "") => {
    if (currentDepth > maxDepth) return;
    try {
      const entries = import_fs4.default.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === ".terraform") {
            continue;
          }
          searchDir(
            import_path4.default.join(dir, entry.name),
            currentDepth + 1,
            prefix ? `${prefix}/${entry.name}` : entry.name
          );
        } else if (entry.isFile()) {
          const fileName = entry.name.toLowerCase();
          if (fileName.endsWith(".tfvars") || fileName.endsWith(".tfvars.json") || fileName === "terraform.tfvars" || fileName.endsWith(".auto.tfvars")) {
            const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
            varFiles.push(relativePath);
          }
        }
      }
    } catch {
    }
  };
  searchDir(projectPath, 0);
  return varFiles;
}
function parseTerraformSummary(output) {
  let add = 0, change = 0, destroy = 0;
  const planMatch = output.match(/Plan:\s+(\d+)\s+to\s+add,\s+(\d+)\s+to\s+change,\s+(\d+)\s+to\s+destroy/);
  if (planMatch) {
    add = parseInt(planMatch[1]);
    change = parseInt(planMatch[2]);
    destroy = parseInt(planMatch[3]);
  }
  const applyMatch = output.match(/Apply complete!.*?(\d+)\s+added,\s+(\d+)\s+changed,\s+(\d+)\s+destroyed/);
  if (applyMatch) {
    add = parseInt(applyMatch[1]);
    change = parseInt(applyMatch[2]);
    destroy = parseInt(applyMatch[3]);
  }
  const destroyMatch = output.match(/Destroy complete!.*?(\d+)\s+destroyed/);
  if (destroyMatch) {
    destroy = parseInt(destroyMatch[1]);
  }
  return { add, change, destroy };
}

// src/main/lib/aws.ts
var import_client_ec2 = require("@aws-sdk/client-ec2");
var import_client_s3 = require("@aws-sdk/client-s3");
var import_client_lambda = require("@aws-sdk/client-lambda");
var import_client_rds = require("@aws-sdk/client-rds");
var import_client_sts = require("@aws-sdk/client-sts");
var import_client_ecs = require("@aws-sdk/client-ecs");
var import_client_elastic_load_balancing_v2 = require("@aws-sdk/client-elastic-load-balancing-v2");
var AWSClient = class {
  credentials;
  region;
  constructor(credentials) {
    this.credentials = credentials;
    this.region = credentials.region || "eu-central-1";
  }
  getClientConfig() {
    return {
      region: this.region,
      credentials: {
        accessKeyId: this.credentials.accessKeyId,
        secretAccessKey: this.credentials.secretAccessKey,
        sessionToken: this.credentials.sessionToken
      }
    };
  }
  async testConnection() {
    try {
      const sts = new import_client_sts.STSClient(this.getClientConfig());
      const response = await sts.send(new import_client_sts.GetCallerIdentityCommand({}));
      return {
        success: true,
        identity: {
          account: response.Account,
          arn: response.Arn,
          userId: response.UserId
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  async getEC2Instances() {
    try {
      const ec2 = new import_client_ec2.EC2Client(this.getClientConfig());
      const response = await ec2.send(new import_client_ec2.DescribeInstancesCommand({}));
      const instances = [];
      for (const reservation of response.Reservations || []) {
        for (const instance of reservation.Instances || []) {
          const nameTag = instance.Tags?.find((t) => t.Key === "Name");
          instances.push({
            instanceId: instance.InstanceId || "",
            name: nameTag?.Value || instance.InstanceId || "",
            type: instance.InstanceType || "",
            state: instance.State?.Name || "unknown",
            publicIp: instance.PublicIpAddress || null,
            privateIp: instance.PrivateIpAddress || null,
            launchTime: instance.LaunchTime || null,
            az: instance.Placement?.AvailabilityZone || ""
          });
        }
      }
      return instances;
    } catch (error) {
      console.error("Failed to get EC2 instances:", error);
      return [];
    }
  }
  async getS3Buckets() {
    try {
      const s3 = new import_client_s3.S3Client(this.getClientConfig());
      const response = await s3.send(new import_client_s3.ListBucketsCommand({}));
      return (response.Buckets || []).map((bucket) => ({
        name: bucket.Name || "",
        creationDate: bucket.CreationDate || null
      }));
    } catch (error) {
      console.error("Failed to get S3 buckets:", error);
      return [];
    }
  }
  async getLambdaFunctions() {
    try {
      const lambda = new import_client_lambda.LambdaClient(this.getClientConfig());
      const response = await lambda.send(new import_client_lambda.ListFunctionsCommand({}));
      return (response.Functions || []).map((fn) => ({
        name: fn.FunctionName || "",
        runtime: fn.Runtime || "",
        memory: fn.MemorySize || 0,
        timeout: fn.Timeout || 0,
        lastModified: fn.LastModified || ""
      }));
    } catch (error) {
      console.error("Failed to get Lambda functions:", error);
      return [];
    }
  }
  async getRDSInstances() {
    try {
      const rds = new import_client_rds.RDSClient(this.getClientConfig());
      const response = await rds.send(new import_client_rds.DescribeDBInstancesCommand({}));
      return (response.DBInstances || []).map((db) => ({
        identifier: db.DBInstanceIdentifier || "",
        engine: `${db.Engine || ""} ${db.EngineVersion || ""}`,
        status: db.DBInstanceStatus || "",
        class: db.DBInstanceClass || "",
        endpoint: db.Endpoint?.Address || null
      }));
    } catch (error) {
      console.error("Failed to get RDS instances:", error);
      return [];
    }
  }
  async getVPCCount() {
    try {
      const ec2 = new import_client_ec2.EC2Client(this.getClientConfig());
      const response = await ec2.send(new import_client_ec2.DescribeVpcsCommand({}));
      return response.Vpcs?.length || 0;
    } catch (error) {
      console.error("Failed to get VPCs:", error);
      return 0;
    }
  }
  async getECSClusters() {
    try {
      const ecs = new import_client_ecs.ECSClient(this.getClientConfig());
      const listResponse = await ecs.send(new import_client_ecs.ListClustersCommand({}));
      if (!listResponse.clusterArns || listResponse.clusterArns.length === 0) {
        return [];
      }
      const describeResponse = await ecs.send(new import_client_ecs.DescribeClustersCommand({
        clusters: listResponse.clusterArns
      }));
      return (describeResponse.clusters || []).map((cluster) => ({
        clusterArn: cluster.clusterArn || "",
        clusterName: cluster.clusterName || "",
        status: cluster.status || "UNKNOWN",
        runningTasksCount: cluster.runningTasksCount || 0,
        pendingTasksCount: cluster.pendingTasksCount || 0,
        activeServicesCount: cluster.activeServicesCount || 0,
        registeredContainerInstancesCount: cluster.registeredContainerInstancesCount || 0
      }));
    } catch (error) {
      console.error("Failed to get ECS clusters:", error);
      return [];
    }
  }
  async getECSServices(clusterArn) {
    try {
      const ecs = new import_client_ecs.ECSClient(this.getClientConfig());
      let clusterArns = [];
      if (clusterArn) {
        clusterArns = [clusterArn];
      } else {
        const clusters = await this.getECSClusters();
        clusterArns = clusters.map((c) => c.clusterArn);
      }
      const allServices = [];
      for (const arn of clusterArns) {
        const listResponse = await ecs.send(new import_client_ecs.ListServicesCommand({ cluster: arn }));
        if (listResponse.serviceArns && listResponse.serviceArns.length > 0) {
          const describeResponse = await ecs.send(new import_client_ecs.DescribeServicesCommand({
            cluster: arn,
            services: listResponse.serviceArns
          }));
          const services = (describeResponse.services || []).map((service) => ({
            serviceArn: service.serviceArn || "",
            serviceName: service.serviceName || "",
            clusterArn: service.clusterArn || "",
            status: service.status || "UNKNOWN",
            desiredCount: service.desiredCount || 0,
            runningCount: service.runningCount || 0,
            pendingCount: service.pendingCount || 0,
            launchType: service.launchType || "EC2",
            taskDefinition: service.taskDefinition || ""
          }));
          allServices.push(...services);
        }
      }
      return allServices;
    } catch (error) {
      console.error("Failed to get ECS services:", error);
      return [];
    }
  }
  async getECSTasks(clusterArn) {
    try {
      const ecs = new import_client_ecs.ECSClient(this.getClientConfig());
      let clusterArns = [];
      if (clusterArn) {
        clusterArns = [clusterArn];
      } else {
        const clusters = await this.getECSClusters();
        clusterArns = clusters.map((c) => c.clusterArn);
      }
      const allTasks = [];
      for (const arn of clusterArns) {
        const listResponse = await ecs.send(new import_client_ecs.ListTasksCommand({ cluster: arn }));
        if (listResponse.taskArns && listResponse.taskArns.length > 0) {
          const describeResponse = await ecs.send(new import_client_ecs.DescribeTasksCommand({
            cluster: arn,
            tasks: listResponse.taskArns
          }));
          const tasks = (describeResponse.tasks || []).map((task) => ({
            taskArn: task.taskArn || "",
            taskDefinitionArn: task.taskDefinitionArn || "",
            clusterArn: task.clusterArn || "",
            lastStatus: task.lastStatus || "UNKNOWN",
            desiredStatus: task.desiredStatus || "UNKNOWN",
            cpu: task.cpu || "0",
            memory: task.memory || "0",
            launchType: task.launchType || "EC2",
            startedAt: task.startedAt || null,
            containers: (task.containers || []).map((container) => ({
              name: container.name || "",
              image: container.image || "",
              lastStatus: container.lastStatus || "UNKNOWN",
              healthStatus: String(container.healthStatus || "UNKNOWN"),
              cpu: Number(container.cpu) || 0,
              memory: Number(container.memory) || 0
            }))
          }));
          allTasks.push(...tasks);
        }
      }
      return allTasks;
    } catch (error) {
      console.error("Failed to get ECS tasks:", error);
      return [];
    }
  }
  async getLoadBalancers() {
    try {
      const elbv2 = new import_client_elastic_load_balancing_v2.ElasticLoadBalancingV2Client(this.getClientConfig());
      const response = await elbv2.send(new import_client_elastic_load_balancing_v2.DescribeLoadBalancersCommand({}));
      return (response.LoadBalancers || []).map((lb) => ({
        arn: lb.LoadBalancerArn || "",
        name: lb.LoadBalancerName || "",
        dnsName: lb.DNSName || "",
        type: lb.Type || "application",
        state: lb.State?.Code || "unknown",
        scheme: lb.Scheme || "internal",
        vpcId: lb.VpcId || ""
      }));
    } catch (error) {
      console.error("Failed to get Load Balancers:", error);
      return [];
    }
  }
  async getTargetGroups() {
    try {
      const elbv2 = new import_client_elastic_load_balancing_v2.ElasticLoadBalancingV2Client(this.getClientConfig());
      const response = await elbv2.send(new import_client_elastic_load_balancing_v2.DescribeTargetGroupsCommand({}));
      return (response.TargetGroups || []).map((tg) => ({
        arn: tg.TargetGroupArn || "",
        name: tg.TargetGroupName || "",
        protocol: tg.Protocol || "",
        port: tg.Port || 0,
        targetType: tg.TargetType || "instance",
        healthCheckPath: tg.HealthCheckPath || "/",
        vpcId: tg.VpcId || ""
      }));
    } catch (error) {
      console.error("Failed to get Target Groups:", error);
      return [];
    }
  }
  async getSecurityGroups() {
    try {
      const ec2 = new import_client_ec2.EC2Client(this.getClientConfig());
      const response = await ec2.send(new import_client_ec2.DescribeSecurityGroupsCommand({}));
      return (response.SecurityGroups || []).map((sg) => ({
        groupId: sg.GroupId || "",
        groupName: sg.GroupName || "",
        description: sg.Description || "",
        vpcId: sg.VpcId || "",
        inboundRulesCount: sg.IpPermissions?.length || 0,
        outboundRulesCount: sg.IpPermissionsEgress?.length || 0
      }));
    } catch (error) {
      console.error("Failed to get Security Groups:", error);
      return [];
    }
  }
  async getSubnets() {
    try {
      const ec2 = new import_client_ec2.EC2Client(this.getClientConfig());
      const response = await ec2.send(new import_client_ec2.DescribeSubnetsCommand({}));
      return (response.Subnets || []).map((subnet) => ({
        subnetId: subnet.SubnetId || "",
        vpcId: subnet.VpcId || "",
        cidrBlock: subnet.CidrBlock || "",
        availabilityZone: subnet.AvailabilityZone || "",
        state: subnet.State || "unknown",
        availableIpCount: subnet.AvailableIpAddressCount || 0,
        name: subnet.Tags?.find((t) => t.Key === "Name")?.Value || subnet.SubnetId || ""
      }));
    } catch (error) {
      console.error("Failed to get Subnets:", error);
      return [];
    }
  }
  async getAllResources() {
    const errors = [];
    let identity = null;
    const testResult = await this.testConnection();
    if (!testResult.success) {
      return {
        identity: null,
        ec2Instances: [],
        s3Buckets: [],
        lambdaFunctions: [],
        rdsInstances: [],
        ecsClusters: [],
        ecsServices: [],
        ecsTasks: [],
        loadBalancers: [],
        targetGroups: [],
        securityGroups: [],
        subnets: [],
        vpcs: 0,
        errors: [testResult.error || "Failed to connect to AWS"]
      };
    }
    identity = testResult.identity;
    const [
      ec2Instances,
      s3Buckets,
      lambdaFunctions,
      rdsInstances,
      ecsClusters,
      ecsServices,
      ecsTasks,
      loadBalancers,
      targetGroups,
      securityGroups,
      subnets,
      vpcs
    ] = await Promise.all([
      this.getEC2Instances().catch((e) => {
        errors.push(`EC2: ${e.message}`);
        return [];
      }),
      this.getS3Buckets().catch((e) => {
        errors.push(`S3: ${e.message}`);
        return [];
      }),
      this.getLambdaFunctions().catch((e) => {
        errors.push(`Lambda: ${e.message}`);
        return [];
      }),
      this.getRDSInstances().catch((e) => {
        errors.push(`RDS: ${e.message}`);
        return [];
      }),
      this.getECSClusters().catch((e) => {
        errors.push(`ECS Clusters: ${e.message}`);
        return [];
      }),
      this.getECSServices().catch((e) => {
        errors.push(`ECS Services: ${e.message}`);
        return [];
      }),
      this.getECSTasks().catch((e) => {
        errors.push(`ECS Tasks: ${e.message}`);
        return [];
      }),
      this.getLoadBalancers().catch((e) => {
        errors.push(`Load Balancers: ${e.message}`);
        return [];
      }),
      this.getTargetGroups().catch((e) => {
        errors.push(`Target Groups: ${e.message}`);
        return [];
      }),
      this.getSecurityGroups().catch((e) => {
        errors.push(`Security Groups: ${e.message}`);
        return [];
      }),
      this.getSubnets().catch((e) => {
        errors.push(`Subnets: ${e.message}`);
        return [];
      }),
      this.getVPCCount().catch((e) => {
        errors.push(`VPC: ${e.message}`);
        return 0;
      })
    ]);
    return {
      identity,
      ec2Instances,
      s3Buckets,
      lambdaFunctions,
      rdsInstances,
      ecsClusters,
      ecsServices,
      ecsTasks,
      loadBalancers,
      targetGroups,
      securityGroups,
      subnets,
      vpcs,
      errors
    };
  }
};

// src/main/lib/ipc-handlers.ts
var gitLabClient = null;
var gitCloner = null;
var awsClient = null;
var sessionTimeout = null;
var lastActivity = Date.now();
var SESSION_TIMEOUT = 30 * 60 * 1e3;
function getGitCloner() {
  if (!gitCloner) {
    gitCloner = new GitCloner();
  }
  return gitCloner;
}
function updateActivity() {
  lastActivity = Date.now();
}
function startSessionWatcher(mainWindow2) {
  if (sessionTimeout) {
    clearInterval(sessionTimeout);
  }
  sessionTimeout = setInterval(() => {
    const db = getDatabase();
    if (db.getStatus().unlocked && Date.now() - lastActivity > SESSION_TIMEOUT) {
      db.lock();
      mainWindow2?.webContents.send("session:locked");
    }
  }, 1e4);
}
function stopSessionWatcher() {
  if (sessionTimeout) {
    clearInterval(sessionTimeout);
    sessionTimeout = null;
  }
}
function setupIpcHandlers(getMainWindow) {
  import_electron4.ipcMain.handle("auth:status", async () => {
    updateActivity();
    return getDatabase().getStatus();
  });
  import_electron4.ipcMain.handle("auth:initialize", async (_, password) => {
    try {
      await getDatabase().initialize(password);
      startSessionWatcher(getMainWindow());
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron4.ipcMain.handle("auth:unlock", async (_, password) => {
    try {
      await getDatabase().unlock(password);
      startSessionWatcher(getMainWindow());
      const config = getDatabase().getGitLabConfig();
      if (config) {
        gitLabClient = new GitLabClient(config.baseUrl, config.token);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron4.ipcMain.handle("auth:lock", async () => {
    getDatabase().lock();
    gitLabClient = null;
    stopSessionWatcher();
    return { success: true };
  });
  import_electron4.ipcMain.handle("auth:heartbeat", async () => {
    updateActivity();
    const timeUntilLock = Math.max(0, SESSION_TIMEOUT - (Date.now() - lastActivity));
    return {
      success: true,
      time_until_lock: timeUntilLock / 1e3
    };
  });
  import_electron4.ipcMain.handle("auth:changePassword", async (_, currentPassword, newPassword) => {
    try {
      const db = getDatabase();
      const status = db.getStatus();
      if (!status.unlocked) {
        return { success: false, error: "Application is locked. Please unlock first." };
      }
      await db.changePassword(currentPassword, newPassword);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron4.ipcMain.handle("dashboard:stats", async () => {
    updateActivity();
    const db = getDatabase();
    const deployments = db.getAllDeployments();
    const projects = db.getGitLabProjects();
    return {
      terraform_states: projects.length,
      active_deployments: deployments.filter((d) => d.status === "running").length,
      total_deployments: deployments.length
    };
  });
  import_electron4.ipcMain.handle("gitlab:configure", async (_, baseUrl, token) => {
    updateActivity();
    try {
      const client = new GitLabClient(baseUrl, token);
      const connected = await client.testConnection();
      if (!connected) {
        return { success: false, error: "Failed to connect to GitLab" };
      }
      getDatabase().saveGitLabConfig(baseUrl, token);
      gitLabClient = client;
      return { success: true, base_url: baseUrl };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron4.ipcMain.handle("gitlab:getConfig", async () => {
    updateActivity();
    const config = getDatabase().getGitLabConfig();
    if (!config) return null;
    return { base_url: config.baseUrl, configured: true };
  });
  import_electron4.ipcMain.handle("gitlab:disconnect", async () => {
    updateActivity();
    try {
      getDatabase().deleteGitLabConfig();
      gitLabClient = null;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron4.ipcMain.handle("gitlab:listProjects", async () => {
    updateActivity();
    if (!gitLabClient) {
      return { success: false, error: "GitLab not configured" };
    }
    try {
      const projects = await gitLabClient.listProjects();
      return { success: true, projects, count: projects.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron4.ipcMain.handle("gitlab:searchProjects", async (_, query) => {
    updateActivity();
    if (!gitLabClient) {
      return { success: false, error: "GitLab not configured" };
    }
    try {
      const projects = await gitLabClient.searchProjects(query);
      return { success: true, projects, count: projects.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron4.ipcMain.handle("gitlab:getProject", async (_, projectId) => {
    updateActivity();
    if (!gitLabClient) {
      return { success: false, error: "GitLab not configured" };
    }
    try {
      const project = await gitLabClient.getProject(projectId);
      return { success: true, project };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron4.ipcMain.handle("gitlab:getTree", async (_, projectId, path6, ref) => {
    updateActivity();
    if (!gitLabClient) {
      return { success: false, error: "GitLab not configured" };
    }
    try {
      const tree = await gitLabClient.getRepositoryTree(projectId, path6, ref);
      return { success: true, tree };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron4.ipcMain.handle("gitlab:clone", async (_, projectId) => {
    updateActivity();
    if (!gitLabClient) {
      return { success: false, error: "GitLab not configured" };
    }
    try {
      const config = getDatabase().getGitLabConfig();
      if (!config) throw new Error("GitLab not configured");
      const project = await gitLabClient.getProject(projectId);
      const cloner = getGitCloner();
      const projectPath = await cloner.cloneRepository(
        project.http_url_to_repo,
        project.path_with_namespace,
        config.token
      );
      const branch = await cloner.getCurrentBranch(projectPath);
      const commit = await cloner.getLastCommit(projectPath);
      const tfFiles = cloner.listTerraformFiles(projectPath);
      getDatabase().saveGitLabProject({
        projectId: project.id,
        name: project.name,
        pathWithNamespace: project.path_with_namespace,
        httpUrl: project.http_url_to_repo,
        defaultBranch: project.default_branch,
        localPath: projectPath,
        instanceUrl: config.baseUrl
      });
      return {
        success: true,
        project_path: projectPath,
        project_name: project.name,
        branch,
        last_commit: commit,
        terraform_files: tfFiles,
        terraform_files_count: tfFiles.length
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron4.ipcMain.handle("gitlab:pull", async (_, projectId) => {
    updateActivity();
    try {
      const projects = getDatabase().getGitLabProjects();
      const project = projects.find((p) => p.projectId === projectId);
      if (!project) {
        return { success: false, error: "Project not found" };
      }
      const cloner = getGitCloner();
      await cloner.pullRepository(project.localPath);
      getDatabase().updateGitLabProjectPullTime(projectId);
      const branch = await cloner.getCurrentBranch(project.localPath);
      const commit = await cloner.getLastCommit(project.localPath);
      return {
        success: true,
        branch,
        last_commit: commit
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron4.ipcMain.handle("gitlab:checkGit", async () => {
    updateActivity();
    const cloner = getGitCloner();
    const installed = await cloner.checkGitInstalled();
    return { installed };
  });
  import_electron4.ipcMain.handle("gitlab:getClonedProjects", async () => {
    updateActivity();
    const projects = getDatabase().getGitLabProjects();
    const mappedProjects = projects.map((p) => ({
      ProjectID: p.projectId,
      Name: p.name,
      LocalPath: p.localPath,
      DefaultBranch: p.defaultBranch,
      ClonedAt: p.clonedAt,
      LastPull: p.lastPull,
      InstanceUrl: p.instanceUrl
    }));
    return { success: true, projects: mappedProjects };
  });
  import_electron4.ipcMain.handle("gitlab:getClonedProjectsByInstance", async (_, instanceUrl) => {
    updateActivity();
    const projects = getDatabase().getGitLabProjectsByInstance(instanceUrl);
    const mappedProjects = projects.map((p) => ({
      ProjectID: p.projectId,
      Name: p.name,
      LocalPath: p.localPath,
      DefaultBranch: p.defaultBranch,
      ClonedAt: p.clonedAt,
      LastPull: p.lastPull,
      InstanceUrl: p.instanceUrl
    }));
    return { success: true, projects: mappedProjects };
  });
  import_electron4.ipcMain.handle("gitlab:assignProjectToInstance", async (_, projectId, instanceUrl) => {
    updateActivity();
    try {
      getDatabase().updateGitLabProjectInstance(projectId, instanceUrl);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron4.ipcMain.handle("gitlab:deleteClonedProject", async (_, projectId) => {
    updateActivity();
    getDatabase().deleteGitLabProject(projectId);
    return { success: true };
  });
  import_electron4.ipcMain.handle("gitlab:listGroups", async () => {
    updateActivity();
    if (!gitLabClient) {
      return { success: false, error: "GitLab not configured" };
    }
    try {
      const groups = await gitLabClient.listGroups();
      return { success: true, groups };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron4.ipcMain.handle("gitlab:searchGroups", async (_, query) => {
    updateActivity();
    if (!gitLabClient) {
      return { success: false, error: "GitLab not configured" };
    }
    try {
      const groups = await gitLabClient.searchGroups(query);
      return { success: true, groups };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron4.ipcMain.handle("gitlab:getGroupProjects", async (_, groupId) => {
    updateActivity();
    if (!gitLabClient) {
      return { success: false, error: "GitLab not configured" };
    }
    try {
      const projects = await gitLabClient.getGroupProjects(groupId);
      return { success: true, projects };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron4.ipcMain.handle("gitlab:getTerraformStates", async (_, projectId) => {
    updateActivity();
    if (!gitLabClient) {
      return { success: false, error: "GitLab not configured" };
    }
    try {
      const states = await gitLabClient.getTerraformStates(projectId);
      return { success: true, states };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron4.ipcMain.handle("gitlab:listBranches", async (_, projectPath) => {
    updateActivity();
    try {
      const cloner = getGitCloner();
      const branches = await cloner.listBranches(projectPath);
      const current = await cloner.getCurrentBranch(projectPath);
      return { success: true, branches, current };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron4.ipcMain.handle("gitlab:switchBranch", async (_, projectPath, branch) => {
    updateActivity();
    try {
      const cloner = getGitCloner();
      await cloner.switchBranch(projectPath, branch);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron4.ipcMain.handle("terraform:check", async () => {
    updateActivity();
    const installed = await checkTerraformInstalled();
    let version = "";
    if (installed) {
      try {
        version = await getTerraformVersion();
      } catch {
      }
    }
    return { installed, version };
  });
  import_electron4.ipcMain.handle("terraform:init", async (_, config) => {
    updateActivity();
    try {
      const gitlabConfig = getDatabase().getGitLabConfig();
      if (gitlabConfig && config.repositoryId && config.stateName) {
        config.gitLabBaseUrl = gitlabConfig.baseUrl;
        config.gitLabToken = gitlabConfig.token;
      }
      const result = await terraformInit(config);
      return {
        success: result.exitCode === 0,
        output: result.output,
        error: result.error,
        duration: result.duration
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron4.ipcMain.handle("terraform:plan", async (_, config) => {
    updateActivity();
    try {
      const result = await terraformPlan(config);
      const summary = parseTerraformSummary(result.output);
      return {
        success: result.exitCode === 0,
        output: result.output,
        error: result.error,
        duration: result.duration,
        summary
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron4.ipcMain.handle("terraform:apply", async (_, config, autoApprove) => {
    updateActivity();
    try {
      const result = await terraformApply(config, autoApprove);
      const summary = parseTerraformSummary(result.output);
      return {
        success: result.exitCode === 0,
        output: result.output,
        error: result.error,
        duration: result.duration,
        summary
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron4.ipcMain.handle("terraform:destroy", async (_, config, autoApprove) => {
    updateActivity();
    try {
      const result = await terraformDestroy(config, autoApprove);
      const summary = parseTerraformSummary(result.output);
      return {
        success: result.exitCode === 0,
        output: result.output,
        error: result.error,
        duration: result.duration,
        summary
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron4.ipcMain.handle("terraform:show", async (_, projectPath) => {
    updateActivity();
    try {
      const result = await terraformShow(projectPath);
      return {
        success: result.exitCode === 0,
        output: result.output,
        error: result.error
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron4.ipcMain.handle("terraform:findVarFiles", async (_, projectPath) => {
    updateActivity();
    const varFiles = findVarFiles(projectPath);
    return { success: true, var_files: varFiles };
  });
  import_electron4.ipcMain.handle("deployments:getAll", async () => {
    updateActivity();
    const deployments = getDatabase().getAllDeployments();
    return { success: true, deployments };
  });
  import_electron4.ipcMain.handle("deployments:get", async (_, id) => {
    updateActivity();
    const deployment = getDatabase().getDeployment(id);
    return { success: true, deployment };
  });
  import_electron4.ipcMain.handle("deployments:getByProject", async (_, projectId) => {
    updateActivity();
    const deployments = getDatabase().getProjectDeployments(projectId);
    return { success: true, deployments };
  });
  import_electron4.ipcMain.handle("notes:get", async () => {
    updateActivity();
    const data = getDatabase().getNotes();
    return { success: true, data };
  });
  import_electron4.ipcMain.handle("notes:save", async (_, data) => {
    updateActivity();
    getDatabase().saveNotes(data);
    return { success: true };
  });
  import_electron4.ipcMain.handle("noteItems:getAll", async () => {
    updateActivity();
    const items = getDatabase().getAllNoteItems();
    return { success: true, items };
  });
  import_electron4.ipcMain.handle("noteItems:get", async (_, id) => {
    updateActivity();
    const item = getDatabase().getNoteItem(id);
    return { success: true, item };
  });
  import_electron4.ipcMain.handle("noteItems:create", async (_, item) => {
    updateActivity();
    const id = item.id || v4_default();
    getDatabase().createNoteItem({ ...item, id });
    return { success: true, id };
  });
  import_electron4.ipcMain.handle("noteItems:update", async (_, id, updates) => {
    updateActivity();
    getDatabase().updateNoteItem(id, updates);
    return { success: true };
  });
  import_electron4.ipcMain.handle("noteItems:delete", async (_, id) => {
    updateActivity();
    getDatabase().deleteNoteItem(id);
    return { success: true };
  });
  import_electron4.ipcMain.handle("iframes:getAll", async () => {
    updateActivity();
    const pages = getDatabase().getAllIFramePages();
    return { success: true, pages };
  });
  import_electron4.ipcMain.handle("iframes:get", async (_, id) => {
    updateActivity();
    const page = getDatabase().getIFramePage(id);
    return { success: true, page };
  });
  import_electron4.ipcMain.handle("iframes:create", async (_, data) => {
    updateActivity();
    const page = {
      id: v4_default(),
      ...data
    };
    getDatabase().createIFramePage(page);
    return { success: true, page };
  });
  import_electron4.ipcMain.handle("iframes:update", async (_, id, updates) => {
    updateActivity();
    getDatabase().updateIFramePage(id, updates);
    return { success: true };
  });
  import_electron4.ipcMain.handle("iframes:delete", async (_, id) => {
    updateActivity();
    getDatabase().deleteIFramePage(id);
    return { success: true };
  });
  import_electron4.ipcMain.handle("secrets:getAll", async () => {
    updateActivity();
    const secrets = getDatabase().getAllSecrets();
    return { success: true, secrets };
  });
  import_electron4.ipcMain.handle("secrets:get", async (_, id) => {
    updateActivity();
    const secret = getDatabase().getSecret(id);
    return { success: true, secret };
  });
  import_electron4.ipcMain.handle("secrets:create", async (_, data) => {
    updateActivity();
    const secret = {
      id: data.id || v4_default(),
      name: data.name,
      category: data.category,
      username: data.username || null,
      password: data.password || null,
      apiKey: data.apiKey || null,
      notes: data.notes || null,
      url: data.url || null
    };
    getDatabase().createSecret(secret);
    return { success: true, secret: { ...secret, password: void 0, apiKey: void 0 } };
  });
  import_electron4.ipcMain.handle("secrets:update", async (_, id, updates) => {
    updateActivity();
    getDatabase().updateSecret(id, updates);
    return { success: true };
  });
  import_electron4.ipcMain.handle("secrets:delete", async (_, id) => {
    updateActivity();
    getDatabase().deleteSecret(id);
    return { success: true };
  });
  import_electron4.ipcMain.handle("secrets:getCategories", async () => {
    updateActivity();
    const categories = getDatabase().getSecretCategories();
    return { success: true, categories };
  });
  import_electron4.ipcMain.handle("aws:configure", async (_, credentials) => {
    updateActivity();
    try {
      awsClient = new AWSClient(credentials);
      const result = await awsClient.testConnection();
      if (!result.success) {
        awsClient = null;
        return { success: false, error: result.error };
      }
      return { success: true, identity: result.identity };
    } catch (error) {
      awsClient = null;
      return { success: false, error: error.message };
    }
  });
  import_electron4.ipcMain.handle("aws:testConnection", async (_, credentials) => {
    updateActivity();
    try {
      const client = new AWSClient(credentials);
      return await client.testConnection();
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron4.ipcMain.handle("aws:getResources", async (_, credentials) => {
    updateActivity();
    try {
      const client = new AWSClient(credentials);
      const resources = await client.getAllResources();
      return { success: true, resources };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron4.ipcMain.handle("aws:getEC2Instances", async (_, credentials) => {
    updateActivity();
    try {
      const client = new AWSClient(credentials);
      const instances = await client.getEC2Instances();
      return { success: true, instances };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron4.ipcMain.handle("aws:getS3Buckets", async (_, credentials) => {
    updateActivity();
    try {
      const client = new AWSClient(credentials);
      const buckets = await client.getS3Buckets();
      return { success: true, buckets };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron4.ipcMain.handle("aws:getLambdaFunctions", async (_, credentials) => {
    updateActivity();
    try {
      const client = new AWSClient(credentials);
      const functions = await client.getLambdaFunctions();
      return { success: true, functions };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron4.ipcMain.handle("aws:getRDSInstances", async (_, credentials) => {
    updateActivity();
    try {
      const client = new AWSClient(credentials);
      const instances = await client.getRDSInstances();
      return { success: true, instances };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron4.ipcMain.handle("aws:getECSClusters", async (_, credentials) => {
    updateActivity();
    try {
      const client = new AWSClient(credentials);
      const clusters = await client.getECSClusters();
      return { success: true, clusters };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron4.ipcMain.handle("aws:getECSServices", async (_, credentials, clusterArn) => {
    updateActivity();
    try {
      const client = new AWSClient(credentials);
      const services = await client.getECSServices(clusterArn);
      return { success: true, services };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron4.ipcMain.handle("aws:getECSTasks", async (_, credentials, clusterArn) => {
    updateActivity();
    try {
      const client = new AWSClient(credentials);
      const tasks = await client.getECSTasks(clusterArn);
      return { success: true, tasks };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron4.ipcMain.handle("aws:getLoadBalancers", async (_, credentials) => {
    updateActivity();
    try {
      const client = new AWSClient(credentials);
      const loadBalancers = await client.getLoadBalancers();
      return { success: true, loadBalancers };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron4.ipcMain.handle("aws:getSecurityGroups", async (_, credentials) => {
    updateActivity();
    try {
      const client = new AWSClient(credentials);
      const securityGroups = await client.getSecurityGroups();
      return { success: true, securityGroups };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron4.ipcMain.handle("tools:getStatus", async () => {
    updateActivity();
    try {
      const status = await getToolsStatus();
      return { success: true, tools: status };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron4.ipcMain.handle("tools:download", async (_, toolName) => {
    updateActivity();
    try {
      const result = await downloadTool(toolName, (status, percent) => {
        console.log(`[${toolName}] ${status} ${percent}%`);
      });
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron4.ipcMain.handle("tools:isInstalled", async (_, toolName) => {
    updateActivity();
    try {
      const status = await isToolInstalled(toolName);
      return { success: true, ...status };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron4.ipcMain.handle("app:getInfo", async () => {
    const { app: app5 } = require("electron");
    return {
      success: true,
      version: app5.getVersion(),
      name: app5.getName(),
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
      chromeVersion: process.versions.chrome,
      platform: process.platform,
      arch: process.arch
    };
  });
}
function cleanupIpcHandlers() {
  stopSessionWatcher();
  closeDatabase();
}

// src/main/main.ts
import_electron5.app.commandLine.appendSwitch("js-flags", "--expose-gc");
import_electron5.app.commandLine.appendSwitch("disable-renderer-backgrounding");
var mainWindow = null;
var browserViewCache = /* @__PURE__ */ new Map();
var currentBrowserViewId = null;
var isDev = !import_electron5.app.isPackaged;
function createWindow() {
  mainWindow = new import_electron5.BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    backgroundColor: "#0f172a",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: import_path5.default.join(__dirname, "preload.cjs"),
      // Performance optimizations
      backgroundThrottling: false
    },
    // Frameless window in production, normal in dev
    frame: isDev,
    titleBarStyle: isDev ? "default" : "hidden",
    titleBarOverlay: isDev ? false : {
      color: "#0f172a",
      symbolColor: "#94a3b8",
      height: 40
    },
    show: false,
    // Use icon
    icon: import_path5.default.join(__dirname, "../assets/icon.png")
  });
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(import_path5.default.join(__dirname, "../dist/index.html"));
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
import_electron5.app.whenReady().then(() => {
  setupIpcHandlers(() => mainWindow);
  createWindow();
  import_electron5.app.on("activate", () => {
    if (import_electron5.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
import_electron5.app.on("window-all-closed", () => {
  cleanupIpcHandlers();
  if (process.platform !== "darwin") {
    import_electron5.app.quit();
  }
});
import_electron5.app.on("quit", () => {
  cleanupIpcHandlers();
});
import_electron5.ipcMain.handle("browserview:load", async (event, pageId, url, bounds) => {
  if (!mainWindow) return { success: false, error: "No main window" };
  if (currentBrowserViewId && currentBrowserViewId !== pageId) {
    const oldView = browserViewCache.get(currentBrowserViewId);
    if (oldView) {
      mainWindow.removeBrowserView(oldView);
    }
  }
  let browserView = browserViewCache.get(pageId);
  if (browserView) {
    mainWindow.addBrowserView(browserView);
    browserView.setBounds(bounds);
    currentBrowserViewId = pageId;
    return { success: true };
  }
  browserView = new import_electron5.BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      partition: "persist:iframe-session"
    }
  });
  browserViewCache.set(pageId, browserView);
  currentBrowserViewId = pageId;
  mainWindow.addBrowserView(browserView);
  browserView.setBounds(bounds);
  browserView.setAutoResize({ width: true, height: true });
  browserView.webContents.setWindowOpenHandler((details) => {
    browserView?.webContents.loadURL(details.url).catch(console.error);
    return { action: "deny" };
  });
  browserView.webContents.on("will-navigate", (event2, url2) => {
    console.log("Navigating to:", url2);
  });
  try {
    await browserView.webContents.loadURL(url);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});
import_electron5.ipcMain.handle("browserview:resize", async (event, bounds) => {
  if (!currentBrowserViewId) return { success: false, error: "No active BrowserView" };
  const browserView = browserViewCache.get(currentBrowserViewId);
  if (!browserView) return { success: false, error: "BrowserView not found" };
  browserView.setBounds(bounds);
  return { success: true };
});
import_electron5.ipcMain.handle("browserview:destroy", async () => {
  if (currentBrowserViewId && mainWindow) {
    const browserView = browserViewCache.get(currentBrowserViewId);
    if (browserView) {
      mainWindow.removeBrowserView(browserView);
    }
    currentBrowserViewId = null;
    return { success: true };
  }
  return { success: false, error: "No BrowserView to destroy" };
});
import_electron5.ipcMain.handle("browserview:reload", async () => {
  if (!currentBrowserViewId) return { success: false, error: "No active BrowserView" };
  const browserView = browserViewCache.get(currentBrowserViewId);
  if (!browserView) return { success: false, error: "BrowserView not found" };
  browserView.webContents.reload();
  return { success: true };
});
