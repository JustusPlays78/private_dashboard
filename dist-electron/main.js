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
var import_electron = require("electron");
var import_path = __toESM(require("path"), 1);
var import_url = require("url");
var import_child_process = require("child_process");
var import_meta = {};
var __filename = (0, import_url.fileURLToPath)(import_meta.url);
var __dirname = import_path.default.dirname(__filename);
var mainWindow = null;
var backendProcess = null;
var BACKEND_PORT = 8080;
function startBackend() {
  const isDev = !import_electron.app.isPackaged;
  let backendPath;
  if (isDev) {
    console.log("Development mode: Connect to external Go backend at localhost:8080");
    return;
  } else {
    backendPath = import_path.default.join(process.resourcesPath, "backend", "terraform-dashboard.exe");
  }
  console.log("Starting backend:", backendPath);
  backendProcess = (0, import_child_process.spawn)(backendPath, [], {
    cwd: import_path.default.dirname(backendPath),
    stdio: "inherit"
  });
  backendProcess.on("error", (err) => {
    console.error("Backend process error:", err);
  });
  backendProcess.on("exit", (code) => {
    console.log(`Backend process exited with code ${code}`);
  });
}
function createWindow() {
  mainWindow = new import_electron.BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    backgroundColor: "#0a0a0a",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: import_path.default.join(__dirname, "preload.js")
    },
    titleBarStyle: "default",
    frame: true,
    show: false
  });
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });
  const isDev = !import_electron.app.isPackaged;
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(import_path.default.join(__dirname, "../dist/index.html"));
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
import_electron.app.whenReady().then(() => {
  startBackend();
  setTimeout(() => {
    createWindow();
  }, 1e3);
  import_electron.app.on("activate", () => {
    if (import_electron.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
import_electron.app.on("window-all-closed", () => {
  if (backendProcess) {
    backendProcess.kill();
  }
  if (process.platform !== "darwin") {
    import_electron.app.quit();
  }
});
import_electron.app.on("quit", () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});
import_electron.ipcMain.handle("backend:health", async () => {
  try {
    const response = await fetch(`http://localhost:${BACKEND_PORT}/api/health`);
    return await response.json();
  } catch (error) {
    return { error: "Backend not available" };
  }
});
