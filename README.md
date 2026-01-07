# Dashboard

Electron-based desktop dashboard application for DevOps and Infrastructure Management.

## Features

- 🔐 **Encrypted Local Storage** - Master password with Argon2id + AES-256-GCM
- 🚀 **Terraform Deployments** - Plan, Apply, Destroy with live output
- 🦊 **GitLab Integration** - Clone, pull, and browse repositories
- 📝 **Notes Canvas** - Rich-text notes with shapes, images, and connections
- 🖼️ **iFrame Viewer** - Embed external web UIs (Grafana, Zabbix, etc.)
- 🔑 **Secrets Manager** - Securely store and use credentials
- ☁️ **AWS Resources** - View and manage cloud infrastructure

## Development

### Prerequisites

- Node.js 20+
- Windows OS (for building)
- Git (for GitLab integration)
- Terraform CLI (for deployments)

### Setup

```powershell
cd frontend
npm install
npm run electron:dev
```

### Building

```powershell
cd frontend
npm run electron:build
```

The built application will be in `frontend/release/`.

## Architecture

```
frontend/
├── src/
│   ├── main/           # Electron main process
│   │   ├── main.ts     # App entry, window management
│   │   ├── preload.ts  # IPC bridge
│   │   └── lib/        # Core services
│   │       ├── database.ts   # Encrypted SQLite
│   │       ├── crypto.ts     # Argon2id + AES-256-GCM
│   │       ├── gitlab.ts     # GitLab API client
│   │       └── terraform.ts  # Terraform executor
│   └── renderer/       # React frontend
│       ├── pages/      # Route components
│       └── components/ # Reusable UI
```

## Releases

See [RELEASES.md](RELEASES.md) for information about creating releases.
