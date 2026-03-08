import { Router } from 'express';
import { db } from '../db/migrate';
import { items, categories, itemTypes, history } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const search = (req.query.search as string)?.toLowerCase().trim();

    const rows = await db
      .select({
        item: items,
        category: categories,
        itemType: itemTypes,
      })
      .from(items)
      .leftJoin(categories, eq(items.categoryId, categories.id))
      .leftJoin(itemTypes, eq(items.itemTypeId, itemTypes.id))
      .where(
        search
          ? sql`(
              LOWER(COALESCE(${items.customName}, '')) LIKE ${'%' + search + '%'}
              OR LOWER(COALESCE(${itemTypes.name}, '')) LIKE ${'%' + search + '%'}
              OR LOWER(COALESCE(${categories.name}, '')) LIKE ${'%' + search + '%'}
            )`
          : undefined
      )
      .orderBy(categories.sortOrder, itemTypes.name, items.customName);

    const result = rows.map(({ item, category, itemType }) => ({
      ...item,
      categoryName: category?.name,
      itemTypeName: itemType?.name,
      displayName: item.customName || itemType?.name,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { categoryId, itemTypeId, customName, quantity, sizeLabel, frozenDate, notes } = req.body;

    if (!categoryId) return res.status(400).json({ error: 'categoryId is required' });
    if (!frozenDate) return res.status(400).json({ error: 'frozenDate is required' });
    if (!itemTypeId && !customName?.trim()) {
      return res.status(400).json({ error: 'itemTypeId or customName is required' });
    }

    let itemName = customName?.trim();
    if (!itemName && itemTypeId) {
      const [type] = await db.select().from(itemTypes).where(eq(itemTypes.id, Number(itemTypeId)));
      itemName = type?.name ?? 'Unknown';
    }

    const [cat] = await db.select().from(categories).where(eq(categories.id, Number(categoryId)));

    const [item] = await db
      .insert(items)
      .values({
        categoryId: Number(categoryId),
        itemTypeId: itemTypeId ? Number(itemTypeId) : null,
        customName: customName?.trim() || null,
        quantity: Number(quantity) || 1,
        sizeLabel: sizeLabel?.trim() || null,
        frozenDate,
        notes: notes?.trim() || null,
      })
      .returning();

    await db.insert(history).values({
      action: 'added',
      itemId: item.id,
      itemName: itemName ?? 'Unknown',
      categoryName: cat?.name ?? null,
      quantity: item.quantity,
    });

    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create item' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [existing] = await db.select().from(items).where(eq(items.id, id));
    if (!existing) return res.status(404).json({ error: 'Item not found' });

    const { quantity, sizeLabel, notes, frozenDate } = req.body;
    const updates: Partial<typeof items.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    };
    if (quantity !== undefined) updates.quantity = Number(quantity);
    if (sizeLabel !== undefined) updates.sizeLabel = sizeLabel?.trim() || null;
    if (notes !== undefined) updates.notes = notes?.trim() || null;
    if (frozenDate !== undefined) updates.frozenDate = frozenDate;

    const [updated] = await db.update(items).set(updates).where(eq(items.id, id)).returning();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update item' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [row] = await db
      .select({ item: items, itemType: itemTypes, category: categories })
      .from(items)
      .leftJoin(itemTypes, eq(items.itemTypeId, itemTypes.id))
      .leftJoin(categories, eq(items.categoryId, categories.id))
      .where(eq(items.id, id));

    if (!row) return res.status(404).json({ error: 'Item not found' });

    const itemName = row.item.customName || row.itemType?.name || 'Unknown';
    await db.insert(history).values({ action: 'used', itemId: id, itemName, categoryName: row.category?.name ?? null, quantity: row.item.quantity });
    await db.delete(items).where(eq(items.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

router.post('/:id/use', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const amount = Number(req.body.amount) || 1;

    const [row] = await db
      .select({ item: items, itemType: itemTypes, category: categories })
      .from(items)
      .leftJoin(itemTypes, eq(items.itemTypeId, itemTypes.id))
      .leftJoin(categories, eq(items.categoryId, categories.id))
      .where(eq(items.id, id));

    if (!row) return res.status(404).json({ error: 'Item not found' });

    const itemName = row.item.customName || row.itemType?.name || 'Unknown';
    const newQty = row.item.quantity - amount;

    const snapshot = {
      categoryId: row.item.categoryId,
      itemTypeId: row.item.itemTypeId,
      customName: row.item.customName,
      quantity: row.item.quantity,
      sizeLabel: row.item.sizeLabel,
      frozenDate: row.item.frozenDate,
      notes: row.item.notes,
    };

    const [historyEntry] = await db
      .insert(history)
      .values({
        action: 'used',
        itemId: id,
        itemName,
        categoryName: row.category?.name ?? null,
        quantity: amount,
        details: JSON.stringify({ snapshot }),
      })
      .returning();

    if (newQty <= 0) {
      await db.delete(items).where(eq(items.id, id));
      return res.json({
        removed: true,
        itemName,
        historyId: historyEntry.id,
        snapshot,
      });
    }

    const [updated] = await db
      .update(items)
      .set({ quantity: newQty, updatedAt: new Date().toISOString() })
      .where(eq(items.id, id))
      .returning();

    res.json({ ...updated, historyId: historyEntry.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to use item' });
  }
});

// Undo a use action — deletes history entry and restores quantity
router.post('/undo-use', async (req, res) => {
  try {
    const { historyId, itemId, amount, wasRemoved, snapshot } = req.body;

    if (!historyId) return res.status(400).json({ error: 'historyId is required' });

    // Delete the history entry so it never appears in the log
    await db.delete(history).where(eq(history.id, Number(historyId)));

    if (wasRemoved && snapshot) {
      // Re-create the item that was fully consumed
      const [restored] = await db
        .insert(items)
        .values({
          categoryId: Number(snapshot.categoryId),
          itemTypeId: snapshot.itemTypeId ? Number(snapshot.itemTypeId) : null,
          customName: snapshot.customName || null,
          quantity: Number(snapshot.quantity),
          sizeLabel: snapshot.sizeLabel || null,
          frozenDate: snapshot.frozenDate,
          notes: snapshot.notes || null,
        })
        .returning();
      return res.json({ restored });
    }

    if (itemId) {
      // Increment quantity back
      const [existing] = await db.select().from(items).where(eq(items.id, Number(itemId)));
      if (existing) {
        const [updated] = await db
          .update(items)
          .set({ quantity: existing.quantity + Number(amount), updatedAt: new Date().toISOString() })
          .where(eq(items.id, Number(itemId)))
          .returning();
        return res.json({ restored: updated });
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to undo' });
  }
});

export default router;
