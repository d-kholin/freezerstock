import { db } from './migrate';
import { categories, itemTypes } from './schema';

const SEED_DATA = [
  { name: 'Beef', sortOrder: 1, items: ['Steak', 'Roast', 'Ground Beef', 'Ribs', 'Brisket', 'Short Ribs', 'Misc'] },
  { name: 'Chicken', sortOrder: 2, items: ['Breasts', 'Thighs', 'Legs', 'Wings', 'Whole Chicken', 'Ground Chicken', 'Misc'] },
  { name: 'Pork', sortOrder: 3, items: ['Chops', 'Roast', 'Loin', 'Ground Pork', 'Ribs', 'Tenderloin', 'Bacon', 'Misc'] },
  { name: 'Fish & Seafood', sortOrder: 4, items: ['Fillets', 'Shrimp', 'Whole Fish', 'Salmon', 'Tilapia', 'Misc'] },
  { name: 'Vegetables', sortOrder: 5, items: ['Mixed Vegetables', 'Corn', 'Peas', 'Green Beans', 'Broccoli', 'Spinach', 'Misc'] },
  { name: 'Prepared Meals', sortOrder: 6, items: ['Casserole', 'Soup', 'Sauce', 'Leftovers', 'Misc'] },
  { name: 'Other', sortOrder: 7, items: [] },
];

export async function seedDatabase() {
  const existing = await db.select().from(categories);
  if (existing.length > 0) return;

  for (const cat of SEED_DATA) {
    const [inserted] = await db
      .insert(categories)
      .values({ name: cat.name, sortOrder: cat.sortOrder, isDefault: true })
      .returning();

    for (const itemName of cat.items) {
      await db.insert(itemTypes).values({ categoryId: inserted.id, name: itemName, isDefault: true });
    }
  }

  console.log('Database seeded with default categories and item types');
}
