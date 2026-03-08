# FreezerStock

A mobile-first web app for managing your household freezer inventory. Track what's in your freezer, see how long items have been stored, and use items with a single tap.

## Features

- **Inventory** — Browse items grouped by category (Beef, Chicken, Pork, etc.), search by name, and see frozen dates at a glance
- **Quick-use** — Decrement item quantity in one tap; items are removed automatically when quantity hits zero
- **Age tracking** — Frozen date stored by month; color-coded display shows freshness (gray → amber → red as items age)
- **Aging alerts** — Banner and Reports page highlight items 6+ months old sorted by oldest first
- **History & undo** — All adds and uses are logged; undo within seconds via toast notification or any time from the History tab
- **Custom items** — Add items not in the prepopulated type list with a custom name

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TanStack Query, React Router, Tailwind CSS |
| Backend | Node.js, Express, Drizzle ORM |
| Database | SQLite via `@libsql/client` |
| Deployment | Docker + Docker Compose, Nginx |

## Getting Started

### Docker (recommended)

```bash
docker-compose up --build
```

Frontend: http://localhost:3000

The SQLite database is persisted in a named Docker volume (`freezerstock-data`).

### Local development

**Backend:**
```bash
cd backend && npm install && npm run dev
```

**Frontend:**
```bash
cd frontend && npm install && npm run dev
```

> Note: `vite.config.ts` proxies `/api` to the backend using the Docker hostname. For local-only development, update the proxy target in `vite.config.ts` to point to `localhost`.

### Build

```bash
cd backend && npm run build    # tsc → dist/
cd frontend && npm run build   # tsc + vite → dist/
```

## Project Structure

```
freezerstock/
├── backend/
│   └── src/
│       ├── index.ts              # Express app, mounts routers
│       ├── db/
│       │   ├── migrate.ts        # DB connection + CREATE TABLE migrations
│       │   ├── schema.ts         # Drizzle table definitions
│       │   └── seed.ts           # Default categories and item types
│       └── routes/
│           ├── items.ts          # CRUD, use, undo-use
│           ├── categories.ts     # Categories and item types
│           └── history.ts        # History log and restore
├── frontend/
│   └── src/
│       ├── App.tsx               # Router + bottom tab navigation
│       ├── api/index.ts          # Centralized API client
│       ├── types/index.ts        # Shared TypeScript interfaces
│       ├── pages/
│       │   ├── InventoryPage.tsx
│       │   ├── ReportsPage.tsx
│       │   └── HistoryPage.tsx
│       └── components/
│           ├── AddItemModal.tsx
│           ├── EditItemModal.tsx
│           ├── ItemRow.tsx
│           ├── CategoryGroup.tsx
│           ├── FrozenAgo.tsx
│           ├── AgingBanner.tsx
│           └── UseToast.tsx
└── docker-compose.yml
```

## Data Model

- **`frozenDate`** is stored as `YYYY-MM` text. Age is always calculated client-side — never in SQL.
- **Item identity**: Items are either *typed* (linked to a predefined `item_type`) or *custom* (free-text name). `displayName = customName || itemType.name`.
- **History entries** store a full JSON snapshot of the item so that fully-consumed items can be restored.

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/items` | List items (optional `?search=`) |
| POST | `/api/items` | Add item |
| PATCH | `/api/items/:id` | Edit item |
| DELETE | `/api/items/:id` | Delete item |
| POST | `/api/items/:id/use` | Decrement quantity |
| GET | `/api/categories` | List categories with item types |
| GET | `/api/history` | Activity log |
| POST | `/api/history/:id/restore` | Undo an action |

## Configuration

| Variable | Default | Description |
|---|---|---|
| `FRONTEND_PORT` | `3000` | Host port for the frontend container |
| `DATABASE_PATH` | `/app/data/freezerstock.db` | SQLite file path |
