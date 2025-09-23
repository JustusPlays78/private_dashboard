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

export interface ElectronAPI {
  // Authentication methods
  verifyPassword: (password: string) => Promise<boolean>;
  setPassword: (password: string) => Promise<boolean>;

  // Task methods
  getTasks: () => Promise<Task[]>;
  addTask: (
    task: Omit<Task, "id" | "created_at" | "updated_at">
  ) => Promise<Task>;
  updateTask: (
    id: number,
    updates: Partial<Omit<Task, "id" | "created_at" | "updated_at">>
  ) => Promise<Task | null>;
  deleteTask: (id: number) => Promise<boolean>;

  // Secret methods
  getSecrets: () => Promise<Secret[]>;
  addSecret: (
    secret: Omit<Secret, "id" | "created_at" | "updated_at">
  ) => Promise<Secret>;
  updateSecret: (
    id: number,
    updates: Partial<Omit<Secret, "id" | "created_at" | "updated_at">>
  ) => Promise<Secret | null>;
  deleteSecret: (id: number) => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
