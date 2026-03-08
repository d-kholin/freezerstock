# FreezerStock - Product Requirements Document

## 1. Executive Summary

**Problem Statement**: Managing a home freezer inventory is currently a guessing game. Users can't quickly check what they have in stock while shopping, items get forgotten and suffer freezer burn, and there's no way to track how long something has been frozen.

**Proposed Solution**: FreezerStock — a mobile-first web application for tracking freezer inventory with categorized items, quantity tracking, and time-in-freezer visibility. Dockerized for self-hosted deployment.

**Success Criteria**:
- User can check full freezer inventory from their phone in under 3 seconds (page load)
- Adding a new item takes fewer than 4 taps
- Removing/using an item takes 2 taps (find + checkoff)
- All items display time-in-freezer at a glance
- Architecture supports adding price tracking without schema migration breaking changes

---

## 2. User Experience & Functionality

### User Persona
**Home Cook** — Manages a household freezer and needs to know what's in stock while grocery shopping.

### User Stories

**US-1: Browse Inventory**
> As a user, I want to see all my freezer items organized by category so I can quickly find what I have.

Acceptance Criteria:
- Items grouped by category (Beef, Chicken, Pork, Fish, Vegetables, Prepared Meals, Other)
- Each item shows: name, quantity, size/weight, and time in freezer (e.g., "3 months ago")
- Categories are collapsible
- Search/filter bar at top

**US-2: Add Item**
> As a user, I want to quickly add items to my inventory so I can keep it up to date.

Acceptance Criteria:
- Select category, then pick from prepopulated item types OR enter custom name
- Quantity defaults to 1, adjustable
- Size/weight field (e.g., "2 lb", "family pack")
- Date defaults to current month (YYYY-MM), with override option
- Optional notes field

**US-3: Use/Remove Item**
> As a user, I want to quickly check off items as I use them so my inventory stays accurate.

Acceptance Criteria:
- Swipe or tap to decrement quantity by 1
- When quantity reaches 0, item is removed from active view (moved to history)
- Bulk remove option (set quantity directly)
- Confirmation on last item removal

**US-4: Custom Items**
> As a user, I want to add one-off or unusual items that don't fit standard categories.

Acceptance Criteria:
- "Custom" option in every category
- Free-text name field
- Same size/quantity/date fields as standard items

**US-5: Check Stock While Shopping**
> As a user, I want to quickly look up a specific item while in a store to see if I need to buy more.

Acceptance Criteria:
- Search bar prominently placed at the top of the main view
- Search across all categories
- Results show quantity and age instantly

### Non-Goals (v1)
- Price tracking (architected for, but not implemented in v1)
- User authentication / multi-user support
- Barcode scanning
- Shopping list generation
- Notifications / expiry alerts
- Offline support / PWA caching
- In-app item processing/breakdown flow

---

## 3. Technical Specifications

### Architecture Overview

```
┌─────────────────────────────┐
│     Docker Compose          │
│                             │
│  ┌───────────────────────┐  │
│  │  Frontend Container   │  │
│  │  React (Vite)         │  │
│  │  Serves on :3000      │  │
│  └──────────┬────────────┘  │
│             │ API calls     │
│  ┌──────────▼────────────┐  │
│  │  Backend Container    │  │
│  │  Node.js + Express    │  │
│  │  Serves on :3001      │  │
│  │  SQLite (file volume) │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
        ▲
        │ User manages reverse proxy + SSL
```

### Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React 18+ (Vite), React Router, TanStack Query |
| UI Framework | Tailwind CSS (mobile-first) |
| Backend | Node.js, Express |
| Database | SQLite via better-sqlite3 |
| ORM | Drizzle ORM |
| Containerization | Docker, Docker Compose |

### Database Schema

```sql
-- Categories (prepopulated + user-created)
categories (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  sort_order  INTEGER DEFAULT 0,
  is_default  BOOLEAN DEFAULT false
)

-- Item types (prepopulated templates within categories)
item_types (
  id          INTEGER PRIMARY KEY,
  category_id INTEGER REFERENCES categories(id),
  name        TEXT NOT NULL,
  is_default  BOOLEAN DEFAULT false,
  UNIQUE(category_id, name)
)

-- Actual inventory entries
items (
  id            INTEGER PRIMARY KEY,
  category_id   INTEGER REFERENCES categories(id),
  item_type_id  INTEGER REFERENCES item_types(id) NULL, -- null for custom
  custom_name   TEXT NULL,           -- used when item_type_id is null
  quantity      INTEGER NOT NULL DEFAULT 1,
  size_label    TEXT NULL,           -- e.g., "2 lb", "family pack"
  frozen_date   TEXT NOT NULL,       -- YYYY-MM format
  notes         TEXT NULL,
  -- Future: price_per_unit REAL NULL, price_total REAL NULL, store TEXT NULL
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
)

-- History log for add/remove actions
history (
  id            INTEGER PRIMARY KEY,
  action        TEXT NOT NULL,       -- 'used', 'added'
  item_id       INTEGER NULL,
  item_name     TEXT NOT NULL,       -- denormalized for persistence
  quantity      INTEGER NOT NULL,
  details       TEXT NULL,           -- JSON metadata (e.g., snapshots for undo)
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
)
```

