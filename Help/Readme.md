# Govind Drive — Personal Cloud File Manager

> **Project Aurora** · A Google Drive-inspired, self-hosted cloud drive built with React 18, TypeScript, Vite, TailwindCSS, PocketBase (auth) and a Node.js/Express real-disk backend.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Features](#features)
- [Data Models](#data-models)
- [Component Breakdown](#component-breakdown)
- [Backend API Reference](#backend-api-reference)
- [Authentication (PocketBase)](#authentication-pocketbase)
- [Getting Started (Mac / Local Dev)](#getting-started-mac--local-dev)
- [Docker Setup](#docker-setup)
- [Ubuntu Server Deployment](#ubuntu-server-deployment)
- [Available Scripts](#available-scripts)
- [Environment & Dependencies](#environment--dependencies)
- [Known IDE Warnings](#known-ide-warnings)

---

## Project Overview

**Govind Drive** (internal codename: *Project Aurora*) is a fully self-hosted, production-quality personal cloud storage application. It allows you — and other users you create — to upload, organise, preview, edit, share, and manage real files that live on **your own computer or server's hard drive**.

Key design goals:

- **No subscription fees** — your files stay on hardware you own.
- **Multi-user** — each user gets their own isolated storage folder on disk.
- **Works on any device** — responsive layout from iPhone to wide-screen desktop.
- **Looks and feels like Google Drive** — familiar UX with sidebar, grid/list views, context menus, inline rename, drag-and-drop upload, and rich modals.

The app is split into two processes that run in parallel:

| Process | What it does |
|---|---|
| **Vite dev server / production build** | Serves the React SPA (the UI you see in the browser) |
| **Node.js Express server** (`server.js`) | REST API that reads/writes real files on the host computer's disk |

User accounts and authentication are handled by **PocketBase** (a self-contained Go backend), which can be run locally or in Docker.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| UI Framework | React | ^18.3.1 |
| Language | TypeScript | ^5.5.3 |
| Build Tool | Vite | ^5.4.2 |
| Styling | TailwindCSS | ^3.4.1 |
| Icons | Lucide React | ^0.344.0 |
| Auth / Database | PocketBase | ^0.27.0 |
| File API Backend | Node.js + Express | ^5.2.1 |
| File Uploads | Multer | ^2.2.0 |
| PDF Parsing | pdfjs-dist | ^6.1.200 |
| Word Doc Parsing | Mammoth | ^1.12.0 |
| CSS Pipeline | PostCSS + Autoprefixer | ^8.4.35 / ^10.4.18 |
| Linting | ESLint 9 + typescript-eslint | ^9.9.1 / ^8.3.0 |
| Containerisation | Docker + Docker Compose | — |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                         Browser / Client                      │
│                                                              │
│   React SPA (Vite)  ←─── TailwindCSS ── Lucide Icons       │
│   App.tsx (state hub)                                        │
│   └── Components (Sidebar, Modals, Cards, Feeds …)          │
│                                                              │
│   lib/pocketbase.ts  ──────────────────► PocketBase :8090   │
│   (auth, user profiles, file records)                        │
│                                                              │
│   lib/serverApi.ts   ──────────────────► Express API :3001  │
│   (real disk CRUD)                        └── Host Disk      │
└──────────────────────────────────────────────────────────────┘
```

- **`lib/pocketbase.ts`** — wraps the PocketBase JS SDK; handles login, logout, user session, and uploading file records to PocketBase collections.
- **`lib/serverApi.ts`** — thin fetch wrappers around the Express REST API for listing, uploading, renaming, moving, deleting, and downloading real files from the host disk.
- **`server.js`** — Express server that performs all actual filesystem operations. Runs on port **3001**. Each user gets a sandboxed subfolder inside a configurable *storage root* directory.

---

## Project Structure

```
GovindDriveProject/
├── index.html                     # HTML entry point
├── package.json                   # Dependencies & scripts
├── vite.config.ts                 # Vite configuration (proxy: /api → :3001)
├── tailwind.config.js             # TailwindCSS config
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── postcss.config.js
├── eslint.config.js
├── docker-compose.yml             # Docker: PocketBase + Govind web app
├── server.js                      # Node/Express real-disk file API (:3001)
├── storage_config.json            # (auto-generated) active disk storage root path
│
├── 01 Project Plan/               # Planning & deployment docs
│   ├── Project_Aurora_Development_Plan.docx / .pdf
│   ├── Project_Aurora_Report.docx / .pdf
│   └── Ubuntu_Deployment_Guide.md
│
├── Help/
│   └── Readme.md                  # ← You are here
│
├── public/                        # Static assets
└── src/
    ├── main.tsx                   # React bootstrap
    ├── App.tsx                    # Root state hub (~1,360 lines)
    ├── index.css                  # Global base styles (TailwindCSS directives)
    ├── assets/
    ├── lib/
    │   ├── pocketbase.ts          # PocketBase SDK wrapper + UserProfile type
    │   └── serverApi.ts           # Express disk API fetch helpers + DiskItem type
    └── cloud/                     # All UI components
        ├── data.ts                # Types, mock defaults, helpers
        ├── icons.ts               # Shared Lucide re-exports
        ├── Sidebar.tsx            # Left nav (logo, New, nav links, storage meter)
        ├── ActivityFeed.tsx       # Right timeline panel
        ├── BottomNav.tsx          # Mobile fixed bottom bar
        ├── ContextMenu.tsx        # Right-click / ⋯ menu for files
        ├── CanvasContextMenu.tsx  # Right-click menu on empty canvas area
        ├── FileCard.tsx           # Grid-view file tile
        ├── FolderCard.tsx         # Grid-view folder tile
        ├── FileRow.tsx            # List-view file/folder row
        ├── FileThumb.tsx          # SVG file thumbnail generator
        ├── FolderIcon.tsx         # SVG folder icon with badge overlays
        ├── BatchActionBar.tsx     # Floating bar shown when items are selected
        ├── GoogleDriveFilters.tsx # Advanced filter panel (type, date, owner, size)
        ├── LoginModal.tsx         # Auth modal (login / register)
        ├── AdminUserModal.tsx     # Admin panel: manage all users
        ├── UserProfileModal.tsx   # Current user profile & settings
        ├── ShareModal.tsx         # Share a file with other users
        ├── MoveModal.tsx          # Move file(s) to a different folder
        ├── FilePreviewModal.tsx   # Full-screen preview (images, video, PDF, audio)
        ├── FileEditorModal.tsx    # Plain-text / code file editor
        ├── DocEditorModal.tsx     # Rich-text document editor (.docx / .doc)
        ├── SheetEditorModal.tsx   # Spreadsheet editor (.xlsx / .csv)
        ├── PdfEditorModal.tsx     # PDF viewer / annotator
        ├── StorageAnalyticsModal.tsx # Storage usage charts & breakdown
        └── UploadProgressWidget.tsx  # Floating upload progress indicator
```

---

## Features

### 🗂️ Navigation & Layout

- **Sidebar (desktop):** always visible on `lg:` screens. App logo, **New** button, five nav sections, storage usage meter with **Upgrade** button.
- **Sidebar (mobile):** slides in from the left via hamburger button; backdrop overlay to close.
- **Navigation sections:** My Drive · Recent · Starred · Shared with me · Trash
- **Header:** search (live filter), grid/list toggle, sort dropdown, notifications, settings, user avatar.
- **Activity Feed (desktop):** always visible on the right. On mobile, slides in when avatar is tapped.
- **Bottom Nav (mobile):** fixed bar with Home, Recent, Starred, Upload FAB.
- **Breadcrumb:** shows current folder path.

### 📁 File & Folder Management

| Action | How | Result |
|---|---|---|
| Create folder | New → New folder | Creates real folder on disk |
| Create document | New → New document | Prepends item, enters inline rename |
| Create spreadsheet | New → New spreadsheet | Prepends item, enters inline rename |
| Create presentation | New → New presentation | Prepends item, enters inline rename |
| Upload files | New → Upload files, drag-and-drop, or mobile FAB | Uploads real file via Express API |
| Upload entire folder | Drag folder onto canvas | Preserves nested directory structure |
| Inline rename | Context menu → Rename (or auto after create) | `Enter` to confirm, `Esc` to cancel |
| Move | Context menu → Move → MoveModal | Moves real file/folder on disk |
| Delete | Context menu → Delete | Moves to Trash; hard-deletes from disk |
| Star / un-star | Context menu → Star | Toggles gold star badge |
| Share | Context menu → Share → ShareModal | Adds other users as collaborators |
| Download | Context menu → Download | Streams file from Express API |

### 👁️ Previews & Editors

| Modal | Supported Formats |
|---|---|
| **FilePreviewModal** | Images (JPG, PNG, GIF, WebP, SVG), Video (MP4, MOV), Audio (MP3, WAV), PDF (via pdfjs-dist) |
| **DocEditorModal** | .docx, .doc (parsed with Mammoth, rich-text editing) |
| **SheetEditorModal** | .xlsx, .csv (grid editor) |
| **PdfEditorModal** | PDF viewer with page navigation |
| **FileEditorModal** | Plain text, JSON, Markdown, code files |

### 🔍 Search, Filter & Sort

- **Live search:** case-insensitive substring match on file/folder name; applies before sort.
- **Advanced filters (GoogleDriveFilters):** filter by file type, date modified range, owner, file size range.
- **Sort options:** Date modified (default) · Name A–Z · Size largest-first · File type.
- **Batch selection:** click items while holding `Shift`/`Ctrl` (or use checkboxes) → **BatchActionBar** appears with bulk download, move, delete, share actions.

### 📊 Storage Analytics

**StorageAnalyticsModal** shows:
- Total used vs. available space
- Breakdown by file type (chart)
- Per-user storage stats (admin view)

### 👥 User Management

- **LoginModal:** email + password login or new account registration via PocketBase.
- **AdminUserModal:** admin-only panel to create, view, and manage all user accounts. Each user gets an isolated folder on disk.
- **UserProfileModal:** change avatar, display name, password.

### 📱 Responsive & Accessible

- Fully responsive from 320 px to 4K.
- `aria-label` attributes on all interactive elements.
- Keyboard: `Escape` dismisses modals & context menus; `Enter` confirms rename.
- `useMemo` on all filtered/sorted lists to avoid unnecessary re-computation.

---

## Data Models

Defined in `src/cloud/data.ts`.

### `FileKind`

```ts
type FileKind =
  | "folder" | "pdf" | "doc" | "sheet"
  | "slides" | "image" | "video" | "audio" | "archive";
```

### `DriveItem`

```ts
interface DriveItem {
  id: string;            // Unique identifier (base64 of relative disk path for real files)
  name: string;          // Display name
  kind: FileKind;        // File type
  size: string;          // Human-readable ("2.4 MB" or "—" for folders)
  modified: string;      // Human-readable date
  modifiedRaw: number;   // Numeric timestamp for sorting
  starred?: boolean;
  shared?: boolean;
  owner?: string;        // Display name of owner
  ownerId?: string;      // PocketBase user id of owner
  sharedWith?: string[]; // Array of PocketBase user ids
  childCount?: number;   // Folder child count
  parentId?: string | null;
  inTrash?: boolean;
}
```

### `ActivityEntry`

```ts
interface ActivityEntry {
  id: string;
  user: string;          // Display name of actor
  avatarColor: string;   // Tailwind bg class (e.g. "bg-blue-600")
  avatar?: string;       // Optional URL for profile image
  action: string;        // Verb: "uploaded", "edited", "shared", etc.
  target: string;        // File/folder name acted upon
  time: string;          // Human-readable timestamp string
  timestamp?: number;    // Unix ms for relative-time computation
}
```

### `DiskItem` (from `src/lib/serverApi.ts`)

```ts
interface DiskItem {
  id: string;
  name: string;
  kind: FileKind;
  size: string;
  sizeBytes: number;
  modified: string;
  modifiedRaw: number;
  childCount: number;
  relPath: string;       // Path relative to user's storage root
  isDir: boolean;
}
```

---

## Component Breakdown

| Component | File | Key Responsibility |
|---|---|---|
| `App` | `App.tsx` | Root state hub: owns all items, view mode, sort, search, selection, active modal, and folder navigation state |
| `Sidebar` | `cloud/Sidebar.tsx` | Left nav with New button popover, nav links, and storage indicator |
| `ActivityFeed` | `cloud/ActivityFeed.tsx` | Timeline of recent file activity |
| `BottomNav` | `cloud/BottomNav.tsx` | Mobile-only fixed bottom navigation bar |
| `ContextMenu` | `cloud/ContextMenu.tsx` | Floating right-click / ⋯ context menu for individual files |
| `CanvasContextMenu` | `cloud/CanvasContextMenu.tsx` | Right-click context menu on empty canvas (New folder, upload) |
| `FileCard` | `cloud/FileCard.tsx` | Grid-view tile with thumbnail, name, metadata, inline rename, checkbox |
| `FolderCard` | `cloud/FolderCard.tsx` | Grid-view folder tile (separate from FileCard for distinct folder UX) |
| `FileRow` | `cloud/FileRow.tsx` | List-view row: Name, Modified, Size, Type, actions |
| `FileThumb` | `cloud/FileThumb.tsx` | SVG-based colour-coded file type thumbnail |
| `FolderIcon` | `cloud/FolderIcon.tsx` | SVG folder with optional shared/starred overlay badges |
| `BatchActionBar` | `cloud/BatchActionBar.tsx` | Floating toolbar when 1+ items selected (download, move, delete, share) |
| `GoogleDriveFilters` | `cloud/GoogleDriveFilters.tsx` | Collapsible advanced filters panel |
| `LoginModal` | `cloud/LoginModal.tsx` | Login / registration modal (PocketBase auth) |
| `AdminUserModal` | `cloud/AdminUserModal.tsx` | Admin panel for user management |
| `UserProfileModal` | `cloud/UserProfileModal.tsx` | Profile settings, avatar, password change |
| `ShareModal` | `cloud/ShareModal.tsx` | Share file with other users by email |
| `MoveModal` | `cloud/MoveModal.tsx` | Folder picker to move files/folders to a new location |
| `FilePreviewModal` | `cloud/FilePreviewModal.tsx` | Full-screen media & PDF preview |
| `FileEditorModal` | `cloud/FileEditorModal.tsx` | Plain-text / code editor with save |
| `DocEditorModal` | `cloud/DocEditorModal.tsx` | Rich-text document editor (Mammoth parsing) |
| `SheetEditorModal` | `cloud/SheetEditorModal.tsx` | Spreadsheet grid editor |
| `PdfEditorModal` | `cloud/PdfEditorModal.tsx` | PDF viewer with page controls |
| `StorageAnalyticsModal` | `cloud/StorageAnalyticsModal.tsx` | Storage usage charts & breakdown |
| `UploadProgressWidget` | `cloud/UploadProgressWidget.tsx` | Floating upload progress widget |

---

## Backend API Reference

The Express server (`server.js`) runs on **port 3001**. Vite proxies `/api` requests to it during development.

### Configuration

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/config` | Get current storage root path |
| `POST` | `/api/config` | Set a new storage root path `{ storageRoot: "/path" }` |
| `POST` | `/api/create-user-folder` | Pre-create a user folder `{ userEmail, folderKey? }` |

### File Operations

All file endpoints are **per-user**: pass `userId` as a query param (or `x-user-id` header).

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/files?userId=…&subpath=…` | List files and folders in a directory |
| `POST` | `/api/mkdir` | Create a new folder `{ subpath, name }` |
| `POST` | `/api/upload` | Upload one or more files (multipart); supports nested folder structure |
| `POST` | `/api/rename` | Rename or move a file `{ relPath, newName?, targetDir? }` |
| `POST` | `/api/delete` | Delete a file or folder `{ relPath }` |
| `GET` | `/api/download?path=…&inline=true/false` | Download or inline-preview a file |

### Storage & Security

- Each user's files are isolated under `<storageRoot>/<userFolder>/`.
- Directory traversal is blocked: all paths are validated to remain inside the user's root.
- Hidden files (names starting with `.`) are excluded from listings.
- The active storage root is persisted to `storage_config.json` and defaults to `~/Desktop/GovindServer`.

---

## Authentication (PocketBase)

Authentication and user management are handled by **PocketBase** (running on port **8090**).

`src/lib/pocketbase.ts` exposes:

- **`pb`** — the PocketBase client instance (auto-connects to `http://localhost:8090`).
- **`UserProfile`** — type representing the logged-in user's profile.
- **`uploadFileToPocketBase(file, userId)`** — stores a file record in a PocketBase collection.

### User Roles

| Role | Access |
|---|---|
| Regular user | Own storage folder only |
| Admin | AdminUserModal: create/view/manage all users; see all storage |

---

## Getting Started (Mac / Local Dev)

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- **PocketBase** running locally (see below)

### 1. Install Dependencies

```bash
cd GovindDriveProject
npm install
```

### 2. Start PocketBase (Auth Backend)

[Download PocketBase](https://pocketbase.io/docs/) for macOS, place the binary in the project root, and run:

```bash
./pocketbase serve
```

PocketBase admin UI will be available at `http://localhost:8090/_/`.

Alternatively, use Docker (see [Docker Setup](#docker-setup)).

### 3. Start the Disk API Server

```bash
npm run server
```

Runs `server.js` on **port 3001**. Files will be stored in `~/Desktop/GovindServer` by default (configurable via the admin panel or `storage_config.json`).

### 4. Start the Vite Dev Server

```bash
npm run dev
```

Open **http://localhost:5173** in your browser. The Vite proxy forwards `/api` calls to port 3001 automatically.

---

## Docker Setup

A `docker-compose.yml` is provided to run PocketBase (and optionally the production build) in containers.

```bash
# From the project root:
docker compose up -d
```

| Service | Container | Port |
|---|---|---|
| PocketBase | `govind_pocketbase` | 8090 |
| React Web App (prod build) | `govind_web` | 3000 → 80 |

> **Important:** Change `PB_ENCRYPTION_KEY` in `docker-compose.yml` to a strong secret before using in production.

PocketBase data is persisted in `./pb_data` (mapped as a Docker volume).

---

## Ubuntu Server Deployment

Full step-by-step instructions are in `01 Project Plan/Ubuntu_Deployment_Guide.md`.

**Quick summary:**

```bash
# On Ubuntu — after transferring the project zip
cd ~
unzip GovindDriveProject.zip
cd GovindDriveProject
npm install

# Configure storage root
echo "{\"storageRoot\": \"/home/$(whoami)/GovindServer\"}" > storage_config.json

# Build the frontend
npm run build

# Start services with PM2 (keeps them alive 24/7)
pm2 start server.js --name "govind-backend"
pm2 start "serve -s dist -l 5173" --name "govind-frontend"
pm2 startup && pm2 save
```

Access from any device on your home network:

```
http://<ubuntu-ip>:5173
```

---

## Available Scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `npm run dev` | Start Vite dev server (HMR, proxies /api to :3001) |
| `server` | `npm run server` | Start Express disk API server on port 3001 |
| `build` | `npm run build` | Build production bundle to `dist/` |
| `preview` | `npm run preview` | Preview production build locally |
| `lint` | `npm run lint` | Run ESLint across all source files |
| `typecheck` | `npm run typecheck` | TypeScript type check without emitting files |

---

## Environment & Dependencies

### Runtime Dependencies

| Package | Version | Purpose |
|---|---|---|
| `react` | ^18.3.1 | UI framework |
| `react-dom` | ^18.3.1 | DOM renderer |
| `lucide-react` | ^0.344.0 | Icon library |
| `pocketbase` | ^0.27.0 | Auth + database client |
| `express` | ^5.2.1 | Disk API HTTP server |
| `cors` | ^2.8.6 | CORS middleware for Express |
| `multer` | ^2.2.0 | Multipart file upload handling |
| `pdfjs-dist` | ^6.1.200 | PDF rendering in browser |
| `mammoth` | ^1.12.0 | Word document (.docx) parsing |
| `@supabase/supabase-js` | ^2.57.4 | (Installed, not yet wired — future option) |

### Dev Dependencies

| Package | Version | Purpose |
|---|---|---|
| `vite` | ^5.4.2 | Build tool & dev server |
| `@vitejs/plugin-react` | ^4.3.1 | React HMR support for Vite |
| `typescript` | ^5.5.3 | Static typing |
| `tailwindcss` | ^3.4.1 | Utility-first CSS framework |
| `postcss` | ^8.4.35 | CSS processing |
| `autoprefixer` | ^10.4.18 | Vendor prefix automation |
| `eslint` | ^9.9.1 | Linting |
| `typescript-eslint` | ^8.3.0 | TypeScript-aware ESLint rules |

---

## Known IDE Warnings

The following warnings appear in the IDE but are **not real errors** — the app runs correctly:

| Warning | File | Cause | Status |
|---|---|---|---|
| `Unknown at rule @tailwind` | `src/index.css` lines 3–5 | VS Code CSS language server doesn't know TailwindCSS directives | ✅ Safe to ignore — resolved at build time by PostCSS |
| `Unknown at rule @apply` | `src/index.css` lines 15, 19, 32, 36 | Same reason as above | ✅ Safe to ignore |

To suppress these warnings in VS Code, add the following to `.vscode/settings.json`:

```json
{
  "css.lint.unknownAtRules": "ignore"
}
```

---

> **Note on Supabase:** The `@supabase/supabase-js` package is installed but not wired up. The active backend for auth is **PocketBase**. Supabase can be used as a future alternative if desired.
