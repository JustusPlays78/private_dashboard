import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'

export interface GitLabProject {
  id: number
  name: string
  description: string
  path_with_namespace: string
  http_url_to_repo: string
  ssh_url_to_repo: string
  web_url: string
  default_branch: string
  created_at: string
  last_activity_at: string
}

export interface GitLabGroup {
  id: number
  name: string
  path: string
  full_path: string
  description: string
  web_url: string
}

export interface TreeNode {
  id: string
  name: string
  type: string
  path: string
  mode: string
}

export interface TerraformState {
  name: string
  locked: boolean
  lock_info?: any
}

export class GitLabClient {
  private baseUrl: string
  private token: string

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    if (!this.baseUrl.startsWith('http://') && !this.baseUrl.startsWith('https://')) {
      this.baseUrl = 'https://' + this.baseUrl
    }
    this.token = token
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'PRIVATE-TOKEN': this.token,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`GitLab API error (${response.status}): ${error}`)
    }

    return response.json()
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.request('/api/v4/user')
      return true
    } catch {
      return false
    }
  }

  async listProjects(): Promise<GitLabProject[]> {
    return this.request('/api/v4/projects?membership=true&per_page=100')
  }

  async searchProjects(query: string): Promise<GitLabProject[]> {
    return this.request(`/api/v4/projects?search=${encodeURIComponent(query)}&membership=true&per_page=50`)
  }

  async getProject(projectId: number | string): Promise<GitLabProject> {
    return this.request(`/api/v4/projects/${encodeURIComponent(projectId)}`)
  }

  async getRepositoryTree(projectId: number, path: string = '', ref: string = 'main'): Promise<TreeNode[]> {
    return this.request(
      `/api/v4/projects/${projectId}/repository/tree?path=${encodeURIComponent(path)}&ref=${encodeURIComponent(ref)}&recursive=false`
    )
  }

  async listGroups(): Promise<GitLabGroup[]> {
    return this.request('/api/v4/groups?per_page=100')
  }

  async searchGroups(query: string): Promise<GitLabGroup[]> {
    return this.request(`/api/v4/groups?search=${encodeURIComponent(query)}&per_page=50`)
  }

  async getGroupProjects(groupId: number): Promise<GitLabProject[]> {
    return this.request(`/api/v4/groups/${groupId}/projects?per_page=100&include_subgroups=true`)
  }

  async getTerraformStates(projectId: number): Promise<TerraformState[]> {
    try {
      return await this.request(`/api/v4/projects/${projectId}/terraform/state`)
    } catch {
      return []
    }
  }

  async getFileContent(projectId: number, filePath: string, ref: string = 'main'): Promise<string> {
    const response = await this.request<{ content: string }>(
      `/api/v4/projects/${projectId}/repository/files/${encodeURIComponent(filePath)}?ref=${encodeURIComponent(ref)}`
    )
    return Buffer.from(response.content, 'base64').toString('utf-8')
  }
}

export class GitCloner {
  private workDir: string

  constructor() {
    const appDataDir = app.getPath('userData')
    this.workDir = path.join(appDataDir, 'gitlab-projects')
    
    if (!fs.existsSync(this.workDir)) {
      fs.mkdirSync(this.workDir, { recursive: true })
    }
  }

  async checkGitInstalled(): Promise<boolean> {
    return new Promise((resolve) => {
      const git = spawn('git', ['--version'])
      git.on('error', () => resolve(false))
      git.on('close', (code) => resolve(code === 0))
    })
  }

  async cloneRepository(httpUrl: string, pathWithNamespace: string, token: string): Promise<string> {
    const projectPath = path.join(this.workDir, pathWithNamespace.replace(/\//g, path.sep))
    
    // Remove existing directory
    if (fs.existsSync(projectPath)) {
      fs.rmSync(projectPath, { recursive: true, force: true })
    }

    // Create parent directory
    fs.mkdirSync(path.dirname(projectPath), { recursive: true })

    // Build authenticated URL with URL-encoded token to handle special characters
    const encodedToken = encodeURIComponent(token)
    const urlWithAuth = httpUrl.replace('https://', `https://oauth2:${encodedToken}@`)

    return new Promise((resolve, reject) => {
      const git = spawn('git', ['clone', urlWithAuth, projectPath], {
        cwd: this.workDir
      })

      let stderr = ''
      git.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      git.on('close', (code) => {
        if (code === 0) {
          resolve(projectPath)
        } else {
          reject(new Error(`Git clone failed: ${stderr}`))
        }
      })

      git.on('error', (err) => {
        reject(err)
      })
    })
  }

  async pullRepository(projectPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const git = spawn('git', ['pull'], { cwd: projectPath })
      
      let stderr = ''
      git.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      git.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`Git pull failed: ${stderr}`))
        }
      })

      git.on('error', reject)
    })
  }

  async getCurrentBranch(projectPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const git = spawn('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: projectPath })
      
      let stdout = ''
      git.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      git.on('close', (code) => {
        if (code === 0) {
          resolve(stdout.trim())
        } else {
          reject(new Error('Failed to get branch'))
        }
      })

      git.on('error', reject)
    })
  }

  async getLastCommit(projectPath: string): Promise<{ hash: string; message: string }> {
    return new Promise((resolve, reject) => {
      const git = spawn('git', ['log', '-1', '--format=%H|%s'], { cwd: projectPath })
      
      let stdout = ''
      git.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      git.on('close', (code) => {
        if (code === 0) {
          const [hash, message] = stdout.trim().split('|')
          resolve({ hash, message })
        } else {
          reject(new Error('Failed to get last commit'))
        }
      })

      git.on('error', reject)
    })
  }

  async listBranches(projectPath: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const git = spawn('git', ['branch', '-a'], { cwd: projectPath })
      
      let stdout = ''
      git.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      git.on('close', (code) => {
        if (code === 0) {
          const branches = stdout.split('\n')
            .map(b => b.trim().replace('* ', ''))
            .filter(b => b && !b.includes('->'))
          resolve(branches)
        } else {
          reject(new Error('Failed to list branches'))
        }
      })

      git.on('error', reject)
    })
  }

  async switchBranch(projectPath: string, branch: string): Promise<void> {
    // Handle remote branches
    const localBranch = branch.replace('remotes/origin/', '')
    
    return new Promise((resolve, reject) => {
      const git = spawn('git', ['checkout', localBranch], { cwd: projectPath })
      
      let stderr = ''
      git.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      git.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`Failed to switch branch: ${stderr}`))
        }
      })

      git.on('error', reject)
    })
  }

  listTerraformFiles(projectPath: string): string[] {
    const tfFiles: string[] = []
    
    function scanDir(dir: string) {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true })
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name)
          if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            scanDir(fullPath)
          } else if (entry.isFile() && entry.name.endsWith('.tf')) {
            tfFiles.push(path.relative(projectPath, fullPath))
          }
        }
      } catch {
        // Ignore permission errors
      }
    }

    scanDir(projectPath)
    return tfFiles
  }
}
