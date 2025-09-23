import * as path from "path";
import * as fs from "fs";
import { app } from "electron";
import { EncryptionManager } from "./encryption";

export interface Task {
  id?: number;
  title: string;
  description?: string;
  status: "todo" | "in-progress" | "completed";
  priority: "low" | "medium" | "high";
  created_at?: string;
  updated_at?: string;
}

export interface Secret {
  id?: number;
  name: string;
  value: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

interface DatabaseData {
  tasks: Task[];
  secrets: Secret[];
  verificationToken?: string;
}

export class DatabaseManager {
  private data: DatabaseData = { tasks: [], secrets: [] };
  private dbPath: string;
  private nextTaskId = 1;
  private nextSecretId = 1;
  private password: string | null = null;

  constructor() {
    const userDataPath = app.getPath("userData");
    this.dbPath = path.join(userDataPath, "dashboard.json");
  }

  public async setPassword(password: string): Promise<boolean> {
    try {
      this.password = password;

      // If it's the first time, create empty data structure and save it
      if (this.isFirstTime()) {
        this.data = {
          tasks: [],
          secrets: [],
          verificationToken: undefined,
        };
        await this.saveData(); // Save the initial data structure
      } else {
        await this.loadData();
      }

      return true;
    } catch (error) {
      console.error("Failed to set password:", error);
      return false;
    }
  }

  public isFirstTime(): boolean {
    return !fs.existsSync(this.dbPath);
  }

  public async verifyPassword(password: string): Promise<boolean> {
    try {
      // Try to load and decrypt data with the provided password
      if (fs.existsSync(this.dbPath)) {
        const encryptedData = fs.readFileSync(this.dbPath, "utf8");

        if (encryptedData.trim()) {
          try {
            // Try to decrypt
            const decryptedData = EncryptionManager.decrypt(
              encryptedData,
              password
            );
            const parsedData = JSON.parse(decryptedData);

            // If decryption successful and verification token exists, verify it
            if (parsedData.verificationToken) {
              const isValid = EncryptionManager.verifyPassword(
                parsedData.verificationToken,
                password
              );
              if (isValid) {
                this.password = password;
                return true;
              }
            }
            // If no verification token, create one (migration case)
            else {
              this.password = password;
              this.data = parsedData;
              this.data.verificationToken =
                EncryptionManager.createVerificationToken(password);
              await this.saveData();
              return true;
            }
          } catch (decryptError) {
            // Decryption failed, wrong password
            return false;
          }
        }
      }

      // No file exists, first time setup
      this.password = password;
      this.data = {
        tasks: [],
        secrets: [],
        verificationToken: EncryptionManager.createVerificationToken(password),
      };
      await this.saveData();
      return true;
    } catch (error) {
      console.error("Password verification failed:", error);
      return false;
    }
  }

  private async loadData(): Promise<void> {
    try {
      if (fs.existsSync(this.dbPath)) {
        const fileContent = fs.readFileSync(this.dbPath, "utf8");

        if (fileContent.trim()) {
          let parsedData: DatabaseData;

          if (this.password) {
            // Decrypt the data
            const decryptedData = EncryptionManager.decrypt(
              fileContent,
              this.password
            );
            parsedData = JSON.parse(decryptedData);
          } else {
            // Plain text (migration case)
            parsedData = JSON.parse(fileContent);
          }

          this.data = parsedData;
        } else {
          this.data = { tasks: [], secrets: [] };
        }
      } else {
        this.data = { tasks: [], secrets: [] };
      }

      // Determine next IDs
      this.nextTaskId =
        Math.max(...this.data.tasks.map((t) => t.id || 0), 0) + 1;
      this.nextSecretId =
        Math.max(...this.data.secrets.map((s) => s.id || 0), 0) + 1;
    } catch (error) {
      console.error("Error loading data:", error);
      this.data = { tasks: [], secrets: [] };
    }
  }

  private async saveData(): Promise<void> {
    try {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const dataToSave = JSON.stringify(this.data, null, 2);

      if (this.password) {
        // Encrypt the data before saving
        const encryptedData = EncryptionManager.encrypt(
          dataToSave,
          this.password
        );
        fs.writeFileSync(this.dbPath, encryptedData);
      } else {
        // Save as plain text (fallback)
        fs.writeFileSync(this.dbPath, dataToSave);
      }
    } catch (error) {
      console.error("Error saving data:", error);
    }
  }

  // Task methods
  getTasks(): Task[] {
    return [...this.data.tasks].sort(
      (a, b) =>
        new Date(b.created_at || "").getTime() -
        new Date(a.created_at || "").getTime()
    );
  }

  addTask(task: Omit<Task, "id" | "created_at" | "updated_at">): Task {
    const now = new Date().toISOString();
    const newTask: Task = {
      ...task,
      id: this.nextTaskId++,
      created_at: now,
      updated_at: now,
    };

    this.data.tasks.push(newTask);
    this.saveData();
    return newTask;
  }

  updateTask(
    id: number,
    updates: Partial<Omit<Task, "id" | "created_at" | "updated_at">>
  ): Task | null {
    const taskIndex = this.data.tasks.findIndex((t) => t.id === id);
    if (taskIndex === -1) return null;

    const updatedTask = {
      ...this.data.tasks[taskIndex],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    this.data.tasks[taskIndex] = updatedTask;
    this.saveData();
    return updatedTask;
  }

  deleteTask(id: number): boolean {
    const initialLength = this.data.tasks.length;
    this.data.tasks = this.data.tasks.filter((t) => t.id !== id);

    if (this.data.tasks.length < initialLength) {
      this.saveData();
      return true;
    }
    return false;
  }

  // Secret methods
  getSecrets(): Secret[] {
    return [...this.data.secrets].sort((a, b) => a.name.localeCompare(b.name));
  }

  addSecret(secret: Omit<Secret, "id" | "created_at" | "updated_at">): Secret {
    // Check for duplicate names
    const existingSecret = this.data.secrets.find(
      (s) => s.name === secret.name
    );
    if (existingSecret) {
      throw new Error("UNIQUE constraint failed: secrets.name");
    }

    const now = new Date().toISOString();
    const newSecret: Secret = {
      ...secret,
      id: this.nextSecretId++,
      created_at: now,
      updated_at: now,
    };

    this.data.secrets.push(newSecret);
    this.saveData();
    return newSecret;
  }

  updateSecret(
    id: number,
    updates: Partial<Omit<Secret, "id" | "created_at" | "updated_at">>
  ): Secret | null {
    const secretIndex = this.data.secrets.findIndex((s) => s.id === id);
    if (secretIndex === -1) return null;

    // Check for duplicate names (excluding current secret)
    if (updates.name) {
      const existingSecret = this.data.secrets.find(
        (s) => s.name === updates.name && s.id !== id
      );
      if (existingSecret) {
        throw new Error("UNIQUE constraint failed: secrets.name");
      }
    }

    const updatedSecret = {
      ...this.data.secrets[secretIndex],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    this.data.secrets[secretIndex] = updatedSecret;
    this.saveData();
    return updatedSecret;
  }

  deleteSecret(id: number): boolean {
    const initialLength = this.data.secrets.length;
    this.data.secrets = this.data.secrets.filter((s) => s.id !== id);

    if (this.data.secrets.length < initialLength) {
      this.saveData();
      return true;
    }
    return false;
  }

  close(): void {
    // JSON-based storage doesn't need explicit closing
  }
}
