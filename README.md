# Private Dashboard

Eine lokale Desktop-Anwendung für Task- und Secret-Management, gebaut mit Electron, TypeScript, React und TailwindCSS.

## Features

- **Task Management**: Erstelle, bearbeite und verwalte deine Aufgaben
- **Secret Management**: Sichere Speicherung von sensiblen Informationen
- **Dashboard**: Überblick über alle Tasks und Secrets
- **Lokale SQLite Datenbank**: Alle Daten werden lokal gespeichert
- **Dark/Light Mode**: Modernes UI mit TailwindCSS
- **Windows .exe Build**: Kann als ausführbare Datei erstellt werden

## Technologien

- **Electron** - Desktop-Framework
- **TypeScript** - Typsichere Entwicklung
- **React** - UI-Framework
- **TailwindCSS** - Utility-First CSS Framework
- **SQLite** (better-sqlite3) - Lokale Datenbank
- **Webpack** - Bundle-Tool
- **Lucide React** - Icons

## Installation & Entwicklung

### Voraussetzungen

- Node.js (v16 oder höher)
- npm oder yarn

### Setup

```bash
# Dependencies installieren
npm install

# Entwicklung starten
npm run dev

# Build für Produktion
npm run build

# Electron App starten (nach Build)
npm start
```

### Distributionspaket erstellen

```bash
# Windows .exe erstellen
npm run dist:win

# Alle Plattformen
npm run dist
```

## Projektstruktur

```
src/
├── main/              # Electron Main Process
│   ├── main.ts        # Hauptprozess
│   ├── preload.ts     # Preload Script
│   └── database.ts    # SQLite Database Manager
├── renderer/          # React Frontend
│   ├── components/    # React Komponenten
│   ├── App.tsx        # Haupt-React-Komponente
│   ├── index.tsx      # React Entry Point
│   └── styles.css     # TailwindCSS Styles
└── shared/            # Geteilte Typen und Utilities
    └── types.ts       # TypeScript Interfaces
```

## Verwendung

### Tasks

- Neue Tasks über "Add Task" Button erstellen
- Status: Todo, In Progress, Completed
- Priorität: Low, Medium, High
- Tasks können bearbeitet und gelöscht werden

### Secrets

- Sensible Informationen sicher speichern
- Werte sind standardmäßig verborgen
- Copy-to-Clipboard Funktionalität
- Eindeutige Namen für Secrets

### Dashboard

- Überblick über alle Tasks und Secrets
- Statistiken zu Task-Status
- Letzte Aktivitäten
- High-Priority Tasks Übersicht

## Sicherheit

- Alle Daten werden nur lokal gespeichert
- Keine Netzwerkverbindungen erforderlich
- Context Isolation für Electron-Sicherheit
- Secrets werden in der lokalen SQLite Datenbank gespeichert

## Build-Konfiguration

Die App kann als Windows .exe Datei gebuildet werden:

- NSIS Installer für Windows
- Anpassbare Installationsverzeichnis
- Icon-Support
- Automatische Updates möglich (optional)

## Entwicklung

Zum Entwickeln einfach `npm run dev` ausführen - das startet Webpack im Watch-Modus und Electron automatisch neu.

## Lizenz

MIT License - siehe LICENSE Datei für Details.
