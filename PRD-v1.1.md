# FreezerStock v1.1 — Product Requirements Document

## 1. Executive Summary

**Problem Statement**: As FreezerStock gains real household usage, three gaps have emerged: inventory accuracy degrades over time because there's no way to audit what's physically in the freezer; the flat Category > Item Type hierarchy is too coarse for meats like beef where users think in terms of cuts (steak > sirloin, round, t-bone); and several UX friction points — adding items requires too many taps from the category banner, the PWA icon is a generic blue "F", and weight/size info is too subtle in the item list.

**Proposed Solution**: Five targeted enhancements — (1) an Inventory Check mode for periodic freezer audits, (2) a subcategory tier enabling nested organization (Category > Subcategory > Item Type), (3) quick-add buttons on category/subcategory banners, (4) a redesigned PWA icon depicting an open freezer with an inner glow, and (5) increased visual prominence for weight/size labels.

**Success Criteria**:
- Inventory check: user can audit all items and resolve discrepancies in under 3 minutes for a 30-item freezer
- Subcategory navigation: beef items organized under steak/roast subcategories display correctly with collapsible sub-banners
- Quick-add: adding an item from a category banner takes 2 fewer taps than the current flow (from 4 taps to 2)
- PWA icon: the home screen icon is visually recognizable as a freezer at 192x192 and 512x512 sizes
- Weight visibility: `sizeLabel` text is readable without squinting on a 375px viewport; minimum 14px rendered size with medium font weight

---

## 2. User Experience & Functionality

### User Persona

**Home Cook (returning user)** — Has been using FreezerStock for several weeks. Has 15-40 items tracked across multiple categories. Needs confidence that the app reflects reality. Primarily accesses via PWA on mobile.

### Feature 1: Inventory Check

**US-1.1: Start an Inventory Check**
> As a user, I want to initiate a freezer audit so I can walk through every item and confirm it's still physically in my freezer.

Acceptance Criteria:
- A "Check Inventory" button is accessible from the Inventory page (e.g., in the header or as an action menu option)
- Tapping it enters "Check Mode" — a distinct visual state (e.g., different background tint, header indicator)
- All items are displayed unchecked, organized by category (and subcategory if applicable), same as normal view
- Each item row shows a checkbox on the left, replacing the "Use" button
- The user checks off items they physically confirm are present
- A persistent bottom bar shows progress: "12 / 28 items checked" with a "Finish Check" button

**US-1.2: Complete an Inventory Check**
> As a user, I want to review unchecked items after my audit so I can decide what to do with items I can't find.

Acceptance Criteria:
- Tapping "Finish Check" shows a summary screen listing only unchecked items
- For each unchecked item, the user can choose: "Keep" (leave in inventory) or "Remove" (delete from inventory, logged to history as `removed`)
- A "Remove All Unchecked" bulk action is available with a confirmation dialog
- After resolving all items, the check is complete and the app returns to normal view
- Items that are kept remain unchanged; items removed follow the standard removal flow (snapshot to history)

**US-1.3: Track Check History**
> As a user, I want to see when my last inventory check was so I know when it's time to audit again.

Acceptance Criteria:
- The app stores the timestamp of each completed inventory check
- On the Inventory page, a subtle indicator shows: "Last checked: 3 weeks ago" (or "Never checked")
- The indicator uses amber coloring if the last check was > 30 days ago; gray otherwise
- History entries created by check-based removals are tagged with `action: 'removed'` and include `source: 'inventory_check'` in the `details` JSON

### Feature 2: Subcategories (Nested Organization)

**US-2.1: View Subcategories in Inventory**
> As a user, I want beef items organized under subcategories (e.g., Steak, Roast) so I can find specific cuts faster.

Acceptance Criteria:
- The data model supports a three-tier hierarchy: Category > Subcategory > Item Type
- Subcategories are optional per category — categories without subcategories behave exactly as today (Category > Item Type)
- In the inventory view, subcategories render as nested collapsible banners within their parent category, visually indented and styled as a secondary tier
- Subcategory banners show item count and are independently collapsible
- Items without a subcategory in a category that has subcategories appear under an implicit "Other" grouping at the bottom of that category

