import { ipcMain, BrowserWindow } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import { getDatabase, closeDatabase } from './database'
import { GitLabClient, GitCloner } from './gitlab'
import * as terraform from './terraform'
import { AWSClient, AWSCredentials } from './aws'

let gitLabClient: GitLabClient | null = null
let gitCloner: GitCloner | null = null
let awsClient: AWSClient | null = null
let sessionTimeout: NodeJS.Timeout | null = null
let lastActivity = Date.now()
const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes

function getGitCloner(): GitCloner {
  if (!gitCloner) {
    gitCloner = new GitCloner()
  }
  return gitCloner
}

function updateActivity() {
  lastActivity = Date.now()
}

function startSessionWatcher(mainWindow: BrowserWindow | null) {
  if (sessionTimeout) {
    clearInterval(sessionTimeout)
  }

  sessionTimeout = setInterval(() => {
    const db = getDatabase()
    if (db.getStatus().unlocked && Date.now() - lastActivity > SESSION_TIMEOUT) {
      db.lock()
      mainWindow?.webContents.send('session:locked')
    }
  }, 10000) // Check every 10 seconds
}

function stopSessionWatcher() {
  if (sessionTimeout) {
    clearInterval(sessionTimeout)
    sessionTimeout = null
  }
}

export function setupIpcHandlers(getMainWindow: () => BrowserWindow | null) {
  // ===== Auth Handlers =====

  ipcMain.handle('auth:status', async () => {
    updateActivity()
    return getDatabase().getStatus()
  })

  ipcMain.handle('auth:initialize', async (_, password: string) => {
    try {
      await getDatabase().initialize(password)
      startSessionWatcher(getMainWindow())
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('auth:unlock', async (_, password: string) => {
    try {
      await getDatabase().unlock(password)
      startSessionWatcher(getMainWindow())
      
      // Load GitLab config if available
      const config = getDatabase().getGitLabConfig()
      if (config) {
        gitLabClient = new GitLabClient(config.baseUrl, config.token)
      }
      
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('auth:lock', async () => {
    getDatabase().lock()
    gitLabClient = null
    stopSessionWatcher()
    return { success: true }
  })

  ipcMain.handle('auth:heartbeat', async () => {
    updateActivity()
    const timeUntilLock = Math.max(0, SESSION_TIMEOUT - (Date.now() - lastActivity))
    return { 
      success: true, 
      time_until_lock: timeUntilLock / 1000 
    }
  })

  // ===== Dashboard =====

  ipcMain.handle('dashboard:stats', async () => {
    updateActivity()
    const db = getDatabase()
    const deployments = db.getAllDeployments()
    const projects = db.getGitLabProjects()
    
    return {
      terraform_states: projects.length,
      active_deployments: deployments.filter(d => d.status === 'running').length,
      total_deployments: deployments.length
    }
  })

  // ===== GitLab Handlers =====

  ipcMain.handle('gitlab:configure', async (_, baseUrl: string, token: string) => {
    updateActivity()
    try {
      const client = new GitLabClient(baseUrl, token)
      const connected = await client.testConnection()
      
      if (!connected) {
        return { success: false, error: 'Failed to connect to GitLab' }
      }

      getDatabase().saveGitLabConfig(baseUrl, token)
      gitLabClient = client
      
      return { success: true, base_url: baseUrl }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('gitlab:getConfig', async () => {
    updateActivity()
    const config = getDatabase().getGitLabConfig()
    if (!config) return null
    return { base_url: config.baseUrl, configured: true }
  })

  ipcMain.handle('gitlab:disconnect', async () => {
    updateActivity()
    try {
      getDatabase().deleteGitLabConfig()
      gitLabClient = null
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('gitlab:listProjects', async () => {
    updateActivity()
    if (!gitLabClient) {
      return { success: false, error: 'GitLab not configured' }
    }
    
    try {
      const projects = await gitLabClient.listProjects()
      return { success: true, projects, count: projects.length }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('gitlab:searchProjects', async (_, query: string) => {
    updateActivity()
    if (!gitLabClient) {
      return { success: false, error: 'GitLab not configured' }
    }
    
    try {
      const projects = await gitLabClient.searchProjects(query)
      return { success: true, projects, count: projects.length }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('gitlab:getProject', async (_, projectId: number | string) => {
    updateActivity()
    if (!gitLabClient) {
      return { success: false, error: 'GitLab not configured' }
    }
    
    try {
      const project = await gitLabClient.getProject(projectId)
      return { success: true, project }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('gitlab:getTree', async (_, projectId: number, path: string, ref: string) => {
    updateActivity()
    if (!gitLabClient) {
      return { success: false, error: 'GitLab not configured' }
    }
    
    try {
      const tree = await gitLabClient.getRepositoryTree(projectId, path, ref)
      return { success: true, tree }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('gitlab:clone', async (_, projectId: number) => {
    updateActivity()
    if (!gitLabClient) {
      return { success: false, error: 'GitLab not configured' }
    }
    
    try {
      const config = getDatabase().getGitLabConfig()
      if (!config) throw new Error('GitLab not configured')
      
      const project = await gitLabClient.getProject(projectId)
      const cloner = getGitCloner()
      
      const projectPath = await cloner.cloneRepository(
        project.http_url_to_repo,
        project.path_with_namespace,
        config.token
      )

      const branch = await cloner.getCurrentBranch(projectPath)
      const commit = await cloner.getLastCommit(projectPath)
      const tfFiles = cloner.listTerraformFiles(projectPath)

      // Save to database with instance URL
      getDatabase().saveGitLabProject({
        projectId: project.id,
        name: project.name,
        pathWithNamespace: project.path_with_namespace,
        httpUrl: project.http_url_to_repo,
        defaultBranch: project.default_branch,
        localPath: projectPath,
        instanceUrl: config.baseUrl
      })

      return {
        success: true,
        project_path: projectPath,
        project_name: project.name,
        branch,
        last_commit: commit,
        terraform_files: tfFiles,
        terraform_files_count: tfFiles.length
      }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('gitlab:pull', async (_, projectId: number) => {
    updateActivity()
    try {
      const projects = getDatabase().getGitLabProjects()
      const project = projects.find(p => p.projectId === projectId)
      
      if (!project) {
        return { success: false, error: 'Project not found' }
      }

      const cloner = getGitCloner()
      await cloner.pullRepository(project.localPath)
      
      getDatabase().updateGitLabProjectPullTime(projectId)

      const branch = await cloner.getCurrentBranch(project.localPath)
      const commit = await cloner.getLastCommit(project.localPath)

      return {
        success: true,
        branch,
        last_commit: commit
      }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('gitlab:checkGit', async () => {
    updateActivity()
    const cloner = getGitCloner()
    const installed = await cloner.checkGitInstalled()
    return { installed }
  })

  ipcMain.handle('gitlab:getClonedProjects', async () => {
    updateActivity()
    const projects = getDatabase().getGitLabProjects()
    // Map to frontend expected format
    const mappedProjects = projects.map(p => ({
      ProjectID: p.projectId,
      Name: p.name,
      LocalPath: p.localPath,
      DefaultBranch: p.defaultBranch,
      ClonedAt: p.clonedAt,
      LastPull: p.lastPull,
      InstanceUrl: p.instanceUrl
    }))
    return { success: true, projects: mappedProjects }
  })

  ipcMain.handle('gitlab:getClonedProjectsByInstance', async (_, instanceUrl: string) => {
    updateActivity()
    const projects = getDatabase().getGitLabProjectsByInstance(instanceUrl)
    const mappedProjects = projects.map(p => ({
      ProjectID: p.projectId,
      Name: p.name,
      LocalPath: p.localPath,
      DefaultBranch: p.defaultBranch,
      ClonedAt: p.clonedAt,
      LastPull: p.lastPull,
      InstanceUrl: p.instanceUrl
    }))
    return { success: true, projects: mappedProjects }
  })

  ipcMain.handle('gitlab:assignProjectToInstance', async (_, projectId: number, instanceUrl: string) => {
    updateActivity()
    try {
      getDatabase().updateGitLabProjectInstance(projectId, instanceUrl)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('gitlab:deleteClonedProject', async (_, projectId: number) => {
    updateActivity()
    getDatabase().deleteGitLabProject(projectId)
    return { success: true }
  })

  ipcMain.handle('gitlab:listGroups', async () => {
    updateActivity()
    if (!gitLabClient) {
      return { success: false, error: 'GitLab not configured' }
    }
    
    try {
      const groups = await gitLabClient.listGroups()
      return { success: true, groups }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('gitlab:searchGroups', async (_, query: string) => {
    updateActivity()
    if (!gitLabClient) {
      return { success: false, error: 'GitLab not configured' }
    }
    
    try {
      const groups = await gitLabClient.searchGroups(query)
      return { success: true, groups }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('gitlab:getGroupProjects', async (_, groupId: number) => {
    updateActivity()
    if (!gitLabClient) {
      return { success: false, error: 'GitLab not configured' }
    }
    
    try {
      const projects = await gitLabClient.getGroupProjects(groupId)
      return { success: true, projects }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('gitlab:getTerraformStates', async (_, projectId: number) => {
    updateActivity()
    if (!gitLabClient) {
      return { success: false, error: 'GitLab not configured' }
    }
    
    try {
      const states = await gitLabClient.getTerraformStates(projectId)
      return { success: true, states }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('gitlab:listBranches', async (_, projectPath: string) => {
    updateActivity()
    try {
      const cloner = getGitCloner()
      const branches = await cloner.listBranches(projectPath)
      const current = await cloner.getCurrentBranch(projectPath)
      return { success: true, branches, current }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('gitlab:switchBranch', async (_, projectPath: string, branch: string) => {
    updateActivity()
    try {
      const cloner = getGitCloner()
      await cloner.switchBranch(projectPath, branch)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // ===== Terraform Handlers =====

  ipcMain.handle('terraform:check', async () => {
    updateActivity()
    const installed = await terraform.checkTerraformInstalled()
    let version = ''
    
    if (installed) {
      try {
        version = await terraform.getTerraformVersion()
      } catch {}
    }
    
    return { installed, version }
  })

  ipcMain.handle('terraform:init', async (_, config: terraform.TerraformConfig) => {
    updateActivity()
    try {
      // Get GitLab config from database
      const gitlabConfig = getDatabase().getGitLabConfig()
      if (gitlabConfig && config.repositoryId && config.stateName) {
        config.gitLabBaseUrl = gitlabConfig.baseUrl
        config.gitLabToken = gitlabConfig.token
      }

      const result = await terraform.terraformInit(config)
      return {
        success: result.exitCode === 0,
        output: result.output,
        error: result.error,
        duration: result.duration
      }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('terraform:plan', async (_, config: terraform.TerraformConfig) => {
    updateActivity()
    try {
      const result = await terraform.terraformPlan(config)
      const summary = terraform.parseTerraformSummary(result.output)
      
      return {
        success: result.exitCode === 0,
        output: result.output,
        error: result.error,
        duration: result.duration,
        summary
      }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('terraform:apply', async (_, config: terraform.TerraformConfig, autoApprove: boolean) => {
    updateActivity()
    try {
      const result = await terraform.terraformApply(config, autoApprove)
      const summary = terraform.parseTerraformSummary(result.output)
      
      return {
        success: result.exitCode === 0,
        output: result.output,
        error: result.error,
        duration: result.duration,
        summary
      }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('terraform:destroy', async (_, config: terraform.TerraformConfig, autoApprove: boolean) => {
    updateActivity()
    try {
      const result = await terraform.terraformDestroy(config, autoApprove)
      const summary = terraform.parseTerraformSummary(result.output)
      
      return {
        success: result.exitCode === 0,
        output: result.output,
        error: result.error,
        duration: result.duration,
        summary
      }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('terraform:show', async (_, projectPath: string) => {
    updateActivity()
    try {
      const result = await terraform.terraformShow(projectPath)
      return {
        success: result.exitCode === 0,
        output: result.output,
        error: result.error
      }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('terraform:findVarFiles', async (_, projectPath: string) => {
    updateActivity()
    const varFiles = terraform.findVarFiles(projectPath)
    return { success: true, var_files: varFiles }
  })

  // ===== Deployments =====

  ipcMain.handle('deployments:getAll', async () => {
    updateActivity()
    const deployments = getDatabase().getAllDeployments()
    return { success: true, deployments }
  })

  ipcMain.handle('deployments:get', async (_, id: number) => {
    updateActivity()
    const deployment = getDatabase().getDeployment(id)
    return { success: true, deployment }
  })

  ipcMain.handle('deployments:getByProject', async (_, projectId: number) => {
    updateActivity()
    const deployments = getDatabase().getProjectDeployments(projectId)
    return { success: true, deployments }
  })

  // ===== Notes =====

  ipcMain.handle('notes:get', async () => {
    updateActivity()
    const data = getDatabase().getNotes()
    return { success: true, data }
  })

  ipcMain.handle('notes:save', async (_, data: string) => {
    updateActivity()
    getDatabase().saveNotes(data)
    return { success: true }
  })

  // ===== Note Items =====

  ipcMain.handle('noteItems:getAll', async () => {
    updateActivity()
    const items = getDatabase().getAllNoteItems()
    return { success: true, items }
  })

  ipcMain.handle('noteItems:get', async (_, id: string) => {
    updateActivity()
    const item = getDatabase().getNoteItem(id)
    return { success: true, item }
  })

  ipcMain.handle('noteItems:create', async (_, item: any) => {
    updateActivity()
    const id = item.id || uuidv4()
    getDatabase().createNoteItem({ ...item, id })
    return { success: true, id }
  })

  ipcMain.handle('noteItems:update', async (_, id: string, updates: any) => {
    updateActivity()
    getDatabase().updateNoteItem(id, updates)
    return { success: true }
  })

  ipcMain.handle('noteItems:delete', async (_, id: string) => {
    updateActivity()
    getDatabase().deleteNoteItem(id)
    return { success: true }
  })

  // ===== IFrame Pages =====

  ipcMain.handle('iframes:getAll', async () => {
    updateActivity()
    const pages = getDatabase().getAllIFramePages()
    return { success: true, pages }
  })

  ipcMain.handle('iframes:get', async (_, id: string) => {
    updateActivity()
    const page = getDatabase().getIFramePage(id)
    return { success: true, page }
  })

  ipcMain.handle('iframes:create', async (_, data: { name: string; url: string; category: string; icon: string; position: number }) => {
    updateActivity()
    const page = {
      id: uuidv4(),
      ...data
    }
    getDatabase().createIFramePage(page)
    return { success: true, page }
  })

  ipcMain.handle('iframes:update', async (_, id: string, updates: any) => {
    updateActivity()
    getDatabase().updateIFramePage(id, updates)
    return { success: true }
  })

  ipcMain.handle('iframes:delete', async (_, id: string) => {
    updateActivity()
    getDatabase().deleteIFramePage(id)
    return { success: true }
  })

  // ===== Secrets =====

  ipcMain.handle('secrets:getAll', async () => {
    updateActivity()
    const secrets = getDatabase().getAllSecrets()
    return { success: true, secrets }
  })

  ipcMain.handle('secrets:get', async (_, id: string) => {
    updateActivity()
    const secret = getDatabase().getSecret(id)
    return { success: true, secret }
  })

  ipcMain.handle('secrets:create', async (_, data: {
    id?: string
    name: string
    category: string
    username?: string
    password?: string
    apiKey?: string
    notes?: string
    url?: string
  }) => {
    updateActivity()
    const secret = {
      id: data.id || uuidv4(),
      name: data.name,
      category: data.category,
      username: data.username || null,
      password: data.password || null,
      apiKey: data.apiKey || null,
      notes: data.notes || null,
      url: data.url || null
    }
    getDatabase().createSecret(secret)
    return { success: true, secret: { ...secret, password: undefined, apiKey: undefined } }
  })

  ipcMain.handle('secrets:update', async (_, id: string, updates: any) => {
    updateActivity()
    getDatabase().updateSecret(id, updates)
    return { success: true }
  })

  ipcMain.handle('secrets:delete', async (_, id: string) => {
    updateActivity()
    getDatabase().deleteSecret(id)
    return { success: true }
  })

  ipcMain.handle('secrets:getCategories', async () => {
    updateActivity()
    const categories = getDatabase().getSecretCategories()
    return { success: true, categories }
  })

  // ===== AWS =====

  ipcMain.handle('aws:configure', async (_, credentials: AWSCredentials) => {
    updateActivity()
    try {
      awsClient = new AWSClient(credentials)
      const result = await awsClient.testConnection()
      if (!result.success) {
        awsClient = null
        return { success: false, error: result.error }
      }
      return { success: true, identity: result.identity }
    } catch (error: any) {
      awsClient = null
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('aws:testConnection', async (_, credentials: AWSCredentials) => {
    updateActivity()
    try {
      const client = new AWSClient(credentials)
      return await client.testConnection()
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('aws:getResources', async (_, credentials: AWSCredentials) => {
    updateActivity()
    try {
      const client = new AWSClient(credentials)
      const resources = await client.getAllResources()
      return { success: true, resources }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('aws:getEC2Instances', async (_, credentials: AWSCredentials) => {
    updateActivity()
    try {
      const client = new AWSClient(credentials)
      const instances = await client.getEC2Instances()
      return { success: true, instances }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('aws:getS3Buckets', async (_, credentials: AWSCredentials) => {
    updateActivity()
    try {
      const client = new AWSClient(credentials)
      const buckets = await client.getS3Buckets()
      return { success: true, buckets }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('aws:getLambdaFunctions', async (_, credentials: AWSCredentials) => {
    updateActivity()
    try {
      const client = new AWSClient(credentials)
      const functions = await client.getLambdaFunctions()
      return { success: true, functions }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('aws:getRDSInstances', async (_, credentials: AWSCredentials) => {
    updateActivity()
    try {
      const client = new AWSClient(credentials)
      const instances = await client.getRDSInstances()
      return { success: true, instances }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('aws:getECSClusters', async (_, credentials: AWSCredentials) => {
    updateActivity()
    try {
      const client = new AWSClient(credentials)
      const clusters = await client.getECSClusters()
      return { success: true, clusters }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('aws:getECSServices', async (_, credentials: AWSCredentials, clusterArn?: string) => {
    updateActivity()
    try {
      const client = new AWSClient(credentials)
      const services = await client.getECSServices(clusterArn)
      return { success: true, services }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('aws:getECSTasks', async (_, credentials: AWSCredentials, clusterArn?: string) => {
    updateActivity()
    try {
      const client = new AWSClient(credentials)
      const tasks = await client.getECSTasks(clusterArn)
      return { success: true, tasks }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('aws:getLoadBalancers', async (_, credentials: AWSCredentials) => {
    updateActivity()
    try {
      const client = new AWSClient(credentials)
      const loadBalancers = await client.getLoadBalancers()
      return { success: true, loadBalancers }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('aws:getSecurityGroups', async (_, credentials: AWSCredentials) => {
    updateActivity()
    try {
      const client = new AWSClient(credentials)
      const securityGroups = await client.getSecurityGroups()
      return { success: true, securityGroups }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })
}

export function cleanupIpcHandlers() {
  stopSessionWatcher()
  closeDatabase()
}
