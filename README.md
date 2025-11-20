# Terraform Dashboard

Eine moderne Windows Desktop-Anwendung für Terraform AWS Management mit verschlüsselter Datenbank und Dark Mode UI.

## ✨ Features

- 🔒 **Verschlüsselte Datenbank**: Master-Passwort mit Argon2id + AES-256-GCM
- ⏰ **Auto-Lock**: Automatische Sperre nach 30 Minuten Inaktivität
- 🎨 **Dark Mode UI**: Modernes Design mit Tailwind CSS
- 📊 **Dashboard**: Übersicht über Terraform-Projekte und AWS-Ressourcen
- 🚀 **Terraform Deployer**: Deployment-Management mit GitLab-Integration
- 💻 **Standalone**: Keine externe Datenbank oder Docker erforderlich

## 🚀 Build & Installation

### Voraussetzungen

- Node.js 18+
- Go 1.21+
- Git

### Entwicklungsmodus

```bash
# Backend starten (Terminal 1)
cd backend
go run cmd/main.go

# Frontend starten (Terminal 2)
cd frontend
npm install
npm run electron:dev
```

### Production Build (.exe erstellen)

```bash
cd frontend
npm install
$env:CSC_IDENTITY_AUTO_DISCOVERY="false"
npm run electron:build
```

Die fertige `.exe` findest du in `frontend/release/`:
- **Installer**: `Terraform Dashboard-1.0.0-x64.exe` (~100 MB)
- **Unpacked**: `win-unpacked/Terraform Dashboard.exe` (zum direkten Ausführen)

## 📦 Deployment

### Als Installer verteilen

1. Die `Terraform Dashboard-1.0.0-x64.exe` an Nutzer verteilen
2. Installer ausführen
3. Die App wird im Startmenü und Desktop verfügbar sein
4. Beim ersten Start Master-Passwort festlegen

### Als Portable App

1. Den `win-unpacked` Ordner zippen
2. Entpacken und `Terraform Dashboard.exe` direkt ausführen
3. Kein Installer erforderlich

## 🔐 Sicherheit

### Master-Passwort

- Wird bei erstem Start festgelegt
- Verschlüsselt die gesamte Datenbank mit AES-256-GCM
- Nutzt Argon2id für Key Derivation (64 MB Memory, 4 Threads)

### Auto-Lock

- Nach 30 Minuten Inaktivität wird die App automatisch gesperrt
- Manuelle Sperre über den Lock-Button in der Sidebar
- Heartbeat-System überwacht Benutzeraktivität

### Datenspeicherung

- Datenbank: `%AppData%\Roaming\TerraformDashboard\terraform.db`
- Keine Daten verlassen deinen Rechner
- Alle sensiblen Daten verschlüsselt

## 🛠️ Technologie-Stack

### Frontend
- **Electron 39**: Desktop-Container
- **React 19**: UI Framework
- **TypeScript 5.9**: Type Safety
- **Vite 7**: Build Tool
- **Tailwind CSS 4**: Modern Styling
- **React Router**: Navigation
- **Lucide React**: Icons

### Backend
- **Go 1.21**: Backend Server
- **Gin**: HTTP Framework
- **SQLite**: Embedded Datenbank (modernc.org/sqlite, CGO-free)
- **Argon2id**: Password Hashing
- **AES-256-GCM**: Encryption

## 📁 Projektstruktur

```
terraform-dashboard/
├── backend/              # Go Backend
│   ├── cmd/
│   │   └── main.go      # Entry Point
│   ├── internal/
│   │   ├── api/         # REST API Routes
│   │   ├── db/          # Database & Encryption
│   │   ├── crypto/      # Crypto Utils
│   │   ├── session/     # Session Management
│   │   └── terraform/   # Terraform Integration
│   └── bin/
│       └── terraform-dashboard.exe  # Compiled Backend
│
├── frontend/            # Electron + React Frontend
│   ├── src/
│   │   ├── main/        # Electron Main Process
│   │   │   ├── main.ts
│   │   │   └── preload.ts
│   │   └── renderer/    # React App
│   │       ├── components/
│   │       ├── pages/
│   │       ├── hooks/
│   │       └── styles/
│   ├── dist/            # Vite Build Output
│   ├── dist-electron/   # Electron Build Output
│   └── release/         # Production Builds
│       └── Terraform Dashboard-1.0.0-x64.exe
│
└── README.md
```

## 🔄 GitLab Integration (Geplant)

- Terraform-Projekte aus GitLab-Repositories importieren
- Kein In-App Code-Editing (Read-Only)
- Automatisches Clonen/Pullen von Projekten
- Terraform init/plan/apply/destroy Befehle

## 📝 API Endpoints

### Auth
- `GET /api/health` - Health Check
- `GET /api/auth/status` - DB Lock Status
- `POST /api/auth/initialize` - Master-Passwort setzen
- `POST /api/auth/unlock` - DB entsperren
- `POST /api/auth/lock` - DB sperren
- `POST /api/auth/heartbeat` - Aktivität melden

### Dashboard
- `GET /api/dashboard/stats` - Dashboard-Statistiken

### Terraform
- `GET /api/terraform/projects` - Alle Projekte
- `POST /api/terraform/projects` - Projekt hinzufügen
- `DELETE /api/terraform/projects/:id` - Projekt löschen

## 🎯 Roadmap

- [ ] GitLab Repository Integration
- [ ] Terraform CLI Execution mit Output-Streaming
- [ ] AWS SDK Integration für Live-Status
- [ ] Jira Ticket Board Integration
- [ ] Project Templates
- [ ] Backup/Restore Funktion
- [ ] Multi-Language Support

## 💡 Tipps

### Backend-Binary neu bauen
```bash
cd backend
go build -ldflags="-s -w" -o bin/terraform-dashboard.exe cmd/main.go
```

### Cache löschen bei Build-Problemen
```powershell
Remove-Item -Path "$env:LOCALAPPDATA\electron-builder" -Recurse -Force
```

### Entwicklung ohne Auto-Lock
Ändere in `backend/internal/session/session.go`:
```go
const sessionTimeout = 30 * time.Hour  // Statt 30 * time.Minute
```

## 📄 Lizenz

Proprietär - Alle Rechte vorbehalten
