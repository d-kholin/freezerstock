import { Router } from 'express';
import { db } from '../db/migrate';
import { categories, itemTypes } from '../db/schema';
import { eq, asc } from 'drizzle-orm';
import { broadcastRealtime } from '../realtime';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const cats = await db.select().from(categories).orderBy(asc(categories.sortOrder));
    const result = await Promise.all(
      cats.map(async (cat) => {
        const types = await db
          .select()
          .from(itemTypes)
          .where(eq(itemTypes.categoryId, cat.id))
          .orderBy(asc(itemTypes.name));
        return { ...cat, itemTypes: types };
      })
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });

  try {
    const [cat] = await db
      .insert(categories)
      .values({ name: name.trim(), isDefault: false })
      .returning();
    broadcastRealtime('categories.changed');
    res.status(201).json(cat);
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Category already exists' });
    }
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// POST /api/item-types
router.post('/item-types', async (req, res) => {
  const { categoryId, name } = req.body;
  if (!categoryId || !name?.trim()) {
    return res.status(400).json({ error: 'categoryId and name are required' });
  }

  try {
    const [type] = await db
      .insert(itemTypes)
      .values({ categoryId: Number(categoryId), name: name.trim(), isDefault: false })
      .returning();
    broadcastRealtime('categories.changed');
    res.status(201).json(type);
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Item type already exists in this category' });
    }
    res.status(500).json({ error: 'Failed to create item type' });
  }
});

export default router;