**US-2.2: Prepopulated Beef Subcategories**
> As a user opening the app for the first time, I want common beef cuts pre-organized so I don't have to set up the structure myself.

Acceptance Criteria:
- **Beef > Steak** (subcategory) contains item types: Ribeye, Sirloin, T-Bone, New York Strip, Filet Mignon, Round, Flank, Skirt, Misc
- **Beef > Roast** (subcategory) contains item types: Chuck Roast, Rump Roast, Arm Roast, Pot Roast, Misc
- **Beef** (no subcategory, top-level) retains: Ground Beef, Ribs, Brisket, Short Ribs, Misc
- Existing "Steak" and "Roast" item types under Beef are migrated to become subcategories; any existing inventory items referencing the old "Steak" or "Roast" item types are remapped to the appropriate subcategory (defaulting to the "Misc" item type within that subcategory)

**US-2.3: Custom Subcategories**
> As a user, I want to add my own subcategories to any category so I can organize items the way I think about them.

Acceptance Criteria:
- In the Add Item modal, after selecting a category, an optional "Subcategory" selector appears (only if the category has subcategories, or with a "+ Add Subcategory" option)
- Users can create new subcategories via a "+ New Subcategory" option in the selector
- Custom subcategories are marked `is_default: false` in the database
- All categories universally support subcategories; only Beef ships with prepopulated ones

### Feature 3: Quick-Add from Category Banner

**US-3.1: Add Item from Category Banner**
> As a user, I want to tap a "+" button on a category banner to immediately open the add-item form with that category pre-filled.

Acceptance Criteria:
- Each category banner (and subcategory banner) displays a "+" icon button on its right side, before the collapse chevron
- Tapping "+" on a **category** banner opens the Add Item modal with that category pre-selected
- Tapping "+" on a **subcategory** banner opens the Add Item modal with both the parent category and subcategory pre-selected
- The "+" button has a tap target of at least 44x44px
- The "+" button does not interfere with the banner's collapse/expand tap area (collapse is triggered by tapping the rest of the banner)

### Feature 4: PWA Icon Redesign

**US-4.1: Distinctive Home Screen Icon**
> As a user who has added FreezerStock to my home screen, I want a recognizable icon so I can find the app quickly.

