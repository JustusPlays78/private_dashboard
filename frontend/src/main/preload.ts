import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Auth
  auth: {
    status: () => ipcRenderer.invoke('auth:status'),
    initialize: (password: string) => ipcRenderer.invoke('auth:initialize', password),
    unlock: (password: string) => ipcRenderer.invoke('auth:unlock', password),
    lock: () => ipcRenderer.invoke('auth:lock'),
    heartbeat: () => ipcRenderer.invoke('auth:heartbeat'),
    onLocked: (callback: () => void) => {
      ipcRenderer.on('session:locked', callback)
      return () => ipcRenderer.removeListener('session:locked', callback)
    }
  },

  // Dashboard
  dashboard: {
    stats: () => ipcRenderer.invoke('dashboard:stats')
  },

  // GitLab
  gitlab: {
    configure: (baseUrl: string, token: string) => ipcRenderer.invoke('gitlab:configure', baseUrl, token),
    getConfig: () => ipcRenderer.invoke('gitlab:getConfig'),
    disconnect: () => ipcRenderer.invoke('gitlab:disconnect'),
    listProjects: () => ipcRenderer.invoke('gitlab:listProjects'),
    searchProjects: (query: string) => ipcRenderer.invoke('gitlab:searchProjects', query),
    getProject: (projectId: number | string) => ipcRenderer.invoke('gitlab:getProject', projectId),
    getTree: (projectId: number, path: string, ref: string) => ipcRenderer.invoke('gitlab:getTree', projectId, path, ref),
    clone: (projectId: number) => ipcRenderer.invoke('gitlab:clone', projectId),
    pull: (projectId: number) => ipcRenderer.invoke('gitlab:pull', projectId),
    checkGit: () => ipcRenderer.invoke('gitlab:checkGit'),
    getClonedProjects: () => ipcRenderer.invoke('gitlab:getClonedProjects'),
    getClonedProjectsByInstance: (instanceUrl: string) => ipcRenderer.invoke('gitlab:getClonedProjectsByInstance', instanceUrl),
    assignProjectToInstance: (projectId: number, instanceUrl: string) => ipcRenderer.invoke('gitlab:assignProjectToInstance', projectId, instanceUrl),
    deleteClonedProject: (projectId: number) => ipcRenderer.invoke('gitlab:deleteClonedProject', projectId),
    listGroups: () => ipcRenderer.invoke('gitlab:listGroups'),
    searchGroups: (query: string) => ipcRenderer.invoke('gitlab:searchGroups', query),
    getGroupProjects: (groupId: number) => ipcRenderer.invoke('gitlab:getGroupProjects', groupId),
    getTerraformStates: (projectId: number) => ipcRenderer.invoke('gitlab:getTerraformStates', projectId),
    listBranches: (projectPath: string) => ipcRenderer.invoke('gitlab:listBranches', projectPath),
    switchBranch: (projectPath: string, branch: string) => ipcRenderer.invoke('gitlab:switchBranch', projectPath, branch)
  },

  // Terraform
  terraform: {
    check: () => ipcRenderer.invoke('terraform:check'),
    init: (config: any) => ipcRenderer.invoke('terraform:init', config),
    plan: (config: any) => ipcRenderer.invoke('terraform:plan', config),
    apply: (config: any, autoApprove: boolean) => ipcRenderer.invoke('terraform:apply', config, autoApprove),
    destroy: (config: any, autoApprove: boolean) => ipcRenderer.invoke('terraform:destroy', config, autoApprove),
    show: (projectPath: string) => ipcRenderer.invoke('terraform:show', projectPath),
    findVarFiles: (projectPath: string) => ipcRenderer.invoke('terraform:findVarFiles', projectPath)
  },

  // Deployments
  deployments: {
    getAll: () => ipcRenderer.invoke('deployments:getAll'),
    get: (id: number) => ipcRenderer.invoke('deployments:get', id),
    getByProject: (projectId: number) => ipcRenderer.invoke('deployments:getByProject', projectId)
  },

  // Notes
  notes: {
    get: () => ipcRenderer.invoke('notes:get'),
    save: (data: string) => ipcRenderer.invoke('notes:save', data)
  },

  // Note Items (tree structure)
  noteItems: {
    getAll: () => ipcRenderer.invoke('noteItems:getAll'),
    get: (id: string) => ipcRenderer.invoke('noteItems:get', id),
    create: (item: any) => ipcRenderer.invoke('noteItems:create', item),
    update: (id: string, updates: any) => ipcRenderer.invoke('noteItems:update', id, updates),
    delete: (id: string) => ipcRenderer.invoke('noteItems:delete', id)
  },

  // IFrame Pages
  iframes: {
    getAll: () => ipcRenderer.invoke('iframes:getAll'),
    get: (id: string) => ipcRenderer.invoke('iframes:get', id),
    create: (data: { name: string; url: string; category: string; icon: string; position: number }) => ipcRenderer.invoke('iframes:create', data),
    update: (id: string, updates: any) => ipcRenderer.invoke('iframes:update', id, updates),
    delete: (id: string) => ipcRenderer.invoke('iframes:delete', id)
  },

  // Secrets Manager
  secrets: {
    getAll: () => ipcRenderer.invoke('secrets:getAll'),
    get: (id: string) => ipcRenderer.invoke('secrets:get', id),
    create: (data: { name: string; category: string; username?: string; password?: string; apiKey?: string; notes?: string; url?: string }) => 
      ipcRenderer.invoke('secrets:create', data),
    update: (id: string, updates: any) => ipcRenderer.invoke('secrets:update', id, updates),
    delete: (id: string) => ipcRenderer.invoke('secrets:delete', id),
    getCategories: () => ipcRenderer.invoke('secrets:getCategories')
  },

  // AWS
  aws: {
    configure: (credentials: { accessKeyId: string; secretAccessKey: string; sessionToken?: string; region?: string }) =>
      ipcRenderer.invoke('aws:configure', credentials),
    testConnection: (credentials: { accessKeyId: string; secretAccessKey: string; sessionToken?: string; region?: string }) =>
      ipcRenderer.invoke('aws:testConnection', credentials),
    getResources: (credentials: { accessKeyId: string; secretAccessKey: string; sessionToken?: string; region?: string }) =>
      ipcRenderer.invoke('aws:getResources', credentials),
    getEC2Instances: (credentials: { accessKeyId: string; secretAccessKey: string; sessionToken?: string; region?: string }) =>
      ipcRenderer.invoke('aws:getEC2Instances', credentials),
    getS3Buckets: (credentials: { accessKeyId: string; secretAccessKey: string; sessionToken?: string; region?: string }) =>
      ipcRenderer.invoke('aws:getS3Buckets', credentials),
    getLambdaFunctions: (credentials: { accessKeyId: string; secretAccessKey: string; sessionToken?: string; region?: string }) =>
      ipcRenderer.invoke('aws:getLambdaFunctions', credentials),
    getRDSInstances: (credentials: { accessKeyId: string; secretAccessKey: string; sessionToken?: string; region?: string }) =>
      ipcRenderer.invoke('aws:getRDSInstances', credentials)
  },

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
      auth: {
        status: () => Promise<{ initialized: boolean; unlocked: boolean }>
        initialize: (password: string) => Promise<{ success: boolean; error?: string }>
        unlock: (password: string) => Promise<{ success: boolean; error?: string }>
        lock: () => Promise<{ success: boolean }>
        heartbeat: () => Promise<{ success: boolean; time_until_lock: number }>
        onLocked: (callback: () => void) => () => void
      }
      dashboard: {
        stats: () => Promise<any>
      }
      gitlab: {
        configure: (baseUrl: string, token: string) => Promise<{ success: boolean; base_url?: string; error?: string }>
        getConfig: () => Promise<{ base_url: string; configured: boolean } | null>
        listProjects: () => Promise<{ success: boolean; projects?: any[]; count?: number; error?: string }>
        searchProjects: (query: string) => Promise<{ success: boolean; projects?: any[]; count?: number; error?: string }>
        getProject: (projectId: number | string) => Promise<{ success: boolean; project?: any; error?: string }>
        getTree: (projectId: number, path: string, ref: string) => Promise<{ success: boolean; tree?: any[]; error?: string }>
        clone: (projectId: number) => Promise<{ success: boolean; project_path?: string; error?: string; [key: string]: any }>
        pull: (projectId: number) => Promise<{ success: boolean; error?: string; [key: string]: any }>
        checkGit: () => Promise<{ installed: boolean }>
        getClonedProjects: () => Promise<{ success: boolean; projects?: any[] }>
        deleteClonedProject: (projectId: number) => Promise<{ success: boolean }>
        listGroups: () => Promise<{ success: boolean; groups?: any[]; error?: string }>
        searchGroups: (query: string) => Promise<{ success: boolean; groups?: any[]; error?: string }>
        getGroupProjects: (groupId: number) => Promise<{ success: boolean; projects?: any[]; error?: string }>
        getTerraformStates: (projectId: number) => Promise<{ success: boolean; states?: any[]; error?: string }>
        listBranches: (projectPath: string) => Promise<{ success: boolean; branches?: string[]; current?: string; error?: string }>
        switchBranch: (projectPath: string, branch: string) => Promise<{ success: boolean; error?: string }>
      }
      terraform: {
        check: () => Promise<{ installed: boolean; version?: string }>
        init: (config: any) => Promise<{ success: boolean; output?: string; error?: string; duration?: number }>
        plan: (config: any) => Promise<{ success: boolean; output?: string; error?: string; duration?: number; summary?: any }>
        apply: (config: any, autoApprove: boolean) => Promise<{ success: boolean; output?: string; error?: string; duration?: number; summary?: any }>
        destroy: (config: any, autoApprove: boolean) => Promise<{ success: boolean; output?: string; error?: string; duration?: number; summary?: any }>
        show: (projectPath: string) => Promise<{ success: boolean; output?: string; error?: string }>
        findVarFiles: (projectPath: string) => Promise<{ success: boolean; var_files?: string[] }>
      }
      deployments: {
        getAll: () => Promise<{ success: boolean; deployments?: any[] }>
        get: (id: number) => Promise<{ success: boolean; deployment?: any }>
        getByProject: (projectId: number) => Promise<{ success: boolean; deployments?: any[] }>
      }
      notes: {
        get: () => Promise<{ success: boolean; data?: string }>
        save: (data: string) => Promise<{ success: boolean }>
      }
      noteItems: {
        getAll: () => Promise<{ success: boolean; items?: any[] }>
        get: (id: string) => Promise<{ success: boolean; item?: any }>
        create: (item: any) => Promise<{ success: boolean; id?: string }>
        update: (id: string, updates: any) => Promise<{ success: boolean }>
        delete: (id: string) => Promise<{ success: boolean }>
      }
      zabbix: {
        getAll: () => Promise<{ success: boolean; servers?: any[] }>
        get: (id: string) => Promise<{ success: boolean; server?: any }>
        create: (data: { name: string; url: string; position: number }) => Promise<{ success: boolean; server?: any }>
        update: (id: string, data: { name: string; url: string; position: number }) => Promise<{ success: boolean }>
        delete: (id: string) => Promise<{ success: boolean }>
      }
      iframes: {
        getAll: () => Promise<{ success: boolean; pages?: any[] }>
        get: (id: string) => Promise<{ success: boolean; page?: any }>
        create: (data: { name: string; url: string; category: string; icon: string; position: number }) => Promise<{ success: boolean; page?: any }>
        update: (id: string, updates: any) => Promise<{ success: boolean }>
        delete: (id: string) => Promise<{ success: boolean }>
      }
      secrets: {
        getAll: () => Promise<{ success: boolean; secrets?: any[] }>
        get: (id: string) => Promise<{ success: boolean; secret?: any }>
        create: (data: { name: string; category: string; username?: string; password?: string; apiKey?: string; notes?: string; url?: string }) => Promise<{ success: boolean; secret?: any }>
        update: (id: string, updates: any) => Promise<{ success: boolean }>
        delete: (id: string) => Promise<{ success: boolean }>
        getCategories: () => Promise<{ success: boolean; categories?: string[] }>
      }
      aws: {
        configure: (credentials: any) => Promise<{ success: boolean; identity?: any; error?: string }>
        testConnection: (credentials: any) => Promise<{ success: boolean; identity?: any; error?: string }>
        getResources: (credentials: any) => Promise<{ success: boolean; resources?: any; error?: string }>
        getEC2Instances: (credentials: any) => Promise<{ success: boolean; instances?: any[]; error?: string }>
        getS3Buckets: (credentials: any) => Promise<{ success: boolean; buckets?: any[]; error?: string }>
        getLambdaFunctions: (credentials: any) => Promise<{ success: boolean; functions?: any[]; error?: string }>
        getRDSInstances: (credentials: any) => Promise<{ success: boolean; instances?: any[]; error?: string }>
      }
      browserView: {
        load: (pageId: string, url: string, bounds: { x: number, y: number, width: number, height: number }) => Promise<{ success: boolean, error?: string }>
        resize: (bounds: { x: number, y: number, width: number, height: number }) => Promise<{ success: boolean, error?: string }>
        destroy: () => Promise<{ success: boolean, error?: string }>
        reload: () => Promise<{ success: boolean, error?: string }>
      }
    }
  }
}
