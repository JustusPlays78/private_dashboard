import { app, BrowserWindow, ipcMain, BrowserView } from 'electron'
import path from 'path'
import { setupIpcHandlers, cleanupIpcHandlers } from './lib/ipc-handlers'

// __dirname is available in CJS build
declare const __dirname: string

// Enable V8 code cache for faster startup
app.commandLine.appendSwitch('js-flags', '--expose-gc')
app.commandLine.appendSwitch('disable-renderer-backgrounding')

let mainWindow: BrowserWindow | null = null
const browserViewCache = new Map<string, BrowserView>()
let currentBrowserViewId: string | null = null

const isDev = !app.isPackaged

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    backgroundColor: '#0f172a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      // Performance optimizations
      backgroundThrottling: false,
    },
    // Frameless window in production, normal in dev
    frame: isDev,
    titleBarStyle: isDev ? 'default' : 'hidden',
    titleBarOverlay: isDev ? false : {
      color: '#0f172a',
      symbolColor: '#94a3b8',
      height: 40
    },
    show: false,
    // Use icon
    icon: path.join(__dirname, '../assets/icon.png'),
  })

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

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
  // Setup IPC handlers for database and services
  setupIpcHandlers(() => mainWindow)
  
  // Create window immediately (no backend delay needed)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  cleanupIpcHandlers()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('quit', () => {
  cleanupIpcHandlers()
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
