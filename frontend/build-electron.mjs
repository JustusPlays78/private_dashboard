import { build } from 'esbuild'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const mainConfig = {
  entryPoints: [path.resolve(__dirname, 'src/main/main.ts')],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: path.resolve(__dirname, 'dist-electron/main.cjs'),
  external: [
    'electron', 
    'better-sqlite3', 
    'argon2',
    '@aws-sdk/*'
  ],
  format: 'cjs',
  sourcemap: process.env.NODE_ENV === 'development',
}

const preloadConfig = {
  entryPoints: [path.resolve(__dirname, 'src/main/preload.ts')],
  bundle: true,
  platform: 'node',
  target: 'node18',
  outfile: path.resolve(__dirname, 'dist-electron/preload.cjs'),
  external: ['electron'],
  format: 'cjs',
  sourcemap: process.env.NODE_ENV === 'development',
}

async function buildElectron() {
  try {
    console.log('Building Electron main process...')
    await build(mainConfig)
    console.log('✓ Main process built')
    
    console.log('Building Electron preload script...')
    await build(preloadConfig)
    console.log('✓ Preload script built')
    
    console.log('✓ Electron build complete!')
  } catch (error) {
    console.error('Build failed:', error)
    process.exit(1)
  }
}

buildElectron()
