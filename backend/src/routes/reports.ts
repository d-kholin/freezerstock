import { Router } from 'express';
import { db } from '../db/migrate';
import { history } from '../db/schema';
import { and, eq, gte, sql } from 'drizzle-orm';

const router = Router();

// Usage summary over a trailing window: total quantity used per item name.
// Sourced from 'used' history entries only — undo deletes its entry and
// discards are logged as 'removed', so this is an accurate consumption ledger.
router.get('/usage', async (req, res) => {
  try {
    const days = Math.min(Math.max(Math.trunc(Number(req.query.days)) || 30, 1), 366);
    const cutoff = sql`datetime('now', ${`-${days} days`})`;

    const rows = await db
      .select({
        itemName: history.itemName,
        categoryName: history.categoryName,
        quantityUsed: sql<number>`SUM(${history.quantity})`,
        useCount: sql<number>`COUNT(*)`,
        lastUsedAt: sql<string>`MAX(${history.createdAt})`,
      })
      .from(history)
      .where(and(eq(history.action, 'used'), gte(history.createdAt, cutoff)))
      .groupBy(history.itemName, history.categoryName)
      .orderBy(sql`SUM(${history.quantity}) DESC`, history.itemName);

    res.json({
      days,
      totalUsed: rows.reduce((sum, r) => sum + Number(r.quantityUsed), 0),
      items: rows,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch usage report' });
  }
});

export default router;
