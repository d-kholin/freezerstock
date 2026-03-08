import { Router } from 'express';
import { db } from '../db/migrate';
import { history, items } from '../db/schema';
import { desc, eq } from 'drizzle-orm';

const router = Router();

interface ItemSnapshot {
  categoryId: number;
  itemTypeId: number | null;
  customName: string | null;
  quantity: number;
  sizeLabel: string | null;
  frozenDate: string;
  notes: string | null;
}

router.get('/', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 100;
    const rows = await db.select().from(history).orderBy(desc(history.createdAt)).limit(limit);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

router.post('/:id/restore', async (req, res) => {
  try {
    const historyId = Number(req.params.id);
    if (!historyId) return res.status(400).json({ error: 'Invalid history id' });

    const [entry] = await db.select().from(history).where(eq(history.id, historyId));
    if (!entry) return res.status(404).json({ error: 'History entry not found' });

    if (entry.action === 'processed') {
      return res.status(400).json({ error: 'Processed entries cannot be restored' });
    }

    if (entry.action === 'added') {
      if (!entry.itemId) {
        return res.status(400).json({ error: 'Added entry is missing item id' });
      }

      const [existing] = await db.select().from(items).where(eq(items.id, entry.itemId));
      if (!existing) {
        return res.status(409).json({ error: 'Item no longer exists and cannot be restored' });
      }

      await db.delete(items).where(eq(items.id, entry.itemId));
      await db.delete(history).where(eq(history.id, historyId));
      return res.json({ restored: 'added', historyId });
    }

    if (entry.action === 'used') {
      const amount = Number(entry.quantity) || 0;
      if (amount <= 0) {
        return res.status(400).json({ error: 'Invalid history quantity' });
      }

      if (entry.itemId) {
        const [existing] = await db.select().from(items).where(eq(items.id, entry.itemId));
        if (existing) {
          const [updated] = await db
            .update(items)
            .set({ quantity: existing.quantity + amount, updatedAt: new Date().toISOString() })
            .where(eq(items.id, entry.itemId))
            .returning();

          await db.delete(history).where(eq(history.id, historyId));
          return res.json({ restored: 'used', historyId, item: updated });
        }
      }

      let snapshot: ItemSnapshot | null = null;

      if (entry.details) {
        try {
          const parsed = JSON.parse(entry.details) as { snapshot?: ItemSnapshot };
          snapshot = parsed.snapshot ?? null;
        } catch {
          snapshot = null;
        }
      }

      if (!snapshot) {
        return res.status(409).json({ error: 'Missing snapshot; cannot restore this use entry' });
      }

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

      await db.delete(history).where(eq(history.id, historyId));
      return res.json({ restored: 'used', historyId, item: restored });
    }

    return res.status(400).json({ error: 'Unsupported history action' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to restore history entry' });
  }
});

export default router;
