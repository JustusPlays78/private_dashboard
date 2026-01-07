import { spawn, ChildProcess } from 'child_process'
import path from 'path'
import fs from 'fs'

export interface TerraformConfig {
  projectPath: string
  gitLabBaseUrl?: string
  gitLabToken?: string
  gitLabUser?: string
  repositoryId?: string
  stateName?: string
  varFile?: string
}

export interface ExecutionResult {
  command: string
  output: string
  error: string
  exitCode: number
  startedAt: Date
  duration: number
}

export type LogCallback = (line: string) => void

export function checkTerraformInstalled(): Promise<boolean> {
  return new Promise((resolve) => {
    const tf = spawn('terraform', ['version'])
    tf.on('error', () => resolve(false))
    tf.on('close', (code) => resolve(code === 0))
  })
}

export async function getTerraformVersion(): Promise<string> {
  return new Promise((resolve, reject) => {
    const tf = spawn('terraform', ['version', '-json'])
    let stdout = ''
    
    tf.stdout.on('data', (data) => {
      stdout += data.toString()
    })
    
    tf.on('close', (code) => {
      if (code === 0) {
        resolve(stdout)
      } else {
        reject(new Error('Failed to get terraform version'))
      }
    })
    
    tf.on('error', reject)
  })
}

export async function terraformInit(
  config: TerraformConfig, 
  logCallback?: LogCallback
): Promise<ExecutionResult> {
  const startTime = new Date()
  const args = ['init', '-input=false']

  // Add backend config if GitLab settings provided
  if (config.gitLabBaseUrl && config.repositoryId && config.stateName) {
    let baseUrl = config.gitLabBaseUrl.replace(/\/$/, '')
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = 'https://' + baseUrl
    }

    const stateAddress = `${baseUrl}/api/v4/projects/${config.repositoryId}/terraform/state/${config.stateName}`
    const lockAddress = `${stateAddress}/lock`

    args.push(
      `-backend-config=address=${stateAddress}`,
      `-backend-config=lock_address=${lockAddress}`,
      `-backend-config=unlock_address=${lockAddress}`,
      `-backend-config=username=${config.gitLabUser || 'oauth2'}`,
      `-backend-config=password=${config.gitLabToken}`,
      `-backend-config=lock_method=POST`,
      `-backend-config=unlock_method=DELETE`,
      `-backend-config=retry_wait_min=5`,
      '-reconfigure'
    )
  }

  return runTerraform(config.projectPath, args, 'terraform init', startTime, logCallback)
}

export async function terraformPlan(
  config: TerraformConfig,
  logCallback?: LogCallback
): Promise<ExecutionResult> {
  const startTime = new Date()
  const args = ['plan', '-input=false', '-no-color']

  if (config.varFile) {
    args.push(`-var-file=${config.varFile}`)
  }

  return runTerraform(config.projectPath, args, 'terraform plan', startTime, logCallback)
}

export async function terraformApply(
  config: TerraformConfig,
  autoApprove: boolean = false,
  logCallback?: LogCallback
): Promise<ExecutionResult> {
  const startTime = new Date()
  const args = ['apply', '-input=false', '-no-color']

  if (autoApprove) {
    args.push('-auto-approve')
  }

  if (config.varFile) {
    args.push(`-var-file=${config.varFile}`)
  }

  return runTerraform(config.projectPath, args, 'terraform apply', startTime, logCallback)
}

export async function terraformDestroy(
  config: TerraformConfig,
  autoApprove: boolean = false,
  logCallback?: LogCallback
): Promise<ExecutionResult> {
  const startTime = new Date()
  const args = ['destroy', '-input=false', '-no-color']

  if (autoApprove) {
    args.push('-auto-approve')
  }

  if (config.varFile) {
    args.push(`-var-file=${config.varFile}`)
  }

  return runTerraform(config.projectPath, args, 'terraform destroy', startTime, logCallback)
}

