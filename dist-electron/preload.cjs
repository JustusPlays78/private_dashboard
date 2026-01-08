"use strict";

// src/main/preload.ts
var import_electron = require("electron");
import_electron.contextBridge.exposeInMainWorld("electronAPI", {
  // App Info
  app: {
    getInfo: () => import_electron.ipcRenderer.invoke("app:getInfo")
  },
  // Auth
  auth: {
    status: () => import_electron.ipcRenderer.invoke("auth:status"),
    initialize: (password) => import_electron.ipcRenderer.invoke("auth:initialize", password),
    unlock: (password) => import_electron.ipcRenderer.invoke("auth:unlock", password),
    lock: () => import_electron.ipcRenderer.invoke("auth:lock"),
    heartbeat: () => import_electron.ipcRenderer.invoke("auth:heartbeat"),
    changePassword: (currentPassword, newPassword) => import_electron.ipcRenderer.invoke("auth:changePassword", currentPassword, newPassword),
    onLocked: (callback) => {
      import_electron.ipcRenderer.on("session:locked", callback);
      return () => import_electron.ipcRenderer.removeListener("session:locked", callback);
    }
  },
  // Dashboard
  dashboard: {
    stats: () => import_electron.ipcRenderer.invoke("dashboard:stats")
  },
  // GitLab
  gitlab: {
    configure: (baseUrl, token) => import_electron.ipcRenderer.invoke("gitlab:configure", baseUrl, token),
    getConfig: () => import_electron.ipcRenderer.invoke("gitlab:getConfig"),
    disconnect: () => import_electron.ipcRenderer.invoke("gitlab:disconnect"),
    listProjects: () => import_electron.ipcRenderer.invoke("gitlab:listProjects"),
    searchProjects: (query) => import_electron.ipcRenderer.invoke("gitlab:searchProjects", query),
    getProject: (projectId) => import_electron.ipcRenderer.invoke("gitlab:getProject", projectId),
    getTree: (projectId, path, ref) => import_electron.ipcRenderer.invoke("gitlab:getTree", projectId, path, ref),
    clone: (projectId) => import_electron.ipcRenderer.invoke("gitlab:clone", projectId),
    pull: (projectId) => import_electron.ipcRenderer.invoke("gitlab:pull", projectId),
    checkGit: () => import_electron.ipcRenderer.invoke("gitlab:checkGit"),
    getClonedProjects: () => import_electron.ipcRenderer.invoke("gitlab:getClonedProjects"),
    getClonedProjectsByInstance: (instanceUrl) => import_electron.ipcRenderer.invoke("gitlab:getClonedProjectsByInstance", instanceUrl),
    assignProjectToInstance: (projectId, instanceUrl) => import_electron.ipcRenderer.invoke("gitlab:assignProjectToInstance", projectId, instanceUrl),
    deleteClonedProject: (projectId) => import_electron.ipcRenderer.invoke("gitlab:deleteClonedProject", projectId),
    listGroups: () => import_electron.ipcRenderer.invoke("gitlab:listGroups"),
    searchGroups: (query) => import_electron.ipcRenderer.invoke("gitlab:searchGroups", query),
    getGroupProjects: (groupId) => import_electron.ipcRenderer.invoke("gitlab:getGroupProjects", groupId),
    getTerraformStates: (projectId) => import_electron.ipcRenderer.invoke("gitlab:getTerraformStates", projectId),
    listBranches: (projectPath) => import_electron.ipcRenderer.invoke("gitlab:listBranches", projectPath),
    switchBranch: (projectPath, branch) => import_electron.ipcRenderer.invoke("gitlab:switchBranch", projectPath, branch)
  },
  // Terraform
  terraform: {
    check: () => import_electron.ipcRenderer.invoke("terraform:check"),
    init: (config) => import_electron.ipcRenderer.invoke("terraform:init", config),
    plan: (config) => import_electron.ipcRenderer.invoke("terraform:plan", config),
    apply: (config, autoApprove) => import_electron.ipcRenderer.invoke("terraform:apply", config, autoApprove),
    destroy: (config, autoApprove) => import_electron.ipcRenderer.invoke("terraform:destroy", config, autoApprove),
    show: (projectPath) => import_electron.ipcRenderer.invoke("terraform:show", projectPath),
    findVarFiles: (projectPath) => import_electron.ipcRenderer.invoke("terraform:findVarFiles", projectPath)
  },
  // Deployments
  deployments: {
    getAll: () => import_electron.ipcRenderer.invoke("deployments:getAll"),
    get: (id) => import_electron.ipcRenderer.invoke("deployments:get", id),
    getByProject: (projectId) => import_electron.ipcRenderer.invoke("deployments:getByProject", projectId)
  },
  // Notes
  notes: {
    get: () => import_electron.ipcRenderer.invoke("notes:get"),
    save: (data) => import_electron.ipcRenderer.invoke("notes:save", data)
  },
  // Note Items (tree structure)
  noteItems: {
    getAll: () => import_electron.ipcRenderer.invoke("noteItems:getAll"),
    get: (id) => import_electron.ipcRenderer.invoke("noteItems:get", id),
    create: (item) => import_electron.ipcRenderer.invoke("noteItems:create", item),
    update: (id, updates) => import_electron.ipcRenderer.invoke("noteItems:update", id, updates),
    delete: (id) => import_electron.ipcRenderer.invoke("noteItems:delete", id)
  },
  // IFrame Pages
  iframes: {
    getAll: () => import_electron.ipcRenderer.invoke("iframes:getAll"),
    get: (id) => import_electron.ipcRenderer.invoke("iframes:get", id),
    create: (data) => import_electron.ipcRenderer.invoke("iframes:create", data),
    update: (id, updates) => import_electron.ipcRenderer.invoke("iframes:update", id, updates),
    delete: (id) => import_electron.ipcRenderer.invoke("iframes:delete", id)
  },
  // Secrets Manager
  secrets: {
    getAll: () => import_electron.ipcRenderer.invoke("secrets:getAll"),
    get: (id) => import_electron.ipcRenderer.invoke("secrets:get", id),
    create: (data) => import_electron.ipcRenderer.invoke("secrets:create", data),
    update: (id, updates) => import_electron.ipcRenderer.invoke("secrets:update", id, updates),
    delete: (id) => import_electron.ipcRenderer.invoke("secrets:delete", id),
    getCategories: () => import_electron.ipcRenderer.invoke("secrets:getCategories")
  },
  // AWS
  aws: {
    configure: (credentials) => import_electron.ipcRenderer.invoke("aws:configure", credentials),
    testConnection: (credentials) => import_electron.ipcRenderer.invoke("aws:testConnection", credentials),
    getResources: (credentials) => import_electron.ipcRenderer.invoke("aws:getResources", credentials),
    getEC2Instances: (credentials) => import_electron.ipcRenderer.invoke("aws:getEC2Instances", credentials),
    getS3Buckets: (credentials) => import_electron.ipcRenderer.invoke("aws:getS3Buckets", credentials),
    getLambdaFunctions: (credentials) => import_electron.ipcRenderer.invoke("aws:getLambdaFunctions", credentials),
    getRDSInstances: (credentials) => import_electron.ipcRenderer.invoke("aws:getRDSInstances", credentials)
  },
  // BrowserView for iframe pages
  browserView: {
    load: (pageId, url, bounds) => import_electron.ipcRenderer.invoke("browserview:load", pageId, url, bounds),
    resize: (bounds) => import_electron.ipcRenderer.invoke("browserview:resize", bounds),
    destroy: () => import_electron.ipcRenderer.invoke("browserview:destroy"),
    reload: () => import_electron.ipcRenderer.invoke("browserview:reload")
  },
  // Portable Tools Management
  tools: {
    getStatus: () => import_electron.ipcRenderer.invoke("tools:getStatus"),
    download: (toolName) => import_electron.ipcRenderer.invoke("tools:download", toolName),
    isInstalled: (toolName) => import_electron.ipcRenderer.invoke("tools:isInstalled", toolName)
  }
});
