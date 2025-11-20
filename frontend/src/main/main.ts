import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { spawn, ChildProcess } from 'child_process'

// __dirname is available in CJS build
declare const __dirname: string

let mainWindow: BrowserWindow | null = null
let backendProcess: ChildProcess | null = null

const BACKEND_PORT = 8080

function startBackend() {
  const isDev = !app.isPackaged
  
  let backendPath: string
  
  if (isDev) {
    // Development: Launch backend from cmd directory
    backendPath = path.join(__dirname, '../../backend/cmd/terraform-dashboard-backend.exe')
  } else {
    // Production: Launch bundled backend
    backendPath = path.join(process.resourcesPath, 'backend', 'terraform-dashboard.exe')
  }

  console.log('Starting backend:', backendPath)
  
  backendProcess = spawn(backendPath, [], {
    cwd: path.dirname(backendPath),
    stdio: 'inherit'
  })

  backendProcess.on('error', (err) => {
    console.error('Backend process error:', err)
  })

  backendProcess.on('exit', (code) => {
    console.log(`Backend process exited with code ${code}`)
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    backgroundColor: '#0a0a0a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    },
    titleBarStyle: 'default',
    frame: true,
    show: false,
  })

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  const isDev = !app.isPackaged

  if (isDev) {
    // Development mode
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    // Production mode
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  // Start backend first
  startBackend()
  
  // Small delay to let backend start
  setTimeout(() => {
    createWindow()
  }, 1000)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill()
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('quit', () => {
  if (backendProcess) {
    backendProcess.kill()
  }
})

// IPC handlers for backend communication
ipcMain.handle('backend:health', async () => {
  try {
    const response = await fetch(`http://localhost:${BACKEND_PORT}/api/health`)
    return await response.json()
  } catch (error) {
    return { error: 'Backend not available' }
  }
})
