# Build Guide

Detaillierte Anleitung zum Bauen der Terraform Dashboard Desktop-App für Windows.

## 📋 Voraussetzungen

### Software

1. **Node.js** (Version 18 oder höher)
   - Download: https://nodejs.org/
   - Überprüfen: `node --version`

2. **Go** (Version 1.21 oder höher)
   - Download: https://go.dev/dl/
   - Überprüfen: `go version`

3. **Git**
   - Download: https://git-scm.com/
   - Überprüfen: `git --version`

### System

- Windows 10/11 (x64)
- Mindestens 2 GB freier Speicherplatz
- PowerShell 5.1 oder höher

## 🏗️ Build-Prozess

### 1. Repository klonen/öffnen

```powershell
cd C:\Users\z003h6nh\Desktop\new_\terraform-dashboard
```

### 2. Backend kompilieren

```powershell
cd backend
go mod download
go build -ldflags="-s -w" -o bin/terraform-dashboard.exe cmd/main.go
```

**Flags erklärt:**
- `-ldflags="-s -w"` - Entfernt Debug-Symbole (kleinere Binary)
- `-o bin/terraform-dashboard.exe` - Output-Pfad

**Ergebnis:** `backend/bin/terraform-dashboard.exe` (~8-10 MB)

### 3. Frontend Dependencies installieren

```powershell
cd ..\frontend
npm install
```

Dies installiert:
- Electron 39.1.0
- React 19.2.0
- Vite 7.2.1
- Tailwind CSS 4.1.16
- electron-builder 26.0.12
- Und alle anderen Dependencies

### 4. Production Build erstellen

```powershell
# Code-Signing deaktivieren (für lokale Builds)
$env:CSC_IDENTITY_AUTO_DISCOVERY="false"

# Build ausführen
npm run electron:build
```

**Was passiert:**
1. Backend wird neu kompiliert (`build:backend`)
2. Electron Main/Preload mit esbuild gebaut (`build:electron`)
3. React App mit Vite für Production gebaut (`vite build`)
4. Electron Builder erstellt die Windows-Installer (`electron-builder`)

**Build-Zeit:** ~2-3 Minuten

### 5. Build-Artefakte finden

Nach erfolgreichem Build findest du in `frontend/release/`:

```
release/
├── Terraform Dashboard-1.0.0-x64.exe      # NSIS Installer (~100 MB)
├── Terraform Dashboard-1.0.0-x64.exe.blockmap
├── win-unpacked/                          # Entpackte App
│   └── Terraform Dashboard.exe            # Direkt ausführbar
├── builder-debug.yml
└── builder-effective-config.yaml
```

## 🎯 Build-Targets

### NSIS Installer (Standard)

```powershell
npm run electron:build
```

- Erstellt einen Setup-Wizard
- Installiert die App in `C:\Program Files\Terraform Dashboard`
- Erstellt Desktop- und Startmenü-Shortcuts
- Ermöglicht Deinstallation über Systemsteuerung

### Portable Version

Die `win-unpacked/` Ordner enthält die portable Version:

```powershell
# Nach dem Build
cd release
Compress-Archive -Path win-unpacked -DestinationPath "Terraform-Dashboard-Portable.zip"
```

Diese ZIP kann ohne Installation entpackt und gestartet werden.

## 🔍 Build-Verifikation

### 1. Größe prüfen

```powershell
Get-ChildItem release -File | Select-Object Name, @{Name="Size (MB)";Expression={[math]::Round($_.Length / 1MB, 2)}}
```

Erwartete Größen:
- Installer: ~100 MB
- Unpacked .exe: ~150 MB (mit allen Dependencies)

### 2. Backend-Inclusion prüfen

```powershell
Test-Path "release\win-unpacked\resources\backend\terraform-dashboard.exe"
```

Sollte `True` zurückgeben.

### 3. App testen (unpacked)

```powershell
cd release\win-unpacked
Start-Process ".\Terraform Dashboard.exe"
```

### 4. Installer testen

```powershell
cd release
Start-Process ".\Terraform Dashboard-1.0.0-x64.exe"
```

## 🐛 Troubleshooting

### Build schlägt fehl: "signtool.exe" Error

**Problem:** Electron Builder versucht zu signieren, aber kein Zertifikat ist verfügbar.

