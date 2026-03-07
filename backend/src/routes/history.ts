import { Router } from 'express';
import { db } from '../db/migrate';
import { history } from '../db/schema';
import { desc } from 'drizzle-orm';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 100;
    const rows = await db.select().from(history).orderBy(desc(history.createdAt)).limit(limit);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

export default router;
