import { contextBridge, ipcRenderer } from "electron";

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

const electronAPI = {
  // Authentication API
  isFirstTime: () => ipcRenderer.invoke("auth:isFirstTime"),
  verifyPassword: (password: string) =>
    ipcRenderer.invoke("auth:verifyPassword", password),
  setPassword: (password: string) =>
    ipcRenderer.invoke("auth:setPassword", password),

  // Task API
  getTasks: () => ipcRenderer.invoke("db:getTasks"),
  addTask: (task: Omit<Task, "id" | "created_at" | "updated_at">) =>
    ipcRenderer.invoke("db:addTask", task),
  updateTask: (
    id: number,
    updates: Partial<Omit<Task, "id" | "created_at" | "updated_at">>
  ) => ipcRenderer.invoke("db:updateTask", id, updates),
  deleteTask: (id: number) => ipcRenderer.invoke("db:deleteTask", id),

  // Secret API
  getSecrets: () => ipcRenderer.invoke("db:getSecrets"),
  addSecret: (secret: Omit<Secret, "id" | "created_at" | "updated_at">) =>
    ipcRenderer.invoke("db:addSecret", secret),
  updateSecret: (
    id: number,
    updates: Partial<Omit<Secret, "id" | "created_at" | "updated_at">>
  ) => ipcRenderer.invoke("db:updateSecret", id, updates),
  deleteSecret: (id: number) => ipcRenderer.invoke("db:deleteSecret", id),
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);

export type ElectronAPI = typeof electronAPI;
