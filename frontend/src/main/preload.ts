import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Backend communication
  checkBackendHealth: () => ipcRenderer.invoke('backend:health'),
  
  // BrowserView for iframe pages
  browserView: {
    load: (pageId: string, url: string, bounds: { x: number, y: number, width: number, height: number }) => 
      ipcRenderer.invoke('browserview:load', pageId, url, bounds),
    resize: (bounds: { x: number, y: number, width: number, height: number }) => 
      ipcRenderer.invoke('browserview:resize', bounds),
    destroy: () => ipcRenderer.invoke('browserview:destroy'),
    reload: () => ipcRenderer.invoke('browserview:reload'),
  }
})

// Type definitions for TypeScript
declare global {
  interface Window {
    electronAPI: {
      checkBackendHealth: () => Promise<any>
      browserView: {
        load: (pageId: string, url: string, bounds: { x: number, y: number, width: number, height: number }) => Promise<{ success: boolean, error?: string }>
        resize: (bounds: { x: number, y: number, width: number, height: number }) => Promise<{ success: boolean, error?: string }>
        destroy: () => Promise<{ success: boolean, error?: string }>
        reload: () => Promise<{ success: boolean, error?: string }>
      }
    }
  }
}
