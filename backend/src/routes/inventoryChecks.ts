import { Router } from 'express';
import { db } from '../db/migrate';
import { items, categories, subcategories, itemTypes, history, inventoryChecks } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { broadcastRealtime } from '../realtime';

const router = Router();

// GET /api/inventory-checks/latest
router.get('/latest', async (req, res) => {
  try {
    const [latest] = await db
      .select()
      .from(inventoryChecks)
      .orderBy(desc(inventoryChecks.completedAt))
      .limit(1);
    res.json(latest ?? null);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch latest inventory check' });
  }
});

// POST /api/inventory-checks/start
router.post('/start', async (req, res) => {
  try {
    const rows = await db
      .select({
        item: items,
        category: categories,
        subcategory: subcategories,
        itemType: itemTypes,
      })
      .from(items)
      .leftJoin(categories, eq(items.categoryId, categories.id))
      .leftJoin(subcategories, eq(items.subcategoryId, subcategories.id))
      .leftJoin(itemTypes, eq(items.itemTypeId, itemTypes.id))
      .orderBy(categories.sortOrder, subcategories.sortOrder, itemTypes.name, items.customName);

    const result = rows.map(({ item, category, subcategory, itemType }) => ({
      ...item,
      categoryName: category?.name,
      subcategoryName: subcategory?.name ?? null,
      itemTypeName: itemType?.name,
      displayName: item.customName || itemType?.name,
    }));

    res.json({ items: result });
  } catch (err) {
    res.status(500).json({ error: 'Failed to start inventory check' });
  }
});

// POST /api/inventory-checks/complete
router.post('/complete', async (req, res) => {
  try {
    const { checkedItemIds, removals } = req.body as {
      checkedItemIds: number[];
      removals: number[];
    };

    if (!Array.isArray(checkedItemIds) || !Array.isArray(removals)) {
      return res.status(400).json({ error: 'checkedItemIds and removals must be arrays' });
    }

    // Count all current items for the record
    const allItems = await db.select().from(items);
    const totalItems = allItems.length;

    // Process removals
    let removedCount = 0;
    for (const itemId of removals) {
      const [row] = await db
        .select({ item: items, itemType: itemTypes, category: categories })
        .from(items)
        .leftJoin(itemTypes, eq(items.itemTypeId, itemTypes.id))
        .leftJoin(categories, eq(items.categoryId, categories.id))
        .where(eq(items.id, itemId));

      if (!row) continue;

      const itemName = row.item.customName || row.itemType?.name || 'Unknown';
      const snapshot = {
        categoryId: row.item.categoryId,
        subcategoryId: row.item.subcategoryId,
        itemTypeId: row.item.itemTypeId,
        customName: row.item.customName,
        quantity: row.item.quantity,
        sizeLabel: row.item.sizeLabel,
        frozenDate: row.item.frozenDate,
        notes: row.item.notes,
      };

      await db.insert(history).values({
        action: 'removed',
        itemId,
        itemName,
        categoryName: row.category?.name ?? null,
        quantity: row.item.quantity,
        details: JSON.stringify({ snapshot, source: 'inventory_check' }),
      });

      await db.delete(items).where(eq(items.id, itemId));
      removedCount++;
    }

    // Record the completed check
    const [check] = await db
      .insert(inventoryChecks)
      .values({
        totalItems,
        checkedCount: checkedItemIds.length,
        removedCount,
      })
      .returning();

    broadcastRealtime('items.changed');
    broadcastRealtime('history.changed');

    res.status(201).json(check);
  } catch (err) {
    res.status(500).json({ error: 'Failed to complete inventory check' });
  }
});

export default router;
