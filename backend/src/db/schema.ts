import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  sortOrder: integer('sort_order').default(0),
  isDefault: integer('is_default', { mode: 'boolean' }).default(false),
});

export const itemTypes = sqliteTable('item_types', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  categoryId: integer('category_id').notNull().references(() => categories.id),
  name: text('name').notNull(),
  isDefault: integer('is_default', { mode: 'boolean' }).default(false),
});

export const items = sqliteTable('items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  categoryId: integer('category_id').notNull().references(() => categories.id),
  itemTypeId: integer('item_type_id').references(() => itemTypes.id),
  customName: text('custom_name'),
  quantity: integer('quantity').notNull().default(1),
  sizeLabel: text('size_label'),
  frozenDate: text('frozen_date').notNull(), // YYYY-MM
  notes: text('notes'),
  // Future price tracking columns:
  // pricePerUnit: real('price_per_unit'),
  // priceTotal: real('price_total'),
  // store: text('store'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const history = sqliteTable('history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  action: text('action').notNull(), // 'used' | 'removed' | 'added' (legacy rows may include 'processed')
  itemId: integer('item_id'),
  itemName: text('item_name').notNull(),
  categoryName: text('category_name'),
  quantity: integer('quantity').notNull(),
  details: text('details'), // JSON string
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export type Category = typeof categories.$inferSelect;
export type ItemType = typeof itemTypes.$inferSelect;
export type Item = typeof items.$inferSelect;
export type HistoryEntry = typeof history.$inferSelect;
