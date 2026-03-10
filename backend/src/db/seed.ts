import { db } from './migrate';
import { categories, subcategories, itemTypes, items } from './schema';
import { eq, and, isNull } from 'drizzle-orm';

// Top-level item types that stay at the category level (no subcategory)
const BEEF_TOP_LEVEL = ['Ground Beef', 'Ribs', 'Brisket', 'Short Ribs', 'Misc'];

const BEEF_SUBCATEGORIES = [
  {
    name: 'Steak',
    sortOrder: 1,
    items: ['Ribeye', 'Sirloin', 'T-Bone', 'New York Strip', 'Filet Mignon', 'Round', 'Flank', 'Skirt', 'Misc'],
  },
  {
    name: 'Roast',
    sortOrder: 2,
    items: ['Chuck Roast', 'Rump Roast', 'Arm Roast', 'Pot Roast', 'Misc'],
  },
];

const SEED_DATA = [
  {
    name: 'Beef',
    sortOrder: 1,
    items: BEEF_TOP_LEVEL,
    subcategories: BEEF_SUBCATEGORIES,
  },
  { name: 'Chicken', sortOrder: 2, items: ['Breasts', 'Thighs', 'Legs', 'Wings', 'Whole Chicken', 'Ground Chicken', 'Misc'], subcategories: [] },
  { name: 'Pork', sortOrder: 3, items: ['Chops', 'Roast', 'Loin', 'Ground Pork', 'Ribs', 'Tenderloin', 'Bacon', 'Misc'], subcategories: [] },
  { name: 'Fish & Seafood', sortOrder: 4, items: ['Fillets', 'Shrimp', 'Whole Fish', 'Salmon', 'Tilapia', 'Misc'], subcategories: [] },
  { name: 'Vegetables', sortOrder: 5, items: ['Mixed Vegetables', 'Corn', 'Peas', 'Green Beans', 'Broccoli', 'Spinach', 'Misc'], subcategories: [] },
  { name: 'Prepared Meals', sortOrder: 6, items: ['Casserole', 'Soup', 'Sauce', 'Leftovers', 'Misc'], subcategories: [] },
  { name: 'Other', sortOrder: 7, items: [], subcategories: [] },
];

export async function seedDatabase() {
  const existing = await db.select().from(categories);

  if (existing.length === 0) {
    // Fresh install — seed everything from scratch
    for (const cat of SEED_DATA) {
      const [inserted] = await db
        .insert(categories)
        .values({ name: cat.name, sortOrder: cat.sortOrder, isDefault: true })
        .returning();

      // Top-level item types (no subcategory)
      for (const itemName of cat.items) {
        await db.insert(itemTypes).values({
          categoryId: inserted.id,
          subcategoryId: null,
          name: itemName,
          isDefault: true,
        });
      }

      // Subcategories with their item types
      for (const subcat of cat.subcategories ?? []) {
        const [insertedSubcat] = await db
          .insert(subcategories)
          .values({
            categoryId: inserted.id,
            name: subcat.name,
            sortOrder: subcat.sortOrder,
            isDefault: true,
          })
          .returning();

        for (const itemName of subcat.items) {
          await db.insert(itemTypes).values({
            categoryId: inserted.id,
            subcategoryId: insertedSubcat.id,
            name: itemName,
            isDefault: true,
          });
        }
      }
    }

    console.log('Database seeded with default categories, subcategories, and item types');
    return;
  }

  // Existing install — run incremental migrations for v1.1 changes
  await migrateBeefSubcategories();
}

/**
 * Migrate existing "Steak" and "Roast" flat item types under Beef into
 * proper subcategories, and populate subcategory item types.
 * Idempotent — safe to run multiple times.
 */
async function migrateBeefSubcategories() {
  // Find the Beef category
  const [beefCat] = await db.select().from(categories).where(eq(categories.name, 'Beef'));
  if (!beefCat) return;

  for (const subcatDef of BEEF_SUBCATEGORIES) {
    // Check if subcategory already exists
    const existingSubcats = await db
      .select()
      .from(subcategories)
      .where(and(eq(subcategories.categoryId, beefCat.id), eq(subcategories.name, subcatDef.name)));

    let subcatId: number;

    if (existingSubcats.length === 0) {
      // Create the subcategory
      const [insertedSubcat] = await db
        .insert(subcategories)
        .values({
          categoryId: beefCat.id,
          name: subcatDef.name,
          sortOrder: subcatDef.sortOrder,
          isDefault: true,
        })
        .returning();
      subcatId = insertedSubcat.id;

      // Create "Misc" first so we have a valid item type to remap existing items onto
      const [miscType] = await db
        .insert(itemTypes)
        .values({
          categoryId: beefCat.id,
          subcategoryId: subcatId,
          name: 'Misc',
          isDefault: true,
        })
        .returning();

      // Find the old flat item type (e.g. "Steak" or "Roast" at top-level, no subcategory)
      const [oldType] = await db
        .select()
        .from(itemTypes)
        .where(
          and(
            eq(itemTypes.categoryId, beefCat.id),
            eq(itemTypes.name, subcatDef.name),
            isNull(itemTypes.subcategoryId),
          )
        );

      if (oldType) {
        // Remap ALL existing inventory items to the subcategory's Misc type.
        // This preserves displayName ("Misc") and keeps the item fully valid.
        // The user can re-edit to a specific cut later.
        await db
          .update(items)
          .set({ subcategoryId: subcatId, itemTypeId: miscType.id })
          .where(eq(items.itemTypeId, oldType.id));

        // Delete the old flat item type — it is now represented as a subcategory
        await db.delete(itemTypes).where(eq(itemTypes.id, oldType.id));
      }
    } else {
      subcatId = existingSubcats[0].id;
    }

    // Insert remaining item types under this subcategory (skip "Misc" — already handled above)
    for (const itemName of subcatDef.items) {
      if (itemName === 'Misc') continue; // already created during the migration above

      const existingTypes = await db
        .select()
        .from(itemTypes)
        .where(
          and(
            eq(itemTypes.categoryId, beefCat.id),
            eq(itemTypes.subcategoryId, subcatId),
            eq(itemTypes.name, itemName),
          )
        );

      if (existingTypes.length === 0) {
        await db.insert(itemTypes).values({
          categoryId: beefCat.id,
          subcategoryId: subcatId,
          name: itemName,
          isDefault: true,
        });
      }
    }
  }

  // Ensure top-level beef item types exist (Ground Beef, Ribs, etc.)
  for (const itemName of BEEF_TOP_LEVEL) {
    const existingTypes = await db
      .select()
      .from(itemTypes)
      .where(
        and(
          eq(itemTypes.categoryId, beefCat.id),
          isNull(itemTypes.subcategoryId),
          eq(itemTypes.name, itemName),
        )
      );

    if (existingTypes.length === 0) {
      await db.insert(itemTypes).values({
        categoryId: beefCat.id,
        subcategoryId: null,
        name: itemName,
        isDefault: true,
      });
    }
  }

  console.log('Beef subcategory migration complete');
}
