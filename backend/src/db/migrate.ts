import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data/freezerstock.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const client = createClient({ url: `file:${dbPath}` });

export const db = drizzle(client, { schema });

export async function runMigrations() {
  await client.batch([
    { sql: "PRAGMA foreign_keys = ON", args: [] },
    {
      sql: `CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        sort_order INTEGER DEFAULT 0,
        is_default INTEGER DEFAULT 0
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS subcategories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL REFERENCES categories(id),
        name TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        is_default INTEGER DEFAULT 0,
        UNIQUE(category_id, name)
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS item_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL REFERENCES categories(id),
        subcategory_id INTEGER REFERENCES subcategories(id),
        name TEXT NOT NULL,
        is_default INTEGER DEFAULT 0,
        UNIQUE(category_id, subcategory_id, name)
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL REFERENCES categories(id),
        subcategory_id INTEGER REFERENCES subcategories(id),
        item_type_id INTEGER REFERENCES item_types(id),
        custom_name TEXT,
        quantity INTEGER NOT NULL DEFAULT 1,
        size_label TEXT,
        frozen_date TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        item_id INTEGER,
        item_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        details TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS inventory_checks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        completed_at TEXT NOT NULL DEFAULT (datetime('now')),
        total_items INTEGER NOT NULL,
        checked_count INTEGER NOT NULL,
        removed_count INTEGER NOT NULL
      )`,
      args: [],
    },
  ]);

  // Add columns introduced after initial schema (safe to re-run — each wrapped individually)
  const alterations = [
    'ALTER TABLE history ADD COLUMN category_name TEXT',
    'ALTER TABLE item_types ADD COLUMN subcategory_id INTEGER REFERENCES subcategories(id)',
    'ALTER TABLE items ADD COLUMN subcategory_id INTEGER REFERENCES subcategories(id)',
  ];

  for (const stmt of alterations) {
    try {
      await client.execute({ sql: stmt, args: [] });
    } catch { /* column already exists */ }
  }

  // v1.1: The old item_types table had UNIQUE(category_id, name) without subcategory_id,
  // which prevents having e.g. "Misc" under both Beef top-level and Beef > Steak.
  // Recreate the table with the correct 3-column unique constraint if the old one exists.
  await fixItemTypesUniqueConstraint();

  console.log('Migrations complete');
}

/**
 * The original item_types schema had UNIQUE(category_id, name) with no subcategory_id.
 * This prevents having the same name (e.g. "Misc") under different subcategories.
 * We fix it by recreating the table with UNIQUE(category_id, subcategory_id, name).
 * Safe to re-run — checks first whether the old constraint is still in place.
 */
async function fixItemTypesUniqueConstraint() {
  // Read current CREATE statement to detect whether old constraint is present
  const result = await client.execute({
    sql: `SELECT sql FROM sqlite_master WHERE type='table' AND name='item_types'`,
    args: [],
  });
  const createSql: string = (result.rows[0]?.sql as string) ?? '';

  // If it already has subcategory_id in the unique constraint (or no unique at all), we're fine
  if (!createSql.includes('UNIQUE(category_id, name)')) return;

  // Recreate the table with the correct constraint.
  // Must disable FK enforcement for the duration — DROP TABLE fails while
  // items.item_type_id still references item_types(id) with FK checks on.
  await client.execute({ sql: 'PRAGMA foreign_keys = OFF', args: [] });
  try {
    await client.batch([
      // 1. Create replacement table
      {
        sql: `CREATE TABLE IF NOT EXISTS item_types_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          category_id INTEGER NOT NULL REFERENCES categories(id),
          subcategory_id INTEGER REFERENCES subcategories(id),
          name TEXT NOT NULL,
          is_default INTEGER DEFAULT 0,
          UNIQUE(category_id, subcategory_id, name)
        )`,
        args: [],
      },
      // 2. Copy all data
      {
        sql: `INSERT OR IGNORE INTO item_types_new (id, category_id, subcategory_id, name, is_default)
              SELECT id, category_id, subcategory_id, name, is_default FROM item_types`,
        args: [],
      },
      // 3. Drop old table (safe with FK checks off)
      { sql: 'DROP TABLE item_types', args: [] },
      // 4. Rename new table into place
      { sql: 'ALTER TABLE item_types_new RENAME TO item_types', args: [] },
    ]);
  } finally {
    await client.execute({ sql: 'PRAGMA foreign_keys = ON', args: [] });
  }
}

export default db;
