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
      sql: `CREATE TABLE IF NOT EXISTS item_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL REFERENCES categories(id),
        name TEXT NOT NULL,
        is_default INTEGER DEFAULT 0,
        UNIQUE(category_id, name)
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL REFERENCES categories(id),
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
  ]);

  // Add columns introduced after initial schema (safe to re-run)
  try {
    await client.execute({ sql: 'ALTER TABLE history ADD COLUMN category_name TEXT', args: [] });
  } catch { /* column already exists */ }

  console.log('Migrations complete');
}

export default db;
