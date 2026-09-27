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
    const { checkedItemIds, removals, quantityAdjustments = [] } = req.body as {
      checkedItemIds: number[];
      removals: number[];
      quantityAdjustments?: { itemId: number; quantity: number; expectedQuantity: number }[];
    };

    if (!Array.isArray(checkedItemIds) || !Array.isArray(removals) || !Array.isArray(quantityAdjustments)) {
      return res.status(400).json({ error: 'Invalid inventory check data' });
    }
    const checked = new Set(checkedItemIds);
    const removed = new Set(removals);
    if (checked.size !== checkedItemIds.length || removed.size !== removals.length ||
        checkedItemIds.some((id) => !Number.isSafeInteger(id) || id <= 0) ||
        removals.some((id) => !Number.isSafeInteger(id) || id <= 0 || checked.has(id)) ||
        quantityAdjustments.some(({ itemId, quantity, expectedQuantity }) =>
          !Number.isSafeInteger(itemId) || !checked.has(itemId) ||
          !Number.isSafeInteger(quantity) || quantity < 1 ||
          !Number.isSafeInteger(expectedQuantity) || expectedQuantity < 1) ||
        new Set(quantityAdjustments.map(({ itemId }) => itemId)).size !== quantityAdjustments.length) {
      return res.status(400).json({ error: 'Invalid checked items or counted quantities' });
    }

    const allItems = await db.select().from(items);
    const totalItems = allItems.length;
    const currentItems = new Map(allItems.map((item) => [item.id, item]));
    if (checkedItemIds.some((id) => !currentItems.has(id)) || removals.some((id) => !currentItems.has(id)) ||
        quantityAdjustments.some(({ itemId, expectedQuantity }) => currentItems.get(itemId)?.quantity !== expectedQuantity)) {
      return res.status(409).json({ error: 'Inventory changed during this check. Please restart the check.' });
    }

    const [check] = await db.transaction(async (tx) => {
      const checkedAt = new Date().toISOString();
      for (const itemId of checkedItemIds) {
        await tx.update(items).set({ lastCheckedAt: checkedAt }).where(eq(items.id, itemId));
      }
      for (const { itemId, quantity, expectedQuantity } of quantityAdjustments) {
        if (quantity === expectedQuantity) continue;
        const item = currentItems.get(itemId)!;
        const [type] = item.itemTypeId
          ? await tx.select().from(itemTypes).where(eq(itemTypes.id, item.itemTypeId))
          : [undefined];
        const [category] = await tx.select().from(categories).where(eq(categories.id, item.categoryId));
        await tx.update(items).set({ quantity, updatedAt: new Date().toISOString() }).where(eq(items.id, itemId));
        await tx.insert(history).values({
          action: 'adjusted',
          itemId,
          itemName: item.customName || type?.name || 'Unknown',
          categoryName: category?.name ?? null,
          quantity: Math.abs(quantity - expectedQuantity),
          details: JSON.stringify({ source: 'inventory_check', previousQuantity: expectedQuantity, newQuantity: quantity }),
        });
      }

      for (const itemId of removals) {
        const [row] = await tx
          .select({ item: items, itemType: itemTypes, category: categories })
          .from(items)
          .leftJoin(itemTypes, eq(items.itemTypeId, itemTypes.id))
          .leftJoin(categories, eq(items.categoryId, categories.id))
          .where(eq(items.id, itemId));
        if (!row) continue;
        const itemName = row.item.customName || row.itemType?.name || 'Unknown';
        const { categoryId, subcategoryId, itemTypeId, customName, quantity, sizeLabel, frozenDate, notes } = row.item;
        await tx.insert(history).values({
          action: 'removed', itemId, itemName, categoryName: row.category?.name ?? null,
          quantity,
          details: JSON.stringify({ snapshot: { categoryId, subcategoryId, itemTypeId, customName, quantity, sizeLabel, frozenDate, notes }, source: 'inventory_check' }),
        });
        await tx.delete(items).where(eq(items.id, itemId));
      }

      return tx.insert(inventoryChecks).values({
        totalItems,
        checkedCount: checkedItemIds.length,
        removedCount: removals.length,
      }).returning();
    });

    broadcastRealtime('items.changed');
    broadcastRealtime('history.changed');

    res.status(201).json(check);
  } catch (err) {
    res.status(500).json({ error: 'Failed to complete inventory check' });
  }
});

export default router;
