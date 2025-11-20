import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Backend communication
  checkBackendHealth: () => ipcRenderer.invoke('backend:health'),
  
  // Future: Add more IPC methods as needed
  // unlockDatabase: (password: string) => ipcRenderer.invoke('db:unlock', password),
  // etc.
})

// Type definitions for TypeScript
declare global {
  interface Window {
    electronAPI: {
      checkBackendHealth: () => Promise<any>
    }
  }
}
