# Dashboard App

Eine moderne Full-Stack Dashboard-Anwendung mit React Frontend und Node.js Backend für die Verwaltung von Notizen, Tasks und Scripts.

## 🚀 Features

- **📝 Notizen-Management**: Erstellen, bearbeiten und löschen von Notizen mit Rich-Text-Editor
- **✅ Task-Management**: Aufgaben mit Subtasks, Fälligkeitsdaten und Status-Tracking
- **🔧 Script-Management**: Dynamische Scripts mit Variablen für Deployment-Automatisierung
- **🌙 Dark Mode**: Vollständig responsive Design mit Dark Theme
- **📱 Responsive**: Optimiert für Desktop und Mobile
- **🐳 Docker Ready**: Single-Container Deployment möglich

## 📋 Technologie-Stack

### Frontend
- **React 18** mit TypeScript
- **Vite** als Build-Tool
- **React Router** für Navigation
- **Lucide React** für Icons
- **date-fns** für Datums-Formatierung
- **Tailwind CSS** für Styling (Custom CSS Variables)

### Backend
- **Node.js** mit Express
- **TypeScript**
- **SQLite3** als Datenbank
- **UUID** für eindeutige IDs
- **CORS** für Cross-Origin Requests

## 📁 Projektstruktur

```
dashboard-app/
├── frontend/                 # React Frontend
│   ├── src/
│   │   ├── components/      # Wiederverwendbare Komponenten
│   │   ├── pages/          # Seiten-Komponenten
│   │   ├── api.ts          # API-Client
│   │   ├── types.ts        # TypeScript Definitionen
│   │   └── index.css       # Globale Styles
│   ├── package.json
│   └── vite.config.ts
├── backend/                 # Node.js Backend
│   ├── src/
│   │   ├── routes/         # API Routes
│   │   ├── database.ts     # Datenbank Setup
│   │   ├── types.ts        # TypeScript Definitionen
│   │   └── index.ts        # Server Entry Point
│   └── package.json
├── Dockerfile              # Docker Container Definition
├── docker-compose.yml      # Docker Compose Setup
└── package.json            # Root Package für Scripts
```

## 🛠️ Installation & Setup

### Voraussetzungen

- **Node.js** >= 18.0.0
- **npm** >= 8.0.0
- **Docker** (optional, für Container-Deployment)

### 1. Repository klonen

```bash
git clone <repository-url>
cd dashboard-app
```

### 2. Dependencies installieren

```bash
# Root-Level Dependencies
npm install

# Frontend Dependencies
cd frontend
npm install

# Backend Dependencies
cd ../backend
npm install
cd ..
```

### 3. Environment Setup

**Backend Environment** (optional):
```bash
# backend/.env
PORT=3001
NODE_ENV=development
DB_PATH=./data/database.sqlite
```

## 🚀 Development

### Separate Frontend & Backend (Empfohlen für Development)

```bash
# Terminal 1: Backend starten
cd backend
npm run dev
# Läuft auf http://localhost:3001

# Terminal 2: Frontend starten
cd frontend
npm run dev
# Läuft auf http://localhost:3000
```

### Oder mit einem Befehl (Root-Level)

```bash
npm run dev
# Startet beide Services gleichzeitig
```

### Verfügbare URLs in Development:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api
- **Health Check**: http://localhost:3001/api/health

## 🏗️ Production Build

### Option 1: Lokaler Build

```bash
# Alles bauen und starten
npm run start:production

# Oder Schritt für Schritt:
npm run build:frontend
npm run build:backend
cd backend && NODE_ENV=production npm start
```

**Verfügbare URL**: http://localhost:3001 (Frontend + Backend zusammen)

### Option 2: Docker Container

```bash
# Docker Image bauen
docker build -t dashboard-app .

# Container starten
docker run -p 3000:3000 dashboard-app

# Oder mit docker-compose
docker-compose up --build
```

**Verfügbare URL**: http://localhost:3000

## 📚 API Dokumentation

### Notizen API
```
GET    /api/notes          # Alle Notizen
GET    /api/notes/:id      # Einzelne Notiz
POST   /api/notes          # Notiz erstellen
PUT    /api/notes/:id      # Notiz aktualisieren
DELETE /api/notes/:id      # Notiz löschen
```

### Tasks API
```
GET    /api/tasks                           # Alle Tasks
GET    /api/tasks/:id                       # Einzelner Task
POST   /api/tasks                           # Task erstellen
PUT    /api/tasks/:id                       # Task aktualisieren
DELETE /api/tasks/:id                       # Task löschen
POST   /api/tasks/:id/subtasks              # Subtask hinzufügen
PUT    /api/tasks/:taskId/subtasks/:id      # Subtask aktualisieren
DELETE /api/tasks/:taskId/subtasks/:id      # Subtask löschen
```

