# Dashboard

Electron-based desktop dashboard application.

## Development

### Prerequisites

- Node.js 20+
- Go 1.23+
- Windows OS (for building)

### Setup

```powershell
# Install frontend dependencies
cd frontend
npm install

# Run in development mode
npm run electron:dev
```

## Building

```powershell
cd frontend
npm run electron:build
```

The built application will be in `frontend/release/`.

## Releases

See [RELEASES.md](RELEASES.md) for information about creating releases.
