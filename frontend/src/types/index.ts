export interface Subcategory {
  id: number;
  categoryId: number;
  name: string;
  sortOrder: number | null;
  isDefault: boolean | null;
  itemTypes: ItemType[];
}

export interface Category {
  id: number;
  name: string;
  sortOrder: number | null;
  isDefault: boolean | null;
  itemTypes: ItemType[];         // top-level item types (no subcategory)
  subcategories: Subcategory[];  // nested subcategories with their item types
}

export interface ItemType {
  id: number;
  categoryId: number;
  subcategoryId: number | null;
  name: string;
  isDefault: boolean | null;
}

export interface Item {
  id: number;
  categoryId: number;
  subcategoryId: number | null;
  itemTypeId: number | null;
  customName: string | null;
  quantity: number;
  sizeLabel: string | null;
  frozenDate: string; // YYYY-MM
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  categoryName?: string;
  subcategoryName?: string | null;
  itemTypeName?: string;
  displayName?: string;
}

export interface HistoryEntry {
  id: number;
  action: 'used' | 'removed' | 'processed' | 'added';
  itemId: number | null;
  itemName: string;
  categoryName: string | null;
  quantity: number;
  details: string | null;
  createdAt: string;
}

export interface ItemSnapshot {
  categoryId: number;
  subcategoryId: number | null;
  itemTypeId: number | null;
  customName: string | null;
  quantity: number;
  sizeLabel: string | null;
  frozenDate: string;
  notes: string | null;
}

export interface UseItemResult {
  // When item still has stock
  id?: number;
  quantity?: number;
  historyId: number;
  // When item was fully consumed
  removed?: boolean;
  itemName?: string;
  snapshot?: ItemSnapshot;
}

export interface InventoryCheck {
  id: number;
  completedAt: string;
  totalItems: number;
  checkedCount: number;
  removedCount: number;
}
