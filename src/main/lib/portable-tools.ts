import { spawn, SpawnOptions } from 'child_process'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import https from 'https'
import http from 'http'
import { createWriteStream, existsSync, mkdirSync } from 'fs'
import { pipeline } from 'stream/promises'
import { createGunzip } from 'zlib'

// Tool definitions with download URLs
interface ToolDefinition {
  name: string
  version: string
  downloadUrl: string
  executable: string
  checkArgs: string[]
  extractType: 'zip' | 'exe' | 'tar.gz'
}

const TOOLS: Record<string, ToolDefinition> = {
  terraform: {
    name: 'Terraform',
    version: '1.6.6',
    downloadUrl: 'https://releases.hashicorp.com/terraform/1.6.6/terraform_1.6.6_windows_amd64.zip',
    executable: 'terraform.exe',
    checkArgs: ['version'],
    extractType: 'zip'
  },
  git: {
    name: 'Git',
    version: '2.43.0',
    downloadUrl: 'https://github.com/git-for-windows/git/releases/download/v2.43.0.windows.1/PortableGit-2.43.0-64-bit.7z.exe',
    executable: 'cmd/git.exe',
    checkArgs: ['--version'],
    extractType: 'exe'
  }
}

// Get the tools directory path
export function getToolsDir(): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'portable-tools')
}

// Get path to a specific tool executable
export function getToolPath(toolName: string): string | null {
  const tool = TOOLS[toolName]
  if (!tool) return null
  
  const toolsDir = getToolsDir()
  const toolPath = path.join(toolsDir, toolName, tool.executable)
  
  if (existsSync(toolPath)) {
    return toolPath
  }
  
  return null
}

// Check if a tool is installed (portable or system)
export async function isToolInstalled(toolName: string): Promise<{ installed: boolean; portable: boolean; version?: string; path?: string }> {
  const tool = TOOLS[toolName]
  if (!tool) {
    return { installed: false, portable: false }
  }

  // First check for portable version
  const portablePath = getToolPath(toolName)
  if (portablePath) {
    try {
      const version = await getToolVersion(portablePath, tool.checkArgs)
      return { installed: true, portable: true, version, path: portablePath }
    } catch {
      // Portable exists but broken, fall through to system check
    }
  }

  // Check system PATH
  try {
    const version = await getToolVersion(toolName, tool.checkArgs)
    return { installed: true, portable: false, version }
  } catch {
    return { installed: false, portable: false }
  }
}

// Get version of a tool
async function getToolVersion(execPath: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(execPath, args)
    let output = ''
    
    proc.stdout.on('data', (data) => {
      output += data.toString()
    })
    
    proc.stderr.on('data', (data) => {
      output += data.toString()
    })
    
    proc.on('error', reject)
    proc.on('close', (code) => {
      if (code === 0) {
        // Extract version from output
        const match = output.match(/(\d+\.\d+\.\d+)/)
        resolve(match ? match[1] : 'unknown')
      } else {
        reject(new Error(`Exit code ${code}`))
      }
    })
  })
}

// Spawn a tool process, preferring portable version
export function spawnTool(
  toolName: string, 
  args: string[], 
  options?: SpawnOptions
): ReturnType<typeof spawn> {
  const portablePath = getToolPath(toolName)
  const execPath = portablePath || toolName
  
  // If using portable git, set up environment
  if (toolName === 'git' && portablePath) {
    const gitDir = path.dirname(path.dirname(portablePath))
    options = {
      ...options,
      env: {
        ...process.env,
        ...options?.env,
        GIT_EXEC_PATH: path.join(gitDir, 'mingw64', 'libexec', 'git-core'),
      }
    }
  }
  
  return spawn(execPath, args, options || {})
}

// Download a file
async function downloadFile(url: string, destPath: string, onProgress?: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(destPath)
    const protocol = url.startsWith('https') ? https : http
    
    const request = protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location
        if (redirectUrl) {
          file.close()
          fs.unlinkSync(destPath)
          downloadFile(redirectUrl, destPath, onProgress).then(resolve).catch(reject)
          return
        }
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`))
        return
      }
      
      const totalSize = parseInt(response.headers['content-length'] || '0', 10)
      let downloadedSize = 0
      
      response.on('data', (chunk) => {
        downloadedSize += chunk.length
        if (totalSize > 0 && onProgress) {
          onProgress(Math.round((downloadedSize / totalSize) * 100))
        }
      })
      
      response.pipe(file)
      
      file.on('finish', () => {
        file.close()
        resolve()
      })
    })
    
    request.on('error', (err) => {
      fs.unlink(destPath, () => {})
      reject(err)
    })
  })
}

// Extract ZIP file (simplified - uses PowerShell on Windows)
async function extractZip(zipPath: string, destDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ps = spawn('powershell', [
      '-NoProfile',
      '-Command',
      `Expand-Archive -Path "${zipPath}" -DestinationPath "${destDir}" -Force`
    ])
    
    ps.on('error', reject)
    ps.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`Extraction failed with code ${code}`))
      }
    })
  })
}

// Download and install a portable tool
export async function downloadTool(
  toolName: string, 
  onProgress?: (status: string, percent: number) => void
): Promise<{ success: boolean; error?: string; path?: string }> {
  const tool = TOOLS[toolName]
  if (!tool) {
    return { success: false, error: `Unknown tool: ${toolName}` }
  }
  
  const toolsDir = getToolsDir()
  const toolDir = path.join(toolsDir, toolName)
  const tempDir = path.join(toolsDir, 'temp')
  
  try {
    // Create directories
    if (!existsSync(toolsDir)) {
      mkdirSync(toolsDir, { recursive: true })
    }
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true })
    }
    
    const fileName = path.basename(tool.downloadUrl)
    const downloadPath = path.join(tempDir, fileName)
    
    // Download
    onProgress?.('Downloading...', 0)
    await downloadFile(tool.downloadUrl, downloadPath, (percent) => {
      onProgress?.('Downloading...', percent)
    })
    
    // Extract
    onProgress?.('Extracting...', 100)
    
    if (tool.extractType === 'zip') {
      if (!existsSync(toolDir)) {
        mkdirSync(toolDir, { recursive: true })
      }
      await extractZip(downloadPath, toolDir)
    } else if (tool.extractType === 'exe') {
      // For PortableGit, it's a self-extracting archive
      // We need to run it with -o to extract
      if (toolName === 'git') {
        if (!existsSync(toolDir)) {
          mkdirSync(toolDir, { recursive: true })
        }
        
        await new Promise<void>((resolve, reject) => {
          const proc = spawn(downloadPath, ['-o', toolDir, '-y'], { 
            windowsHide: true 
          })
          proc.on('error', reject)
          proc.on('close', (code) => {
            if (code === 0) {
              resolve()
            } else {
              reject(new Error(`Extraction failed with code ${code}`))
            }
          })
        })
      }
    }
    
    // Clean up temp file
    try {
      fs.unlinkSync(downloadPath)
    } catch {}
    
    // Verify installation
    const toolPath = getToolPath(toolName)
    if (toolPath && existsSync(toolPath)) {
      return { success: true, path: toolPath }
    } else {
      return { success: false, error: 'Tool installed but executable not found' }
    }
    
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// Get status of all tools
export async function getToolsStatus(): Promise<Record<string, { installed: boolean; portable: boolean; version?: string }>> {
  const status: Record<string, { installed: boolean; portable: boolean; version?: string }> = {}
  
  for (const toolName of Object.keys(TOOLS)) {
    status[toolName] = await isToolInstalled(toolName)
  }
  
  return status
}