Acceptance Criteria:
- The icon depicts a small upright freezer, door partially open, with a cool white/ice-blue glow emanating from inside
- The freezer body uses the app's primary blue (#2563eb) as the base color
- The glow effect uses white-to-light-blue gradient (#e0f2fe to #ffffff)
- The icon reads clearly at both 192x192 and 512x512 sizes
- A maskable variant is included with safe-area padding for adaptive icons on Android
- The manifest is updated to reference the new icons, including a `purpose: "maskable"` entry
- The apple-touch-icon in `index.html` is updated to reference the new icon

### Feature 5: Weight/Size Label Prominence

**US-5.1: More Visible Weight Display**
> As a user browsing my inventory, I want to see item weights/sizes prominently so I can quickly assess what I have.

Acceptance Criteria:
- The `sizeLabel` in `ItemRow` is rendered at `text-sm` (14px) minimum, with `font-medium` weight, in `gray-700` color
- The sizeLabel is displayed on the same line as the displayName, right-aligned or as a distinct pill/badge, rather than appended in smaller text
- If sizeLabel is present, it is visually grouped with the item name as primary-level information (not secondary/tertiary)
- On a 375px viewport, the sizeLabel text is fully visible without truncation for labels up to 12 characters (e.g., "2 lb family")

### Non-Goals (v1.1)

- Price tracking (deferred to Phase 2 per original PRD)
- User authentication / multi-user support
- Barcode scanning
- Shopping list generation
- Notifications / expiry alerts
- Offline-first data sync (current NetworkFirst caching is sufficient)
- Subcategory drag-and-drop reordering
- Scheduled/automated inventory check reminders (push notifications)

---

## 3. Technical Specifications

### Architecture Overview

No changes to the deployment architecture. The existing Docker Compose setup (Vite frontend on :3000, Express backend on :3001, SQLite database) is retained. Changes are additive to the existing schema, API, and UI layers.

### 3.1 Database Schema Changes

#### New Table: `subcategories`

```sql
CREATE TABLE IF NOT EXISTS subcategories (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id   INTEGER NOT NULL REFERENCES categories(id),
  name          TEXT NOT NULL,
  sort_order    INTEGER DEFAULT 0,
  is_default    INTEGER DEFAULT 0,
  UNIQUE(category_id, name)
);
```

#### Modified Table: `item_types`

Add a nullable foreign key to subcategories:

```sql
ALTER TABLE item_types ADD COLUMN subcategory_id INTEGER REFERENCES subcategories(id) DEFAULT NULL;
```

Item types with `subcategory_id = NULL` remain top-level within their category (e.g., Ground Beef under Beef with no subcategory).

#### Modified Table: `items`

Add a nullable foreign key to subcategories:

```sql
ALTER TABLE items ADD COLUMN subcategory_id INTEGER REFERENCES subcategories(id) DEFAULT NULL;
```

This is denormalized from the item_type's subcategory for query performance and to support custom items (which have no item_type) that still belong to a subcategory.

#### New Table: `inventory_checks`

```sql
CREATE TABLE IF NOT EXISTS inventory_checks (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  completed_at  TEXT NOT NULL DEFAULT (datetime('now')),
  total_items   INTEGER NOT NULL,
  checked_count INTEGER NOT NULL,
  removed_count INTEGER NOT NULL
);
```

#### Data Migration

The migration in `migrate.ts` must:

1. Create the `subcategories` table
2. Add `subcategory_id` column to `item_types` (idempotent ALTER TABLE)
3. Add `subcategory_id` column to `items` (idempotent ALTER TABLE)
4. Create the `inventory_checks` table
5. Seed beef subcategories and remap existing item types:
   - Create subcategory "Steak" under Beef
   - Create subcategory "Roast" under Beef
   - Find existing "Steak" item type under Beef → reassign its `subcategory_id` to the new Steak subcategory, then rename it to "Misc" (or delete if a "Misc" already exists in the steak subcategory context)
   - Find existing "Roast" item type under Beef → same treatment
   - Insert new item types under each subcategory
   - Update any existing `items` rows that referenced the old Steak/Roast item types

The migration must be idempotent — running it on an already-migrated database is a no-op.

### 3.2 Updated Seed Data

**Beef category (expanded):**

| Subcategory | Item Types |
|-------------|-----------|
| *(none — top-level)* | Ground Beef, Ribs, Brisket, Short Ribs, Misc |
| Steak | Ribeye, Sirloin, T-Bone, New York Strip, Filet Mignon, Round, Flank, Skirt, Misc |
| Roast | Chuck Roast, Rump Roast, Arm Roast, Pot Roast, Misc |

All other categories remain unchanged (no subcategories by default).

### 3.3 API Changes

#### Updated Endpoints

**`GET /api/categories`** — Response shape updated:

```typescript
interface Category {
  id: number;
  name: string;
  sortOrder: number | null;
  isDefault: boolean | null;
  itemTypes: ItemType[];          // top-level item types (no subcategory)
  subcategories: Subcategory[];   // nested subcategories with their item types
}

interface Subcategory {
  id: number;
  categoryId: number;
  name: string;
  sortOrder: number | null;
  isDefault: boolean | null;
  itemTypes: ItemType[];
}

interface ItemType {
  id: number;
  categoryId: number;
  subcategoryId: number | null;
  name: string;
  isDefault: boolean | null;
}
```

**`GET /api/items`** — Response adds joined subcategory fields:

```typescript
interface Item {
  // ... existing fields ...
  subcategoryId: number | null;
  subcategoryName?: string;       // joined from subcategories table
}
```

**`POST /api/items`** — Request body accepts optional `subcategoryId`:

```typescript
{
  categoryId: number;
  subcategoryId?: number;         // NEW — optional
  itemTypeId?: number;
  customName?: string;
  quantity: number;
  sizeLabel?: string;
  frozenDate: string;
  notes?: string;
}
```

#### New Endpoints

**`POST /api/subcategories`** — Create a custom subcategory:

```
Request:  { categoryId: number, name: string }
Response: { id, categoryId, name, sortOrder, isDefault: false }
409:      { error: "Subcategory already exists in this category" }
```

**`POST /api/inventory-checks/start`** — Begin an inventory check:

```
Response: { checkId: number, items: Item[] }
```

Returns all current inventory items for the check session. The `checkId` is used to finalize.

**`POST /api/inventory-checks/:id/complete`** — Finalize a check:

```
Request:  { checkedItemIds: number[], removals: number[] }
Response: { 
  id: number, 
  completedAt: string, 
  totalItems: number, 
  checkedCount: number, 
  removedCount: number 
}
```

- `checkedItemIds`: IDs of items confirmed present
- `removals`: IDs of items to remove (each is deleted with history entry including `source: 'inventory_check'` in details JSON)

**`GET /api/inventory-checks/latest`** — Get the most recent check:

```
Response: { id, completedAt, totalItems, checkedCount, removedCount } | null
```

### 3.4 Frontend Changes

#### New Types (`frontend/src/types/index.ts`)

```typescript
interface Subcategory {
  id: number;
  categoryId: number;
  name: string;
  sortOrder: number | null;
  isDefault: boolean | null;
  itemTypes: ItemType[];
}

interface InventoryCheck {
  id: number;
  completedAt: string;
  totalItems: number;
  checkedCount: number;
  removedCount: number;
}
```

Update `Category` to include `subcategories: Subcategory[]`.
Update `Item` to include `subcategoryId: number | null` and `subcategoryName?: string`.
Update `ItemType` to include `subcategoryId: number | null`.

#### Component Changes

**`CategoryGroup.tsx`** — Major refactor:
- Receives subcategory data and groups items into subcategory sections
- Renders subcategory banners as indented secondary headers within the category
- Each subcategory banner has: name, item count pill, "+" quick-add button, collapse chevron
- Category banner itself also gets a "+" quick-add button
- The "+" buttons emit an `onQuickAdd(categoryId, subcategoryId?)` callback

**`ItemRow.tsx`** — `sizeLabel` styling update:
- Change from `text-xs text-gray-400` to `text-sm font-medium text-gray-700`
- Display as a pill/badge: `bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full` on the same line as the display name
- Position: right-aligned on the name line, or inline after the name with clear spacing

**`AddItemModal.tsx`** — Subcategory support:
- Add subcategory `<select>` between category and item type selectors
- Subcategory selector only appears when the selected category has subcategories
- Include a "+ New Subcategory" option that shows a text input
- Accept optional `initialCategoryId` and `initialSubcategoryId` props for quick-add pre-fill
- Item types filter based on selected subcategory (or show top-level types if no subcategory selected)

**New Component: `InventoryCheckMode.tsx`**:
- Replaces the normal inventory view when check mode is active
- Renders all items with checkboxes instead of "Use" buttons
- Persistent bottom bar with progress counter and "Finish Check" button
- Distinct visual state: light blue background tint on header, "Checking..." indicator

**New Component: `CheckSummaryModal.tsx`**:
- Bottom-sheet modal shown when "Finish Check" is tapped
- Lists unchecked items with "Keep" / "Remove" actions per item
- "Remove All Unchecked" button with confirmation
- "Done" button to finalize and close

**`InventoryPage.tsx`** — Integration:
- Add "Check Inventory" button in header (e.g., clipboard-check icon)
- Toggle between normal view and `InventoryCheckMode`
- Show "Last checked: X ago" indicator below the search bar when not in check mode
- Pass `onQuickAdd` handlers from `CategoryGroup` through to `AddItemModal`

#### TanStack Query Updates

- `queryKey: ['categories']` — cache shape updated to include subcategories
- `queryKey: ['inventory-check-latest']` — new query for last check timestamp
- Inventory check mutations invalidate `['items']` and `['inventory-check-latest']`
- Subcategory creation mutation invalidates `['categories']`

### 3.5 PWA Icon

Generate new icons as SVG-based PNGs:

- `icon-192.png` (192x192) — Freezer with glow, detailed
- `icon-512.png` (512x512) — Same design, high resolution
- `icon-maskable-192.png` (192x192) — With safe-area padding (icon content within center 80%)
- `icon-maskable-512.png` (512x512) — Same with safe-area padding

Update `vite.config.ts` manifest icons array:

```typescript
icons: [
  { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
  { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
  { src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
  { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
],
```

**Icon Design Specification**:
- Freezer body: Rounded rectangle, fill #2563eb (blue-600), subtle darker border (#1d4ed8)
- Door: Right-side hinge, partially open (15-20 degree angle), lighter blue (#3b82f6) inner face
- Glow: Radial gradient from white (#ffffff) at center to ice-blue (#e0f2fe) at edges, emanating from the opening
- Handle: Small horizontal bar on the door, white or silver (#e5e7eb)
- Background: Transparent (standard icons) or white circle (maskable)
- Style: Flat/semi-flat with minimal detail — must read clearly at 48x48 CSS px (smallest Android render)

### 3.6 Integration Points

No new external dependencies. All changes are internal to the existing Express + SQLite + React stack.

- **Database**: Additive schema changes via ALTER TABLE (backward-compatible; v1.0 data is preserved)
- **API**: New endpoints are additive; existing endpoints are backward-compatible (subcategory fields default to null)
- **Realtime**: Existing WebSocket broadcast covers new mutations (all use existing `broadcastRealtime('items.changed')` and `broadcastRealtime('categories.changed')` events)

### 3.7 Security & Privacy

No changes to the security model. FreezerStock remains a single-user, self-hosted application with no authentication. All data stays local in the SQLite database within the Docker volume.

---

## 4. Risks & Roadmap

### Phased Rollout

**v1.1a — Foundation (ship together)**:
- Database schema migration (subcategories table, column additions)
- Subcategory seed data for Beef
- Updated `GET /api/categories` and `GET /api/items` responses
- Subcategory support in Add Item modal
- Weight/size label styling update
- Quick-add buttons on category banners

**v1.1b — Inventory Check**:
- Inventory check API endpoints
- Check mode UI
- Check summary and resolution flow
- Check history tracking

**v1.1c — Polish**:
- PWA icon redesign
- Subcategory banners in inventory view
- Quick-add from subcategory banners
- Final QA pass on 375px viewport

### Technical Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Data migration breaks existing items | High | Migration is idempotent and additive-only. Old item_type references remain valid. Thorough testing with a populated database before release. Back up SQLite file before migration. |
| Subcategory UI adds visual clutter | Medium | Subcategories are collapsible. Categories without subcategories are unchanged. User test with a real 30-item inventory. |
| Inventory check state lost if app closes mid-check | Medium | Check state is client-side only (React state). If the app closes, the check is abandoned — no data is lost or corrupted. Consider localStorage persistence if this becomes a pain point. |
| PWA icon caching | Low | Service worker auto-update is already configured. Users may need to re-add PWA to home screen to see new icon. Document this in release notes. |
| Quick-add button conflicts with banner tap area | Low | Separate tap targets: "+" button is a distinct clickable element with `stopPropagation()`. The rest of the banner toggles collapse. Ensure 44px minimum touch target per WCAG. |

---

## 5. Verification

- [ ] `docker-compose up --build` succeeds and both containers start
- [ ] Existing inventory items display correctly after migration (no data loss)
- [ ] Beef category shows Steak and Roast subcategories with correct item types
- [ ] Adding a custom subcategory to any category works
- [ ] Subcategory banners render correctly in inventory view, nested under parent category
- [ ] "+" button on category banner opens Add Item with category pre-selected
- [ ] "+" button on subcategory banner opens Add Item with category + subcategory pre-selected
- [ ] Inventory check: can enter check mode, check items, finish, and resolve unchecked items
- [ ] Inventory check: removed items appear in history with `source: 'inventory_check'`
- [ ] "Last checked" indicator shows correct relative time
- [ ] Weight/size labels are clearly readable at 375px viewport width
- [ ] PWA icon shows freezer design when added to home screen (Android Chrome, iOS Safari)
- [ ] All existing functionality (search, use, undo, edit, delete, history) works unchanged
- [ ] TanStack Query caches update correctly after subcategory and inventory check mutations