### Scripts API
```
GET    /api/scripts                    # Alle Scripts
GET    /api/scripts/:id               # Einzelnes Script
POST   /api/scripts                   # Script erstellen
PUT    /api/scripts/:id               # Script aktualisieren
DELETE /api/scripts/:id               # Script löschen
POST   /api/scripts/:id/execute       # Script ausführen
GET    /api/scripts/:id/executions    # Ausführungshistorie
```

## 🔧 Script-Management Features

### Variable-Syntax
Scripts unterstützen dynamische Variablen im Format:
```bash
$J{VARIABLE_NAME}
```

### Variable-Typen
- **text**: Normaler Text
- **password**: Passwort (versteckt)
- **number**: Numerische Werte
- **url**: URL-Validierung

### File-Upload Support
- **JSON Format**: `{"VARIABLE_NAME": "value"}`
- **Text Format**: `VARIABLE_NAME=value`
- **ENV Format**: Standard .env Dateien

## 📦 Package.json Scripts

### Root-Level Scripts
```bash
npm run dev                 # Development: Frontend + Backend
npm run build              # Build Frontend + Backend
npm run start:production   # Production: Build + Start
npm run install:all        # Install alle Dependencies
npm run docker:build       # Docker Image bauen
npm run docker:run         # Docker Container starten
```

### Frontend Scripts
```bash
npm run dev                # Vite Dev Server
npm run build             # Production Build
npm run preview           # Preview Build
```

### Backend Scripts
```bash
npm run dev               # Nodemon Development
npm run build            # TypeScript Compile
npm run start            # Production Start
npm run build:frontend   # Frontend Build von Backend aus
npm run build:all        # Frontend + Backend Build
npm run start:production # Production Build + Start
```

## 🐳 Docker Setup

### Dockerfile Features
- **Multi-stage Build**: Optimierte Image-Größe
- **Frontend + Backend**: Single Container
- **Health Check**: Automatische Gesundheitsprüfung
- **SQLite Persistence**: Volume für Datenbank

### Docker Compose
```yaml
services:
  dashboard-app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - dashboard-data:/app/data
    environment:
      - NODE_ENV=production
```

## 🔍 Debugging & Monitoring

### Logging
Das Backend loggt alle Requests mit:
- Timestamp
- HTTP Method & Path
- Response Status
- Request Duration

```
[2024-01-15T10:30:45.123Z] GET /api/tasks
[2024-01-15T10:30:45.156Z] GET /api/tasks 200 33ms
```

### Health Check
```bash
curl http://localhost:3001/api/health
```

Response:
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "environment": "production",
  "mode": "production"
}
```

## 🚨 Troubleshooting

### Häufige Probleme

**1. Port bereits in Verwendung**
```bash
# Port prüfen
lsof -i :3001
# Prozess beenden
kill -9 <PID>
```

**2. Database Fehler**
```bash
# Datenbank-Verzeichnis erstellen
mkdir -p backend/data
# Permissions prüfen
chmod 755 backend/data
```

**3. Frontend Build Fehler**
```bash
# Node modules neu installieren
cd frontend
rm -rf node_modules package-lock.json
npm install
```

**4. Docker Build Fehler**
```bash
# Docker Cache leeren
docker system prune -a
# Neu bauen
docker build --no-cache -t dashboard-app .
```

## 🔐 Sicherheit

### Production Considerations
- CORS ist in Production deaktiviert
- Static files werden mit Cache-Headers serviert
- Error-Details werden in Production minimiert
- SQLite-Datenbank sollte außerhalb des Containers persistiert werden

### Environment Variables
```bash
NODE_ENV=production    # Production Mode
PORT=3000             # Server Port
DB_PATH=/app/data/database.sqlite  # Database Path
```

## 📈 Performance

### Frontend Optimierungen
- Vite für schnelle Builds
- Code Splitting durch React Router
- CSS Variables für Theme-Switching
- Optimierte Bundle-Größe

### Backend Optimierungen
- SQLite für schnelle lokale Datenbank
- Request-Logging mit minimaler Performance-Impact
- Static file serving mit Caching
- Graceful error handling

## 🤝 Contributing

1. Fork das Repository
2. Feature Branch erstellen (`git checkout -b feature/amazing-feature`)
3. Changes committen (`git commit -m 'Add amazing feature'`)
4. Branch pushen (`git push origin feature/amazing-feature`)
5. Pull Request erstellen

## 📄 License

Dieses Projekt ist unter der MIT License lizenziert.

---

© Julscha 2025