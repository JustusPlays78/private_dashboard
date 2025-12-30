import { app, BrowserWindow, ipcMain, BrowserView } from 'electron'
import path from 'path'
import { spawn, ChildProcess } from 'child_process'

// __dirname is available in CJS build
declare const __dirname: string

let mainWindow: BrowserWindow | null = null
let backendProcess: ChildProcess | null = null
const browserViewCache = new Map<string, BrowserView>()
let currentBrowserViewId: string | null = null

const BACKEND_PORT = 8080

function startBackend() {
  const isDev = !app.isPackaged
  
  let backendPath: string
  
  if (isDev) {
    // Development: Launch backend from cmd directory
    backendPath = path.join(__dirname, '../../backend/cmd/dashboard-backend.exe')
  } else {
    // Production: Launch bundled backend
    backendPath = path.join(process.resourcesPath, 'backend', 'dashboard.exe')
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

// BrowserView handlers for iframe pages
ipcMain.handle('browserview:load', async (event, pageId: string, url: string, bounds: { x: number, y: number, width: number, height: number }) => {
  if (!mainWindow) return { success: false, error: 'No main window' }

  // Hide current BrowserView if different from the one we're loading
  if (currentBrowserViewId && currentBrowserViewId !== pageId) {
    const oldView = browserViewCache.get(currentBrowserViewId)
    if (oldView) {
      mainWindow.removeBrowserView(oldView)
    }
  }

  // Check if BrowserView for this page already exists
  let browserView = browserViewCache.get(pageId)
  
  if (browserView) {
    // Reuse existing BrowserView
    mainWindow.addBrowserView(browserView)
    browserView.setBounds(bounds)
    currentBrowserViewId = pageId
    return { success: true }
  }

  // Create new BrowserView
  browserView = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      partition: 'persist:iframe-session'
    }
  })

  // Store in cache
  browserViewCache.set(pageId, browserView)
  currentBrowserViewId = pageId

  mainWindow.addBrowserView(browserView)
  browserView.setBounds(bounds)
  browserView.setAutoResize({ width: true, height: true })

  // Handle external links - open them in the same BrowserView
  browserView.webContents.setWindowOpenHandler((details) => {
    browserView?.webContents.loadURL(details.url).catch(console.error)
    return { action: 'deny' }
  })

  // Handle navigation - keep all navigation within BrowserView
  browserView.webContents.on('will-navigate', (event, url) => {
    console.log('Navigating to:', url)
  })
  
  try {
    await browserView.webContents.loadURL(url)
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('browserview:resize', async (event, bounds: { x: number, y: number, width: number, height: number }) => {
  if (!currentBrowserViewId) return { success: false, error: 'No active BrowserView' }
  const browserView = browserViewCache.get(currentBrowserViewId)
  if (!browserView) return { success: false, error: 'BrowserView not found' }
  browserView.setBounds(bounds)
  return { success: true }
})

ipcMain.handle('browserview:destroy', async () => {
  if (currentBrowserViewId && mainWindow) {
    const browserView = browserViewCache.get(currentBrowserViewId)
    if (browserView) {
      mainWindow.removeBrowserView(browserView)
      // Don't destroy, just hide - keep it cached
    }
    currentBrowserViewId = null
    return { success: true }
  }
  return { success: false, error: 'No BrowserView to destroy' }
})

ipcMain.handle('browserview:reload', async () => {
  if (!currentBrowserViewId) return { success: false, error: 'No active BrowserView' }
  const browserView = browserViewCache.get(currentBrowserViewId)
  if (!browserView) return { success: false, error: 'BrowserView not found' }
  browserView.webContents.reload()
  return { success: true }
})
