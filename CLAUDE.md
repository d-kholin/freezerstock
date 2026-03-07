# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Docker (primary)
```bash
docker-compose up --build   # Build and start both services
docker-compose up           # Start without rebuilding
docker-compose down         # Stop
```
Frontend: http://localhost:3000 · Backend: http://localhost:3001

### Local development (without Docker)
```bash
# Backend
cd backend && npm install && npm run dev    # tsx watch, auto-restarts

# Frontend — NOTE: vite.config.ts proxies /api to http://backend:3001 (Docker hostname)
# Change proxy target to http://localhost:3001 for local-only dev
cd frontend && npm install && npm run dev
```

### Build
```bash
cd backend && npm run build    # tsc → dist/
cd frontend && npm run build   # tsc + vite → dist/
```

There are no lint or test scripts configured.

## Architecture

### Request flow
Browser → Vite dev server (`:3000`) → proxy `/api/*` → Express (`:3001`) → SQLite via `@libsql/client` + Drizzle ORM

In production (Docker), Nginx serves the built frontend and proxies `/api` to the backend container.

### Backend (`backend/src/`)
- **`db/migrate.ts`** — initializes the DB connection (exported as `db`), runs `CREATE TABLE IF NOT EXISTS` migrations on startup. No migration file system — schema changes go here as additional SQL statements.
- **`db/schema.ts`** — Drizzle table definitions (source of truth for TypeScript types).
- **`db/seed.ts`** — populates default categories and item types on startup (idempotent).
- **`routes/items.ts`** — most business logic lives here: use/undo-use/process endpoints.
- **`index.ts`** — mounts routers; `/api/item-types` is handled by rewiring into `categoriesRouter`.

### Frontend (`frontend/src/`)
- **`api/index.ts`** — single API client; all fetch calls go through here.
- **`types/index.ts`** — shared TypeScript interfaces. `Item` has joined fields (`categoryName`, `itemTypeName`, `displayName`) added by the backend's SELECT.
- **`App.tsx`** — router + bottom tab bar (Inventory / Reports / History).
- **`pages/`** — one file per route; pages own their mutations and modals.
- **`components/`** — presentational components; `FrozenAgo.tsx` and `AgingBanner.tsx`/`ReportsPage.tsx` all compute age client-side.

### Key data model details
- **`frozenDate`** is stored as `YYYY-MM` text. Age is computed client-side only — never in SQL.
- **Age formula** (used in `FrozenAgo.tsx`, `AgingBanner.tsx`, `ReportsPage.tsx`):
  ```ts
  (now.getFullYear() - year) * 12 + (now.getMonth() + 1 - month)
  // month from frozenDate is 1-indexed; getMonth() is 0-indexed
  ```
- **Item identity**: each row is a "type+batch" (e.g., "2lb chicken breasts frozen Feb"). `itemTypeId` is null for custom items; `customName` is null for typed items. `displayName = customName || itemType.name`.
- **Processing** (`POST /items/:id/process`): atomically deletes the source item and creates output items that inherit `frozenDate` from the source.
- **Undo-use** (`POST /items/undo-use`): deletes the history entry and restores quantity; if the item was fully consumed, re-creates it from a `snapshot` passed by the client.

### TanStack Query conventions
- `queryKey: ['items', search]` — inventory page (search-filtered)
- `queryKey: ['items']` — reports page (all items, shares cache with unsearched inventory)
- `queryKey: ['categories']` — category list with item types
- All mutations call `qc.invalidateQueries({ queryKey: ['items'] })` to refresh both query variants.

## PRD alignment note
All edits should be checked against `PRD.md`. If a proposed change conflicts with the PRD (e.g., adding authentication, price tracking UI, or offline support — all explicitly out of scope for v1), flag it and ask the user before proceeding.
