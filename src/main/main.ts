import { app, BrowserWindow, ipcMain } from "electron";
import * as path from "path";
import { DatabaseManager } from "./database-clean";

let mainWindow: BrowserWindow;
let dbManager: DatabaseManager;

const isDev = process.env.NODE_ENV === "development";

function createWindow(): void {
  mainWindow = new BrowserWindow({
    height: 800,
    width: 1200,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, "../../assets/icon.ico"),
    titleBarStyle: "default",
    show: false,
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null as any;
  });
}

app.whenReady().then(() => {
  // Initialize database
  dbManager = new DatabaseManager();

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// IPC handlers for authentication
ipcMain.handle("auth:isFirstTime", async () => {
  return dbManager.isFirstTime();
});

ipcMain.handle("auth:verifyPassword", async (_, password: string) => {
  return dbManager.verifyPassword(password);
});

ipcMain.handle("auth:setPassword", async (_, password: string) => {
  return dbManager.setPassword(password);
});

// IPC handlers for database operations
ipcMain.handle("db:getTasks", async () => {
  return dbManager.getTasks();
});

ipcMain.handle("db:addTask", async (_, task) => {
  return dbManager.addTask(task);
});

ipcMain.handle("db:updateTask", async (_, id, updates) => {
  return dbManager.updateTask(id, updates);
});

ipcMain.handle("db:deleteTask", async (_, id) => {
  return dbManager.deleteTask(id);
});

ipcMain.handle("db:getSecrets", async () => {
  return dbManager.getSecrets();
});

ipcMain.handle("db:addSecret", async (_, secret) => {
  return dbManager.addSecret(secret);
});

ipcMain.handle("db:updateSecret", async (_, id, updates) => {
  return dbManager.updateSecret(id, updates);
});

ipcMain.handle("db:deleteSecret", async (_, id) => {
  return dbManager.deleteSecret(id);
});