### Prepopulated Data

**Categories & Item Types:**
- **Beef**: Steak, Roast, Ground Beef, Ribs, Brisket, Misc
- **Chicken**: Breasts, Thighs, Legs, Wings, Whole, Ground, Misc
- **Pork**: Chops, Roast, Loin, Ground, Ribs, Tenderloin, Misc
- **Fish/Seafood**: Fillets, Shrimp, Whole Fish, Misc
- **Vegetables**: Mixed Vegetables, Corn, Peas, Green Beans, Broccoli, Misc
- **Prepared Meals**: Casserole, Soup, Sauce, Misc
- **Other**: (custom items only)

### API Endpoints

```
GET    /api/categories          -- List all categories with item types
GET    /api/items               -- List all items (with category info), supports ?search=
POST   /api/items               -- Add new item
PATCH  /api/items/:id           -- Update item (quantity, notes, etc.)
DELETE /api/items/:id           -- Remove item entirely
POST   /api/items/:id/use       -- Decrement quantity by N (default 1)
GET    /api/history             -- View history log
POST   /api/categories          -- Add custom category
POST   /api/item-types          -- Add custom item type
```

### Key Design Decisions

1. **Frozen date as YYYY-MM**: Users think in months ("I froze this in February"), not specific days. Stored as text, displayed as relative time ("3 months ago").

2. **Quantity model**: Each row represents a "type" of item in the freezer (e.g., "2lb bags of chicken breasts frozen in Feb"). Quantity tracks how many of that exact item you have. This matches the mental model of "I have 4 bags of the same thing."

3. **Price-ready schema**: The `items` table has commented-out price columns. When price tracking is added, these columns are added (non-breaking), and the history table's JSON `details` field can store price data. No schema redesign needed.

### Docker Setup

```yaml
# docker-compose.yml
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "3001:3001"
    volumes:
      - freezerstock-data:/app/data
    environment:
      - DATABASE_PATH=/app/data/freezerstock.db

volumes:
  freezerstock-data:
```

---

## 4. UI Layout (Mobile-First)

### Main Screen
```
┌──────────────────────┐
│ FreezerStock     [+]  │
│ ┌──────────────────┐ │
│ │ Search...        │ │
│ └──────────────────┘ │
│                      │
│ ▼ Beef (5 items)     │
│   Ground Beef  3x 1lb │ ← swipe left to use
│   Steaks      2x 8oz │
│                      │
│ ▼ Chicken (8 items)  │
│   Breasts  4x 2lb    │  2mo ago
│   Thighs   4x 1lb   │  1mo ago
│                      │
│ ► Pork (3 items)     │  (collapsed)
│ ► Vegetables (2)     │
│                      │
│ [Inventory] [History]│
└──────────────────────┘
```

### Add Item Flow
```
Category → Item Type (or Custom) → Quantity/Size/Date → Save
```

---

## 5. Risks & Roadmap

### Phase 1 — MVP (Current)
- Category/item CRUD with prepopulated data
- Quantity tracking with quick-use action
- Frozen date tracking with relative display
- Search
- Docker deployment
- Mobile-first responsive UI

### Phase 2 — Price Tracking
- Add price fields to items
- Price history per item type
- "Is this a good deal?" comparison view in store
- Cost-per-pound normalization

### Phase 3 — Enhanced Features
- Usage analytics (what do you go through fastest?)
- Low stock indicators
- Optional notifications (freezer burn warnings)
- Data export/import

### Technical Risks
| Risk | Mitigation |
|------|-----------|
| SQLite concurrency | Single-user app, not a concern |
| Data loss | Docker volume persistence; future: backup/export feature |
| Mobile UX on small screens | Design mobile-first, test on 375px width |

---

## 6. Project Structure

```
freezerstock/
├── docker-compose.yml
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── api/            -- API client functions
│       ├── components/     -- Reusable UI components
│       ├── pages/          -- Route pages
│       └── types/          -- TypeScript interfaces
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.ts        -- Express app entry
│       ├── db/
│       │   ├── schema.ts   -- Drizzle schema
│       │   ├── migrate.ts  -- Migration runner
│       │   └── seed.ts     -- Prepopulated categories/types
│       └── routes/
│           ├── categories.ts
│           ├── items.ts
│           └── history.ts
└── README.md
```

---

## 7. Verification

- Run `docker-compose up --build` and confirm both containers start
- Access frontend at `http://localhost:3000`
- Verify prepopulated categories and item types appear
- Add an item, verify it shows with correct time-in-freezer
- Add multiple of the same item, verify quantity tracking
- Swipe/tap to use an item, verify quantity decrements
- Search for an item by name
- Test on mobile viewport (375px Chrome DevTools)
