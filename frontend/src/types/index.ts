export interface Category {
  id: number;
  name: string;
  sortOrder: number | null;
  isDefault: boolean | null;
  itemTypes: ItemType[];
}

export interface ItemType {
  id: number;
  categoryId: number;
  name: string;
  isDefault: boolean | null;
}

export interface Item {
  id: number;
  categoryId: number;
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
  itemTypeName?: string;
  displayName?: string;
}

export interface HistoryEntry {
  id: number;
  action: 'used' | 'processed' | 'added';
  itemId: number | null;
  itemName: string;
  categoryName: string | null;
  quantity: number;
  details: string | null;
  createdAt: string;
}

export interface ItemSnapshot {
  categoryId: number;
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

export interface ProcessOutput {
  categoryId: number;
  itemTypeId?: number;
  customName?: string;
  quantity: number;
  sizeLabel?: string;
  notes?: string;
}
