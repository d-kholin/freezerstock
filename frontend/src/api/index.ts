import type { Category, Item, HistoryEntry, UseItemResult, InventoryCheck, Subcategory } from '../types';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  // Categories
  getCategories: () => request<Category[]>('/categories'),
  createCategory: (name: string) =>
    request<Category>('/categories', { method: 'POST', body: JSON.stringify({ name }) }),
  createSubcategory: (categoryId: number, name: string) =>
    request<Subcategory>('/subcategories', { method: 'POST', body: JSON.stringify({ categoryId, name }) }),
  createItemType: (categoryId: number, name: string, subcategoryId?: number) =>
    request('/item-types', { method: 'POST', body: JSON.stringify({ categoryId, name, subcategoryId }) }),

  // Items
  getItems: (search?: string) =>
    request<Item[]>(`/items${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  createItem: (data: {
    categoryId: number;
    subcategoryId?: number;
    itemTypeId?: number;
    customName?: string;
    quantity: number;
    sizeLabel?: string;
    frozenDate: string;
    notes?: string;
  }) => request<Item>('/items', { method: 'POST', body: JSON.stringify(data) }),
  updateItem: (id: number, data: Partial<{
    quantity: number;
    sizeLabel: string;
    notes: string;
    frozenDate: string;
    categoryId: number;
    subcategoryId: number | null;
    itemTypeId: number | null;
    customName: string | null;
  }>) =>
    request<Item>(`/items/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteItem: (id: number) =>
    request<{ success: boolean }>(`/items/${id}`, { method: 'DELETE' }),
  useItem: (id: number, amount = 1) =>
    request<UseItemResult>(`/items/${id}/use`, { method: 'POST', body: JSON.stringify({ amount }) }),

  // History
  getHistory: (limit?: number) =>
    request<HistoryEntry[]>(`/history${limit ? `?limit=${limit}` : ''}`),
  restoreHistory: (id: number) =>
    request<{ restored: string; historyId: number }>(`/history/${id}/restore`, { method: 'POST' }),

  // Inventory checks
  getLatestInventoryCheck: () =>
    request<InventoryCheck | null>('/inventory-checks/latest'),
  startInventoryCheck: () =>
    request<{ items: Item[] }>('/inventory-checks/start', { method: 'POST' }),
  completeInventoryCheck: (checkedItemIds: number[], removals: number[]) =>
    request<InventoryCheck>('/inventory-checks/complete', {
      method: 'POST',
      body: JSON.stringify({ checkedItemIds, removals }),
    }),
};
