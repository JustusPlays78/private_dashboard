# Dashboard Release Management

This project uses automated releases through GitHub Actions with semantic versioning.

## Creating a New Release

Use the PowerShell release script:

```powershell
.\release.ps1 -Version "1.0.1"
```

This will:
1. Update the version in `package.json`
2. Commit the version change
3. Create a git tag (e.g., `v1.0.1`)
4. Push to GitHub
5. Trigger the GitHub Actions release workflow

## Release Workflow

When you push a tag matching `v*.*.*` pattern:
- Backend is built with Go
- Frontend is built with Vite and Electron
- Windows installer (`.exe`) is created
- GitHub release is automatically created with the installer attached

## Versioning

We use semantic versioning (MAJOR.MINOR.PATCH):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backwards compatible)
- **PATCH**: Bug fixes

## Manual Release (Alternative)

If you prefer manual releases:

```powershell
# 1. Update version in frontend/package.json
# 2. Commit changes
git add frontend/package.json
git commit -m "chore: bump version to X.Y.Z"

# 3. Create and push tag
git tag -a vX.Y.Z -m "Release X.Y.Z"
git push origin main
git push origin vX.Y.Z
```

## Download Releases

Users can download releases from:
https://github.com/JustusPlays78/private_dashboard/releases
