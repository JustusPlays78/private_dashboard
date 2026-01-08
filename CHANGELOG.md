# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] - 2026-01-07

### Changed
- Build 1.1.1

## [1.1.0] - 2026-01-07

### Added

#### Portable Tools System
- Portable Git download and management (auto-download from GitHub)
- Portable Terraform download and management (auto-download from HashiCorp)
- Tools are stored in app userData directory (`%APPDATA%/dashboard/tools/`)
- Automatic PATH configuration for portable tools
- Status display showing installed tools with version info

#### Toast Notification System
- New `ToastProvider` component with context-based toast management
- Progress toasts with animated stages (downloading → extracting → complete)
- Success/Error/Info toast variants with auto-dismiss
- Stacked toast display with smooth animations
- Used for tool downloads, saves, and other async operations

#### Settings Restructure - Complete Overhaul
- **Settings Overview** (`/settings`): Dashboard-style grid with category cards
- **Credentials Settings** (`/settings/credentials`): AWS credentials with bulk paste, secret picker
- **Git Settings** (`/settings/git`): GitLab instance management (CRUD)
- **Pages Settings** (`/settings/pages`): IFrame page management with icon picker
- **Tools Settings** (`/settings/tools`): Portable Git/Terraform management with progress feedback
- **Appearance Settings** (`/settings/appearance`): Theme selection, accent colors, font size, UI toggles
- **Security Settings** (`/settings/security`): Master password change, session timeout, auto-lock, clipboard clearing
- **Backup Settings** (`/settings/backup`): Export/Import all settings as JSON
- **About Settings** (`/settings/about`): Version info, changelog, licenses, credits

#### Dynamic App Info
- Version now dynamically loaded from Electron via IPC
- Shows Electron, Node, Chrome versions in About page
- `app:getInfo` IPC handler for app metadata

#### Security Features
- Master password change functionality with IPC handler
- Session timeout configuration (stored in localStorage)
- Auto-lock on window minimize option
- Automatic clipboard clearing option
- "Danger Zone" with clear all data button

#### UI Improvements
- Settings sidebar navigation with active state highlighting
- Nested React Router routes for settings pages
- Consistent card-based layout across all settings pages
- Icon picker grid for IFrame pages (40+ Lucide icons)

### Changed
- Settings page completely restructured from single monolithic file to 10 focused subpages
- IFrame management moved from separate route to `/settings/pages`
- Tool status checking now integrated into settings
- Improved error handling throughout settings pages
- About page now shows real version from package.json

### Technical
- Added `auth:changePassword` IPC handler
- Added `app:getInfo` IPC handler for version info
- Added `changePassword` method to DatabaseManager
- Updated `electron.d.ts` with new type definitions
- Created barrel export (`index.ts`) for settings pages
- Updated `App.tsx` routing to use nested routes with `<Outlet />`

## [1.0.2] - 2026-01-07

### Changed
- Build 1.0.2

## [1.0.1] - 2026-01-07

### Changed
- Build 1.0.1

## [1.0.0] - 2025-06-22

### Added
- Initial release
- Dashboard with project overview
- Notes with TipTap editor
- Secrets manager with encryption
- AWS Resources viewer (EC2, S3, Lambda, RDS, ECS, ELB, Security Groups)
- GitLab integration with project cloning
- Terraform deployer
- IFrame viewer for custom dashboards
- Frameless window in production
- Custom titlebar with Windows controls