export async function terraformShow(
  projectPath: string,
  logCallback?: LogCallback
): Promise<ExecutionResult> {
  const startTime = new Date()
  return runTerraform(projectPath, ['show', '-no-color'], 'terraform show', startTime, logCallback)
}

function runTerraform(
  cwd: string,
  args: string[],
  command: string,
  startTime: Date,
  logCallback?: LogCallback
): Promise<ExecutionResult> {
  return new Promise((resolve) => {
    let output = ''
    let error = ''

    const tf = spawn('terraform', args, {
      cwd,
      env: {
        ...process.env,
        TF_IN_AUTOMATION: 'true'
      }
    })

    tf.stdout.on('data', (data) => {
      const text = data.toString()
      output += text
      if (logCallback) {
        text.split('\n').filter(Boolean).forEach(logCallback)
      }
    })

    tf.stderr.on('data', (data) => {
      const text = data.toString()
      error += text
      if (logCallback) {
        text.split('\n').filter(Boolean).forEach((line: string) => logCallback(`[ERROR] ${line}`))
      }
    })

    tf.on('close', (code) => {
      const duration = (new Date().getTime() - startTime.getTime()) / 1000
      resolve({
        command,
        output,
        error,
        exitCode: code || 0,
        startedAt: startTime,
        duration
      })
    })

    tf.on('error', (err) => {
      const duration = (new Date().getTime() - startTime.getTime()) / 1000
      resolve({
        command,
        output,
        error: err.message,
        exitCode: 1,
        startedAt: startTime,
        duration
      })
    })
  })
}

export function findVarFiles(projectPath: string, maxDepth: number = 3): string[] {
  const varFiles: string[] = []
  
  const searchDir = (dir: string, currentDepth: number, prefix: string = '') => {
    if (currentDepth > maxDepth) return
    
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        // Skip hidden directories and common non-terraform directories
        if (entry.isDirectory()) {
          if (entry.name.startsWith('.') || 
              entry.name === 'node_modules' || 
              entry.name === '.terraform') {
            continue
          }
          searchDir(
            path.join(dir, entry.name), 
            currentDepth + 1, 
            prefix ? `${prefix}/${entry.name}` : entry.name
          )
        } else if (entry.isFile()) {
          const fileName = entry.name.toLowerCase()
          if (fileName.endsWith('.tfvars') || 
              fileName.endsWith('.tfvars.json') ||
              fileName === 'terraform.tfvars' ||
              fileName.endsWith('.auto.tfvars')) {
            const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name
            varFiles.push(relativePath)
          }
        }
      }
    } catch {
      // Ignore errors (permission issues, etc.)
    }
  }

  searchDir(projectPath, 0)
  return varFiles
}

export function parseTerraformSummary(output: string): { add: number; change: number; destroy: number } {
  let add = 0, change = 0, destroy = 0

  // Parse "Plan: X to add, Y to change, Z to destroy"
  const planMatch = output.match(/Plan:\s+(\d+)\s+to\s+add,\s+(\d+)\s+to\s+change,\s+(\d+)\s+to\s+destroy/)
  if (planMatch) {
    add = parseInt(planMatch[1])
    change = parseInt(planMatch[2])
    destroy = parseInt(planMatch[3])
  }

  // Parse "Apply complete! Resources: X added, Y changed, Z destroyed"
  const applyMatch = output.match(/Apply complete!.*?(\d+)\s+added,\s+(\d+)\s+changed,\s+(\d+)\s+destroyed/)
  if (applyMatch) {
    add = parseInt(applyMatch[1])
    change = parseInt(applyMatch[2])
    destroy = parseInt(applyMatch[3])
  }

  // Parse "Destroy complete! Resources: X destroyed"
  const destroyMatch = output.match(/Destroy complete!.*?(\d+)\s+destroyed/)
  if (destroyMatch) {
    destroy = parseInt(destroyMatch[1])
  }

  return { add, change, destroy }
}
