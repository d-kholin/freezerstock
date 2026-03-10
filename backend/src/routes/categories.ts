import { Router } from 'express';
import { db } from '../db/migrate';
import { categories, subcategories, itemTypes } from '../db/schema';
import { eq, asc, isNull, and } from 'drizzle-orm';
import { broadcastRealtime } from '../realtime';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const cats = await db.select().from(categories).orderBy(asc(categories.sortOrder));

    const result = await Promise.all(
      cats.map(async (cat) => {
        // Top-level item types (no subcategory)
        const topTypes = await db
          .select()
          .from(itemTypes)
          .where(and(eq(itemTypes.categoryId, cat.id), isNull(itemTypes.subcategoryId)))
          .orderBy(asc(itemTypes.name));

        // Subcategories for this category
        const subcats = await db
          .select()
          .from(subcategories)
          .where(eq(subcategories.categoryId, cat.id))
          .orderBy(asc(subcategories.sortOrder));

        const subcatsWithTypes = await Promise.all(
          subcats.map(async (subcat) => {
            const types = await db
              .select()
              .from(itemTypes)
              .where(eq(itemTypes.subcategoryId, subcat.id))
              .orderBy(asc(itemTypes.name));
            return { ...subcat, itemTypes: types };
          })
        );

        return { ...cat, itemTypes: topTypes, subcategories: subcatsWithTypes };
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

// POST /api/subcategories
router.post('/subcategories', async (req, res) => {
  const { categoryId, name } = req.body;
  if (!categoryId || !name?.trim()) {
    return res.status(400).json({ error: 'categoryId and name are required' });
  }

  try {
    const [subcat] = await db
      .insert(subcategories)
      .values({ categoryId: Number(categoryId), name: name.trim(), isDefault: false })
      .returning();
    broadcastRealtime('categories.changed');
    res.status(201).json(subcat);
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Subcategory already exists in this category' });
    }
    res.status(500).json({ error: 'Failed to create subcategory' });
  }
});

// POST /api/item-types
router.post('/item-types', async (req, res) => {
  const { categoryId, subcategoryId, name } = req.body;
  if (!categoryId || !name?.trim()) {
    return res.status(400).json({ error: 'categoryId and name are required' });
  }

  try {
    const [type] = await db
      .insert(itemTypes)
      .values({
        categoryId: Number(categoryId),
        subcategoryId: subcategoryId ? Number(subcategoryId) : null,
        name: name.trim(),
        isDefault: false,
      })
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