**Lösung:**
```powershell
$env:CSC_IDENTITY_AUTO_DISCOVERY="false"
npm run electron:build
```

### Build schlägt fehl: "Cannot create symbolic link"

**Problem:** Windows-Berechtigungen für Symlinks fehlen.

**Lösung:**
```powershell
# Cache löschen
Remove-Item -Path "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign" -Recurse -Force
# Erneut versuchen
npm run electron:build
```

### Backend Binary nicht gefunden

**Problem:** `backend/bin/terraform-dashboard.exe` existiert nicht.

**Lösung:**
```powershell
cd backend
go build -ldflags="-s -w" -o bin/terraform-dashboard.exe cmd/main.go
```

### Port 8080 bereits belegt

**Problem:** Backend läuft bereits von vorherigem Entwicklungsmodus.

**Lösung:**
```powershell
# Prozess finden und killen
Get-Process | Where-Object {$_.ProcessName -like "*terraform-dashboard*"} | Stop-Process -Force
```

### Node Modules Probleme

**Problem:** npm install schlägt fehl oder Packages sind korrupt.

**Lösung:**
```powershell
cd frontend
Remove-Item node_modules -Recurse -Force
Remove-Item package-lock.json -Force
npm install
```

### Go Module Cache Probleme

**Problem:** Go Dependencies lassen sich nicht laden.

**Lösung:**
```powershell
cd backend
go clean -modcache
go mod download
```

## 📊 Build-Statistiken

Typische Build-Ausgabe:

```
> terraform-dashboard@1.0.0 electron:build
> npm run build:backend && npm run build:electron && vite build && electron-builder

> terraform-dashboard@1.0.0 build:backend
> cd ../backend && go build -ldflags="-s -w" -o bin/terraform-dashboard.exe cmd/main.go
✓ Backend compiled in 3.2s

> terraform-dashboard@1.0.0 build:electron
> node build-electron.mjs
✓ Main process built in 0.8s
✓ Preload script built in 0.6s

vite v7.2.1 building for production...
✓ 1692 modules transformed in 9.5s
dist/index.html                   0.49 kB
dist/assets/index-xxx.css        25.17 kB
dist/assets/index-xxx.js        251.49 kB

• electron-builder  version=26.0.12
• packaging         platform=win32 arch=x64 electron=39.1.0
• building          target=nsis
✓ Build complete in 45.2s

Total time: ~60s
```

## 🚀 CI/CD Integration (Optional)

### GitHub Actions Beispiel

```yaml
name: Build Windows App

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Setup Go
        uses: actions/setup-go@v4
        with:
          go-version: '1.21'
      
      - name: Build
        shell: powershell
        run: |
          cd frontend
          npm install
          $env:CSC_IDENTITY_AUTO_DISCOVERY="false"
          npm run electron:build
      
      - name: Upload Artifacts
        uses: actions/upload-artifact@v3
        with:
          name: windows-installer
          path: frontend/release/*.exe
```

## 📦 Optimierungen

### Backend Binary verkleinern

```powershell
cd backend
# UPX Compression (optional, benötigt upx.exe)
go build -ldflags="-s -w" -o bin/terraform-dashboard.exe cmd/main.go
upx --best --lzma bin/terraform-dashboard.exe
```

### Frontend Bundle analysieren

```powershell
cd frontend
npm run build -- --mode=analyze
```

### Electron App optimieren

In `package.json`:
```json
"build": {
  "compression": "maximum",
  "asar": true
}
```

## 📝 Release Checklist

- [ ] Alle Tests bestanden
- [ ] Version in `package.json` erhöht
- [ ] CHANGELOG.md aktualisiert
- [ ] Backend neu kompiliert
- [ ] Frontend Dependencies aktualisiert
- [ ] Production Build erfolgreich
- [ ] Installer getestet (Neuinstallation)
- [ ] Portable Version getestet
- [ ] Master-Passwort-Flow getestet
- [ ] Auto-Lock nach 30min getestet
- [ ] Datenbankpersistenz geprüft

## 🔗 Weitere Ressourcen

- [Electron Builder Docs](https://www.electron.build/)
- [Vite Build Options](https://vitejs.dev/config/build-options.html)
- [Go Build Flags](https://pkg.go.dev/cmd/go#hdr-Compile_packages_and_dependencies)
