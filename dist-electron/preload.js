"use strict";

// src/main/preload.ts
var import_electron = require("electron");
import_electron.contextBridge.exposeInMainWorld("electronAPI", {
  // Backend communication
  checkBackendHealth: () => import_electron.ipcRenderer.invoke("backend:health")
  // Future: Add more IPC methods as needed
  // unlockDatabase: (password: string) => ipcRenderer.invoke('db:unlock', password),
  // etc.
});
